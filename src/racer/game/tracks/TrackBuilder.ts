import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { Engine } from "../../engine/Engine";
import { GROUP_BARRIER, GROUP_GROUND, GROUP_VEHICLE } from "../../engine/physics/PhysicsWorld";
import type { TerrainBuild } from "../../procedural/terrain/heightfield";
import type { PropKind, TrackData } from "../../procedural/types";
import { mod } from "../../shared/math";
import { buildPropGeometry, neutralPropColor, propUsesPalette } from "./propGeometries";

/**
 * The road ribbon has to win the depth test against the terrain grid, whose
 * vertices never line up with the spline. Doing that with height alone means
 * a visible slab floating on the grass, so keep the lift to a hair and let
 * polygon offset settle the z-fighting.
 */
const ROAD_LIFT = 0.04;
const ROAD_POLYGON_OFFSET = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 };
const RUNOFF_WIDTH = 3.5;
const BARRIER_OFFSET = RUNOFF_WIDTH + 1.1;
const BARRIER_HEIGHT = 1.0;
/** Corners tighter than this radius get curbs. */
const CURB_RADIUS = 55;
const CURB_WIDTH = 1.2;
const CURB_HEIGHT = 0.11;
/** How far the outer face drops, to bury the seam against the terrain. */
const CURB_SKIRT = 0.4;
/** World length of one red/white band. */
const CURB_BAND = 2.4;

const groundGroups = ((GROUP_GROUND << 16) | GROUP_VEHICLE) >>> 0;
const barrierGroups = ((GROUP_BARRIER << 16) | GROUP_VEHICLE) >>> 0;

export interface BuiltTrack {
	group: THREE.Group;
	heightAt(x: number, z: number): number;
	dispose(): void;
}

/**
 * Materializes a generated TrackData into the three.js scene and the physics
 * world: terrain, road ribbon, runoff, curbs, barriers, start gantry,
 * checkpoint pylons and instanced scenery. Everything created here is torn
 * down by dispose() so tracks can be regenerated at runtime.
 */
export function buildTrack(engine: Engine, track: TrackData, terrain: TerrainBuild): BuiltTrack {
	const group = new THREE.Group();
	group.name = `track:${track.params.seed}`;
	const bodies: RAPIER.RigidBody[] = [];
	const disposables: { dispose(): void }[] = [];

	buildTerrainMesh(engine, track, terrain, group, bodies, disposables);
	buildRoad(engine, track, group, bodies, disposables);
	buildRunoffAndBarriers(engine, track, group, bodies, disposables);
	buildCurbs(track, group, disposables);
	buildMarkerPosts(track, group, disposables);
	buildStartAndCheckpoints(track, group, disposables);
	buildScenery(track, group, disposables);

	engine.renderer.scene.add(group);
	engine.renderer.applyEnvironment(track.biome.environment);

	return {
		group,
		heightAt: terrain.heightAt,
		dispose() {
			engine.renderer.scene.remove(group);
			for (const body of bodies) engine.physics.removeBody(body);
			for (const d of disposables) d.dispose();
		},
	};
}

// ---------------------------------------------------------------------------
// terrain

function buildTerrainMesh(
	engine: Engine,
	track: TrackData,
	terrain: TerrainBuild,
	group: THREE.Group,
	bodies: RAPIER.RigidBody[],
	disposables: { dispose(): void }[],
): void {
	const { resolution, heights } = terrain.data;
	const cell = terrain.cellSize;
	const vertCount = resolution * resolution;
	const positions = new Float32Array(vertCount * 3);
	const colors = new Float32Array(vertCount * 3);

	const low = new THREE.Color(track.biome.terrain.lowColor);
	const base = new THREE.Color(track.biome.terrain.baseColor);
	const high = new THREE.Color(track.biome.terrain.highColor);
	let minH = Number.POSITIVE_INFINITY;
	let maxH = Number.NEGATIVE_INFINITY;
	for (let i = 0; i < heights.length; i++) {
		if (heights[i] < minH) minH = heights[i];
		if (heights[i] > maxH) maxH = heights[i];
	}
	const span = Math.max(1e-3, maxH - minH);

	const tmpColor = new THREE.Color();
	for (let row = 0; row < resolution; row++) {
		for (let col = 0; col < resolution; col++) {
			const i = row * resolution + col;
			positions[i * 3] = terrain.originX + col * cell;
			positions[i * 3 + 1] = heights[i];
			positions[i * 3 + 2] = terrain.originZ + row * cell;

			const t = (heights[i] - minH) / span;
			if (t < 0.5) tmpColor.lerpColors(low, base, t * 2);
			else tmpColor.lerpColors(base, high, (t - 0.5) * 2);
			// deterministic per-vertex jitter for the low-poly patchwork look
			const jitter = 0.94 + (((i * 2654435761) >>> 16) % 100) / 100 * 0.12;
			colors[i * 3] = tmpColor.r * jitter;
			colors[i * 3 + 1] = tmpColor.g * jitter;
			colors[i * 3 + 2] = tmpColor.b * jitter;
		}
	}

	const indices = new Uint32Array((resolution - 1) * (resolution - 1) * 6);
	let idx = 0;
	for (let row = 0; row < resolution - 1; row++) {
		for (let col = 0; col < resolution - 1; col++) {
			const a = row * resolution + col;
			const b = a + 1;
			const c = a + resolution;
			const d = c + 1;
			indices[idx++] = a;
			indices[idx++] = c;
			indices[idx++] = b;
			indices[idx++] = b;
			indices[idx++] = c;
			indices[idx++] = d;
		}
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
	geo.setIndex(new THREE.BufferAttribute(indices, 1));
	geo.computeVertexNormals();
	const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
	const mesh = new THREE.Mesh(geo, mat);
	mesh.receiveShadow = true;
	group.add(mesh);
	disposables.push(geo, mat);

	const { body } = engine.physics.createStaticTrimesh(positions, indices, {
		friction: 0.9,
		groups: groundGroups,
		surface: "offroad",
	});
	bodies.push(body);
}

// ---------------------------------------------------------------------------
// road

/** Left normal in XZ for sample i. */
function normalOf(track: TrackData, i: number): { nx: number; nz: number } {
	const s = track.samples[i];
	return { nx: s.tz, nz: -s.tx };
}

/** World-space road edge points with banking applied. */
function edgePoints(track: TrackData, i: number, lift = ROAD_LIFT) {
	const s = track.samples[i];
	const { nx, nz } = normalOf(track, i);
	const halfW = s.width / 2;
	const bankDrop = Math.sin(s.bank) * halfW;
	return {
		lx: s.x + nx * halfW,
		ly: s.y + lift - bankDrop,
		lz: s.z + nz * halfW,
		rx: s.x - nx * halfW,
		ry: s.y + lift + bankDrop,
		rz: s.z - nz * halfW,
	};
}

function makeRoadTexture(track: TrackData): THREE.CanvasTexture {
	const size = 256;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.fillStyle = track.biome.road.color;
		ctx.fillRect(0, 0, size, size);
		// asphalt speckle (deterministic LCG so the texture matches per seed)
		let state = 12345;
		const rand = () => {
			state = (state * 1103515245 + 12345) & 0x7fffffff;
			return state / 0x7fffffff;
		};
		for (let i = 0; i < 900; i++) {
			const v = 60 + Math.floor(rand() * 30);
			ctx.fillStyle = `rgba(${v},${v},${v + 6},0.16)`;
			ctx.fillRect(rand() * size, rand() * size, 2, 2);
		}
		// edge lines
		ctx.fillStyle = track.biome.road.edgeColor;
		ctx.fillRect(4, 0, 7, size);
		ctx.fillRect(size - 11, 0, 7, size);
		// dashed center line
		for (let y = 0; y < size; y += 64) {
			ctx.fillRect(size / 2 - 3, y, 6, 34);
		}
	}
	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.anisotropy = 4;
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

function buildRoad(
	engine: Engine,
	track: TrackData,
	group: THREE.Group,
	bodies: RAPIER.RigidBody[],
	disposables: { dispose(): void }[],
): void {
	const n = track.samples.length;
	const positions = new Float32Array((n + 1) * 2 * 3);
	const uvs = new Float32Array((n + 1) * 2 * 2);

	for (let i = 0; i <= n; i++) {
		const e = edgePoints(track, mod(i, n));
		const v = (i * track.ds) / 9; // texture repeats every 9 m
		positions.set([e.lx, e.ly, e.lz, e.rx, e.ry, e.rz], i * 6);
		uvs.set([0, v, 1, v], i * 4);
	}

	const indices = new Uint32Array(n * 6);
	let idx = 0;
	for (let i = 0; i < n; i++) {
		const a = i * 2;
		const b = a + 1;
		const c = a + 2;
		const d = a + 3;
		indices[idx++] = a;
		indices[idx++] = c;
		indices[idx++] = b;
		indices[idx++] = b;
		indices[idx++] = c;
		indices[idx++] = d;
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
	geo.setIndex(new THREE.BufferAttribute(indices, 1));
	geo.computeVertexNormals();

	const texture = makeRoadTexture(track);
	const mat = new THREE.MeshStandardMaterial({
		map: texture,
		roughness: 0.88,
		side: THREE.DoubleSide,
		...ROAD_POLYGON_OFFSET,
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.receiveShadow = true;
	group.add(mesh);
	disposables.push(geo, mat, texture);

	const { body } = engine.physics.createStaticTrimesh(positions, indices, {
		friction: 1,
		groups: groundGroups,
		surface: "road",
	});
	bodies.push(body);
}

// ---------------------------------------------------------------------------
// runoff strips + barriers

function buildRunoffAndBarriers(
	engine: Engine,
	track: TrackData,
	group: THREE.Group,
	bodies: RAPIER.RigidBody[],
	disposables: { dispose(): void }[],
): void {
	const n = track.samples.length;

	for (const side of [1, -1] as const) {
		// runoff ribbon: road edge → barrier base
		const positions = new Float32Array((n + 1) * 2 * 3);
		for (let i = 0; i <= n; i++) {
			const j = mod(i, n);
			const s = track.samples[j];
			const { nx, nz } = normalOf(track, j);
			const halfW = s.width / 2;
			const bankDrop = Math.sin(s.bank) * halfW * side;
			const innerY = s.y + ROAD_LIFT - 0.01 - bankDrop;
			const ix = s.x + nx * halfW * side;
			const iz = s.z + nz * halfW * side;
			const ox = s.x + nx * (halfW + RUNOFF_WIDTH) * side;
			const oz = s.z + nz * (halfW + RUNOFF_WIDTH) * side;
			// the outer lip dips under the terrain so the ribbon buries its own
			// edge instead of ending in a visible step
			positions.set([ix, innerY, iz, ox, innerY - 0.22, oz], i * 6);
		}
		const indices = new Uint32Array(n * 6);
		let idx = 0;
		for (let i = 0; i < n; i++) {
			const a = i * 2;
			indices[idx++] = a;
			indices[idx++] = a + 2;
			indices[idx++] = a + 1;
			indices[idx++] = a + 1;
			indices[idx++] = a + 2;
			indices[idx++] = a + 3;
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geo.setIndex(new THREE.BufferAttribute(indices, 1));
		geo.computeVertexNormals();
		const mat = new THREE.MeshStandardMaterial({
			color: track.biome.road.runoffColor,
			roughness: 0.95,
			side: THREE.DoubleSide,
			...ROAD_POLYGON_OFFSET,
		});
		const mesh = new THREE.Mesh(geo, mat);
		mesh.receiveShadow = true;
		group.add(mesh);
		disposables.push(geo, mat);
		const runoff = engine.physics.createStaticTrimesh(positions, indices, {
			friction: 0.9,
			groups: groundGroups,
			surface: "runoff",
		});
		bodies.push(runoff.body);

		// barrier wall
		const wallPositions = new Float32Array((n + 1) * 2 * 3);
		for (let i = 0; i <= n; i++) {
			const j = mod(i, n);
			const s = track.samples[j];
			const { nx, nz } = normalOf(track, j);
			const off = s.width / 2 + BARRIER_OFFSET;
			const bx = s.x + nx * off * side;
			const bz = s.z + nz * off * side;
			const baseY = s.y + ROAD_LIFT - 0.2;
			wallPositions.set([bx, baseY, bz, bx, baseY + BARRIER_HEIGHT, bz], i * 6);
		}
		const wallGeo = new THREE.BufferGeometry();
		wallGeo.setAttribute("position", new THREE.BufferAttribute(wallPositions, 3));
		wallGeo.setIndex(new THREE.BufferAttribute(indices.slice(), 1));
		wallGeo.computeVertexNormals();
		const wallMat = new THREE.MeshStandardMaterial({
			color: track.biome.road.barrierColor,
			roughness: 0.7,
			side: THREE.DoubleSide,
		});
		const wall = new THREE.Mesh(wallGeo, wallMat);
		wall.castShadow = true;
		group.add(wall);
		disposables.push(wallGeo, wallMat);
		const barrier = engine.physics.createStaticTrimesh(wallPositions, indices, {
			friction: 0.1,
			restitution: 0.35,
			groups: barrierGroups,
		});
		bodies.push(barrier.body);
	}
}

// ---------------------------------------------------------------------------
// curbs

/**
 * Curbs are built as continuous ribbons welded to the road edge, not as a
 * string of boxes: independently-rotated boxes fan open on the outside of a
 * corner (exactly where curbs live), which is what makes box curbs read as
 * broken. A ribbon shares its vertices with the neighbouring segment, so it
 * follows curvature and banking seamlessly.
 *
 * Colour alternates via per-quad vertex colours rather than two meshes, so
 * the red/white banding stays crisp with no duplicated geometry.
 */
function buildCurbs(track: TrackData, group: THREE.Group, disposables: { dispose(): void }[]): void {
	const n = track.samples.length;

	// which side (if any) gets a curb at each sample — inside edge of the corner
	const sides = new Int8Array(n);
	for (let i = 0; i < n; i++) {
		const k = track.samples[i].curvature;
		if (Math.abs(k) > 1 / CURB_RADIUS) sides[i] = k > 0 ? 1 : -1;
	}
	// grow each run slightly so curbs lead into and out of the corner
	const grown = Int8Array.from(sides);
	const LEAD = Math.max(1, Math.round(6 / track.ds));
	for (let i = 0; i < n; i++) {
		if (!sides[i]) continue;
		for (let o = -LEAD; o <= LEAD; o++) {
			const j = mod(i + o, n);
			if (!grown[j]) grown[j] = sides[i];
		}
	}

	const runs = collectRuns(grown, n, Math.max(3, Math.round(8 / track.ds)));
	if (runs.length === 0) return;

	const positions: number[] = [];
	const colors: number[] = [];
	const colorA = new THREE.Color(track.biome.road.curbColorA);
	const colorB = new THREE.Color(track.biome.road.curbColorB);

	for (const run of runs) {
		const side = run.side;
		// one cross-section per sample: inner (road edge) → outer → skirt foot
		const section = (index: number) => {
			const i = mod(index, n);
			const s = track.samples[i];
			const { nx, nz } = normalOf(track, i);
			const halfW = s.width / 2;
			const at = (distance: number, lift: number) => ({
				x: s.x + nx * distance * side,
				y: s.y + ROAD_LIFT - Math.sin(s.bank) * distance * side + lift,
				z: s.z + nz * distance * side,
			});
			return {
				inner: at(halfW, 0.015),
				outerTop: at(halfW + CURB_WIDTH, CURB_HEIGHT),
				outerFoot: at(halfW + CURB_WIDTH, -CURB_SKIRT),
				s: s.s,
			};
		};

		let prev = section(run.start);
		for (let step = 1; step <= run.length; step++) {
			const curr = section(run.start + step);
			// bands of a fixed world length, so they never stretch on long runs
			const color = Math.floor(prev.s / CURB_BAND) % 2 === 0 ? colorA : colorB;
			quad(positions, colors, prev.inner, curr.inner, curr.outerTop, prev.outerTop, color);
			// outer skirt hides the seam against the terrain on banked corners
			quad(positions, colors, prev.outerTop, curr.outerTop, curr.outerFoot, prev.outerFoot, color);
			prev = curr;
		}
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
	geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	geo.computeVertexNormals();
	const mat = new THREE.MeshStandardMaterial({
		vertexColors: true,
		roughness: 0.6,
		side: THREE.DoubleSide,
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.receiveShadow = true;
	group.add(mesh);
	disposables.push(geo, mat);
}

interface CurbRun {
	start: number;
	length: number;
	side: 1 | -1;
}

/** Contiguous same-side runs around the closed loop, shorter ones dropped. */
function collectRuns(sides: Int8Array, n: number, minLength: number): CurbRun[] {
	const runs: CurbRun[] = [];
	// start scanning at a gap so a run never gets split across the wrap point
	let origin = 0;
	while (origin < n && sides[origin] !== 0) origin++;
	if (origin === n) return [{ start: 0, length: n, side: sides[0] === 1 ? 1 : -1 }];

	let i = 0;
	while (i < n) {
		const at = mod(origin + i, n);
		const side = sides[at];
		if (side === 0) {
			i++;
			continue;
		}
		let length = 0;
		while (i + length < n && sides[mod(origin + i + length, n)] === side) length++;
		if (length >= minLength) runs.push({ start: at, length, side: side === 1 ? 1 : -1 });
		i += length;
	}
	return runs;
}

type P3 = { x: number; y: number; z: number };

/** Two triangles with a single flat colour — crisp bands, welded positions. */
function quad(positions: number[], colors: number[], a: P3, b: P3, c: P3, d: P3, color: THREE.Color): void {
	for (const p of [a, b, c, a, c, d]) {
		positions.push(p.x, p.y, p.z);
		colors.push(color.r, color.g, color.b);
	}
}

// ---------------------------------------------------------------------------
// roadside marker posts — dense small verticals whizzing past give the
// strongest motion parallax cue an isometric camera can offer

function buildMarkerPosts(track: TrackData, group: THREE.Group, disposables: { dispose(): void }[]): void {
	const n = track.samples.length;
	const stride = Math.max(4, Math.round(28 / track.ds)); // a post every ~28m
	const count = Math.ceil(n / stride) * 2;
	const geo = new THREE.BoxGeometry(0.16, 0.85, 0.16);
	const mat = new THREE.MeshStandardMaterial({ color: "#f4f4f0", roughness: 0.6, flatShading: true });
	const capGeo = new THREE.BoxGeometry(0.18, 0.22, 0.18);
	const capMat = new THREE.MeshStandardMaterial({ color: "#e0392e", roughness: 0.6, flatShading: true });
	const posts = new THREE.InstancedMesh(geo, mat, count);
	const caps = new THREE.InstancedMesh(capGeo, capMat, count);
	const matrix = new THREE.Matrix4();
	let placed = 0;
	for (let i = 0; i < n; i += stride) {
		const s = track.samples[i];
		const { nx, nz } = normalOf(track, i);
		const off = s.width / 2 + RUNOFF_WIDTH + 0.4;
		for (const side of [1, -1]) {
			const x = s.x + nx * off * side;
			const z = s.z + nz * off * side;
			matrix.makeTranslation(x, s.y + ROAD_LIFT + 0.3, z);
			posts.setMatrixAt(placed, matrix);
			matrix.makeTranslation(x, s.y + ROAD_LIFT + 0.78, z);
			caps.setMatrixAt(placed, matrix);
			placed++;
		}
	}
	posts.count = placed;
	caps.count = placed;
	group.add(posts, caps);
	disposables.push(geo, mat, capGeo, capMat, posts, caps);
}

// ---------------------------------------------------------------------------
// start gantry + checkpoint pylons

function buildStartAndCheckpoints(track: TrackData, group: THREE.Group, disposables: { dispose(): void }[]): void {
	const start = track.samples[0];
	const { nx, nz } = normalOf(track, 0);
	const halfW = start.width / 2;

	// checkered start line strip on the road
	const checkerCanvas = document.createElement("canvas");
	checkerCanvas.width = 64;
	checkerCanvas.height = 8;
	const cctx = checkerCanvas.getContext("2d");
	if (cctx) {
		for (let x = 0; x < 8; x++) {
			for (let y = 0; y < 8; y++) {
				cctx.fillStyle = (x + y) % 2 === 0 ? "#f5f5f5" : "#17181c";
				cctx.fillRect(x * 8, y, 8, 1);
			}
		}
	}
	const checkerTex = new THREE.CanvasTexture(checkerCanvas);
	checkerTex.colorSpace = THREE.SRGBColorSpace;
	const lineGeo = new THREE.PlaneGeometry(halfW * 2, 2.4);
	const lineMat = new THREE.MeshBasicMaterial({ map: checkerTex });
	const line = new THREE.Mesh(lineGeo, lineMat);
	const yaw = Math.atan2(start.tx, start.tz);
	line.position.set(start.x, start.y + ROAD_LIFT + 0.03, start.z);
	// lay the plane flat, then spin it to face along the road tangent
	line.rotation.set(0, yaw, 0);
	line.rotateX(-Math.PI / 2);
	group.add(line);
	disposables.push(lineGeo, lineMat, checkerTex);

	// gantry pylons + beam
	const pylonGeo = new THREE.BoxGeometry(0.5, 6, 0.5);
	const beamGeo = new THREE.BoxGeometry(halfW * 2 + 3, 0.6, 0.8);
	const gantryMat = new THREE.MeshStandardMaterial({ color: "#e8e8ea", roughness: 0.5, flatShading: true });
	const beamMat = new THREE.MeshStandardMaterial({ color: "#d8453a", roughness: 0.5, flatShading: true });
	for (const side of [1, -1]) {
		const pylon = new THREE.Mesh(pylonGeo, gantryMat);
		pylon.castShadow = true;
		pylon.position.set(start.x + nx * (halfW + 1.4) * side, start.y + 3, start.z + nz * (halfW + 1.4) * side);
		group.add(pylon);
	}
	const beam = new THREE.Mesh(beamGeo, beamMat);
	beam.castShadow = true;
	beam.position.set(start.x, start.y + 6, start.z);
	// X-aligned box rotated by the road yaw spans across the road
	beam.rotation.y = yaw;
	group.add(beam);
	disposables.push(pylonGeo, beamGeo, gantryMat, beamMat);

	// checkpoint pylons (skip 0 — that's the gantry)
	const cpGeo = new THREE.CylinderGeometry(0.28, 0.34, 1.3, 8);
	const cpMat = new THREE.MeshStandardMaterial({ color: "#3f9be0", roughness: 0.5, flatShading: true });
	const cpMesh = new THREE.InstancedMesh(cpGeo, cpMat, (track.checkpoints.length - 1) * 2);
	const matrix = new THREE.Matrix4();
	let count = 0;
	for (let c = 1; c < track.checkpoints.length; c++) {
		const cp = track.checkpoints[c];
		const cnx = cp.tz;
		const cnz = -cp.tx;
		for (const side of [1, -1]) {
			matrix.makeTranslation(
				cp.x + cnx * (cp.halfWidth - 2) * side,
				cp.y + ROAD_LIFT + 0.65,
				cp.z + cnz * (cp.halfWidth - 2) * side,
			);
			cpMesh.setMatrixAt(count++, matrix);
		}
	}
	cpMesh.count = count;
	group.add(cpMesh);
	disposables.push(cpGeo, cpMat, cpMesh);
}

// ---------------------------------------------------------------------------
// scenery

function buildScenery(track: TrackData, group: THREE.Group, disposables: { dispose(): void }[]): void {
	const byKind = new Map<PropKind, typeof track.scenery>();
	for (const inst of track.scenery) {
		let list = byKind.get(inst.kind);
		if (!list) {
			list = [];
			byKind.set(inst.kind, list);
		}
		list.push(inst);
	}

	const matrix = new THREE.Matrix4();
	const pos = new THREE.Vector3();
	const quat = new THREE.Quaternion();
	const scl = new THREE.Vector3();
	const up = new THREE.Vector3(0, 1, 0);
	const color = new THREE.Color();

	for (const [kind, instances] of byKind) {
		const propGeo = buildPropGeometry(kind);
		const primaryMat = new THREE.MeshStandardMaterial({ roughness: propGeo.primaryRoughness, flatShading: true });
		const primary = new THREE.InstancedMesh(propGeo.primary, primaryMat, instances.length);
		// only tall props cast shadows — ground clutter shadows cost far more
		// shadow-map fill than they add visually
		primary.castShadow = kind === "pine" || kind === "pineSnow" || kind === "cactus" || kind === "boulder";
		let secondary: THREE.InstancedMesh | null = null;
		let secondaryMat: THREE.MeshStandardMaterial | null = null;
		if (propGeo.secondary) {
			secondaryMat = new THREE.MeshStandardMaterial({
				color: propGeo.secondaryColor ?? "#7a5a43",
				roughness: 0.9,
				flatShading: true,
			});
			secondary = new THREE.InstancedMesh(propGeo.secondary, secondaryMat, instances.length);
			secondary.castShadow = true;
		}

		for (let i = 0; i < instances.length; i++) {
			const inst = instances[i];
			pos.set(inst.x, inst.y - 0.15, inst.z);
			quat.setFromAxisAngle(up, inst.rotY);
			scl.setScalar(inst.scale);
			matrix.compose(pos, quat, scl);
			primary.setMatrixAt(i, matrix);
			secondary?.setMatrixAt(i, matrix);
			if (propUsesPalette(kind)) color.set(track.biome.props.palette[inst.tint % track.biome.props.palette.length]);
			else color.copy(neutralPropColor(kind, inst.tint));
			primary.setColorAt(i, color);
		}
		if (primary.instanceColor) primary.instanceColor.needsUpdate = true;
		group.add(primary);
		disposables.push(propGeo.primary, primaryMat, primary);
		if (secondary && secondaryMat && propGeo.secondary) {
			group.add(secondary);
			disposables.push(propGeo.secondary, secondaryMat, secondary);
		}
	}
}
