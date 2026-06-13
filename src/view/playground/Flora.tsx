"use client";

import { useFrame } from "@react-three/fiber";
import { BallCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { useRef } from "react";
import type { Group, MeshStandardMaterial } from "three";
import { poseOnGlobe, STATIONS } from "./constants";
import { usePlayground } from "./context";
import GLB from "./GLB";
import { emitDust } from "./particles/Dust";
import Prop from "./Prop";
import { clearOf, ROADS, sampleHeight } from "./terrain/height";
import { DAY, FOLIAGE } from "./usePalette";
import { GroundWord } from "./World";

/* deterministic scatter so the world is stable between visits */
function hash(a: number, b: number, salt = 0): number {
	let h = Math.imul(a * 1297 + salt, 374761393) ^ Math.imul(b * 911, 668265263);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* full-map scatter, denser near home, thinning toward the wilds —
   these are the knockable physics trees; the ambient instanced forest
   in terrain/Forest.tsx carries the deep woods */
/** scatter spots must be on dry land */
function dry(x: number, z: number): boolean {
	return sampleHeight(x, z) > -0.2;
}

const TREES: [number, number, number][] = [];
for (let i = 0; i < 280; i++) {
	const ang = hash(i, 101) * Math.PI * 2;
	const dist = 4.5 + hash(i, 103) ** 0.8 * 60;
	const x = Math.cos(ang) * dist;
	const z = Math.sin(ang) * dist;
	if (clearOf(x, z) && dry(x, z)) TREES.push([x, z, 0.7 + hash(i, 107) * 0.85]);
}

const GRASS: [number, number, number][] = [];
for (let i = 0; i < 340; i++) {
	const ang = hash(i, 7) * Math.PI * 2;
	const dist = 2 + hash(i, 13) ** 0.85 * 72;
	const x = Math.cos(ang) * dist;
	const z = Math.sin(ang) * dist;
	if (clearOf(x, z, 1.2) && dry(x, z)) GRASS.push([x, z, 0.7 + hash(i, 29) * 0.9]);
}

const ROCKS: [number, number, number][] = [];
for (let i = 0; i < 60; i++) {
	const ang = hash(i, 211) * Math.PI * 2;
	const dist = 3 + hash(i, 223) ** 0.9 * 70;
	const x = Math.cos(ang) * dist;
	const z = Math.sin(ang) * dist;
	if (clearOf(x, z) && dry(x, z)) ROCKS.push([x, z, 0.12 + hash(i, 227) * 0.24]);
}
// boulders on the highland's terrace flanks
for (let i = 0; i < 26; i++) {
	const ang = hash(i, 401) * Math.PI * 2;
	const dist = 9 + hash(i, 409) * 17;
	const x = 55 + Math.cos(ang) * dist;
	const z = -48 + Math.sin(ang) * dist;
	if (clearOf(x, z) && dry(x, z)) ROCKS.push([x, z, 0.18 + hash(i, 419) * 0.34]);
}

const FLOWERS: { x: number; z: number; hue: "mag" | "red" | "cyan" | "amber" }[] =
	(["mag", "red", "cyan", "amber"] as const).flatMap((hue, h) =>
		[0, 1, 2, 3, 4, 5, 6].map((i) => {
			const ang = hash(i, 307 + h) * Math.PI * 2;
			const dist = 2.5 + hash(i, 311 + h) * 50;
			return { x: Math.cos(ang) * dist, z: Math.sin(ang) * dist, hue };
		}),
	).filter((f) => clearOf(f.x, f.z));

/** each station venue gets a big crashable title + a glowing beacon */
const VENUES: {
	id: keyof typeof STATIONS;
	word: string;
	accent: "green" | "amber" | "blue" | "red" | "cyan";
}[] = [
	{ id: "terminal", word: "TERMINAL", accent: "green" },
	{ id: "snake", word: "ARCADE", accent: "amber" },
	{ id: "resume", word: "RESUME", accent: "blue" },
	{ id: "guestbook", word: "GUESTBOOK", accent: "red" },
	{ id: "now", word: "NOW", accent: "cyan" },
];

/** set dressing: stations become places, plus journey POI clusters */
const SET_DRESSING: {
	src: string;
	map: [number, number];
	yaw: number;
	size: number;
	density?: number;
	fixed?: boolean;
}[] = [
	// arcade grove (snake), deep in the west woods
	{ src: "/models/big-building.glb", map: [-48, -28], yaw: 2.2, size: 6, fixed: true },
	{ src: "/models/dumpster.glb", map: [-46.6, -23.2], yaw: 1.4, size: 1.2 },
	{ src: "/models/box.glb", map: [-46.2, -26.8], yaw: 0.5, size: 0.55, density: 0.4 },
	{ src: "/models/box.glb", map: [-46.0, -26.3], yaw: 1.1, size: 0.55, density: 0.4 },
	{ src: "/models/trash-can.glb", map: [-43.2, -23.6], yaw: 0.2, size: 0.55 },
	{ src: "/models/power-box.glb", map: [-47.2, -25.4], yaw: 1.9, size: 0.9 },
	// east village (guestbook)
	{ src: "/models/building-green.glb", map: [28.5, 41.5], yaw: -2.2, size: 3.8, fixed: true },
	{ src: "/models/van.glb", map: [28, 34.5], yaw: 2.0, size: 1.5 },
	{ src: "/models/fence.glb", map: [24.2, 35.4], yaw: -0.5, size: 1.6, density: 0.6 },
	{ src: "/models/flower-pot.glb", map: [25.8, 36.2], yaw: 0, size: 0.45 },
	{ src: "/models/flower-pot-2.glb", map: [24.4, 37.8], yaw: 0.6, size: 0.45 },
	// viewpoint trailhead (now)
	{ src: "/models/bicycle.glb", map: [-34.2, 50.2], yaw: 1.8, size: 1.2, density: 0.5 },
	{ src: "/models/cone.glb", map: [-35.8, 49.6], yaw: 0, size: 0.4, density: 0.3 },
	{ src: "/models/cone.glb", map: [-36.4, 50.4], yaw: 0.4, size: 0.4, density: 0.3 },
	// the farm on the home road
	{ src: "/models/building-red.glb", map: [15, 22], yaw: -0.9, size: 4.2, fixed: true },
	{ src: "/models/greenhouse.glb", map: [19.5, 18], yaw: -0.9, size: 2.8, fixed: true },
	{ src: "/models/fence.glb", map: [16.5, 17.8], yaw: 0.7, size: 1.6, density: 0.6 },
	{ src: "/models/fence-piece.glb", map: [18, 17], yaw: 0.7, size: 1.4, density: 0.6 },
	{ src: "/models/planter.glb", map: [14.2, 19.6], yaw: 0.4, size: 1.1 },
	{ src: "/models/suv.glb", map: [13.5, 23], yaw: 2.3, size: 1.4 },
	// the campsite, on the grove road
	{ src: "/models/camping.glb", map: [-30, -12], yaw: 1.1, size: 5, fixed: true },
	{ src: "/models/motorcycle.glb", map: [-27.5, -10.5], yaw: 2.1, size: 0.95, density: 0.8 },
	// the lonely bus stop on the west coast road
	{ src: "/models/bus-stop.glb", map: [-52.5, 14], yaw: 1.55, size: 1.8, fixed: true },
	{ src: "/models/brown-building.glb", map: [-55, 17], yaw: 1.7, size: 4.5, fixed: true },
	{ src: "/models/box.glb", map: [-52.8, 11.6], yaw: 0.3, size: 0.55, density: 0.4 },
	// spawn area — everything stays west, clear of the river corridor
	{ src: "/models/cone.glb", map: [-1.5, 5.0], yaw: 0.2, size: 0.4, density: 0.3 },
	{ src: "/models/cone.glb", map: [-2.8, 5.8], yaw: 0.8, size: 0.4, density: 0.3 },
	{ src: "/models/suv.glb", map: [-3.5, -4.5], yaw: 0.9, size: 1.4 },
];

const BENCHES: { map: [number, number]; yaw: number }[] = [
	{ map: [-2.6, 4.0], yaw: 0.9 },
	{ map: [-5.8, 3.2], yaw: -2.2 }, // pond rim, not the river bank
	{ map: [-6.2, -1.8], yaw: 2.1 },
	{ map: [-16.2, 40.8], yaw: -2.4 }, // by the spring pool
	{ map: [23.8, 35.2], yaw: -0.8 }, // village corner
	{ map: [-33.6, 50.2], yaw: 1.2 }, // hilltop view
	{ map: [-36.2, 53.4], yaw: 2.0 },
	{ map: [53, -45.5], yaw: 0.4 }, // summit, catch your breath
];

/** hand-placed lit lanterns near home; the rest line the roads */
const LANTERNS: { map: [number, number]; lit?: boolean }[] = [
	{ map: [-0.5, 0.2], lit: true },
	{ map: [-3.2, 3.4], lit: true },
	{ map: [-6.5, 6.0] },
	{ map: [-1.4, -4.6] },
];

/** unlit lanterns every ~14 units along the journey roads, sides alternating */
const ROAD_LANTERNS: { map: [number, number] }[] = [];
{
	const STEP = 14;
	let side = 1;
	for (const road of ROADS) {
		let next = STEP * 0.6;
		let traveled = 0;
		for (let i = 0; i < road.pts.length - 1; i++) {
			const [ax, az] = road.pts[i];
			const [bx, bz] = road.pts[i + 1];
			const dx = bx - ax;
			const dz = bz - az;
			const len = Math.hypot(dx, dz) || 1;
			while (next <= traveled + len) {
				const t = (next - traveled) / len;
				const px = ax + dx * t - (dz / len) * 2.3 * side;
				const pz = az + dz * t + (dx / len) * 2.3 * side;
				// clearOf with no road margin: only keep out of station pads,
				// and never in the river
				if (clearOf(px, pz, 0) && dry(px, pz)) {
					ROAD_LANTERNS.push({ map: [px, pz] });
				}
				side = -side;
				next += STEP;
			}
			traveled += len;
		}
	}
}

// placement validator: anything hand-placed that ends up in water or on a
// steep face logs immediately in dev, so layout bugs surface in the console
// (and in the headless probe) instead of mid-drive
if (process.env.NODE_ENV !== "production") {
	const check = (what: string, map: [number, number]) => {
		const y = sampleHeight(map[0], map[1]);
		if (y < -0.15) {
			console.warn(`[playground] "${what}" at (${map[0]}, ${map[1]}) is in water (y=${y.toFixed(2)})`);
		}
	};
	for (const c of SET_DRESSING) check(c.src, c.map);
	for (const b of BENCHES) check("bench", b.map);
	for (const l of LANTERNS) check("lantern", l.map);
}

export default function Flora() {
	const { palette } = usePlayground();

	return (
		<group>
			{TREES.map(([x, z, s], i) => (
				<AutumnTree
					key={`${x.toFixed(1)}:${z.toFixed(1)}`}
					map={[x, z]}
					scale={s}
					seed={i}
				/>
			))}
			{/* decorative golden grass, no physics */}
			{GRASS.map(([x, z, s]) => {
				const pose = poseOnGlobe(x, z, x * 3.7);
				return (
					<group
						key={`${x.toFixed(2)}:${z.toFixed(2)}`}
						position={pose.position}
						rotation={pose.rotation}
						scale={s}
					>
						{[
							[0, 0, 0, 0.26],
							[0.09, 0.3, 0.04, 0.2],
							[-0.08, -0.25, -0.04, 0.22],
							[0.02, 0.55, -0.08, 0.16],
						].map(([ox, rz, oz, h]) => (
							<mesh
								key={`${ox}:${h}`}
								position={[ox, h / 2, oz]}
								rotation={[0, 0, rz]}
							>
								<coneGeometry args={[0.05, h, 4]} />
								<meshStandardMaterial
									color={(ox + oz) % 0.1 > 0.05 ? DAY.tree : DAY.treeLight}
									flatShading
								/>
							</mesh>
						))}
					</group>
				);
			})}
			{/* venue titles + beacons */}
			{VENUES.map((v) => {
				const s = STATIONS[v.id];
				const len = Math.hypot(s.map[0], s.map[1]);
				const toward = [s.map[0] / len, s.map[1] / len];
				return (
					<group key={v.id}>
						<GroundWord
							word={v.word}
							map={[
								s.map[0] - toward[0] * 3.4 + toward[1] * 1.5,
								s.map[1] - toward[1] * 3.4 - toward[0] * 1.5,
							]}
							yaw={Math.atan2(s.map[0], s.map[1]) + Math.PI}
							size={0.62}
							density={0.4}
						/>
						<Beacon
							map={[s.map[0] + toward[1] * 2.4, s.map[1] - toward[0] * 2.4]}
							color={palette[v.accent]}
						/>
					</group>
				);
			})}
			{/* flowers */}
			{FLOWERS.map((f) => {
				const pose = poseOnGlobe(f.x, f.z, 0, [0, 0.1, 0]);
				return (
					<Prop
						key={`${f.x.toFixed(2)}:${f.z.toFixed(2)}`}
						position={pose.position}
						rotation={pose.rotation}
						colliders={false}
						density={0.2}
					>
						<BallCollider args={[0.08]} />
						<mesh position={[0, -0.02, 0]}>
							<cylinderGeometry args={[0.016, 0.016, 0.2, 5]} />
							<meshStandardMaterial color={DAY.tree} flatShading />
						</mesh>
						<mesh position={[0, 0.1, 0]}>
							<sphereGeometry args={[0.06, 6, 6]} />
							<meshStandardMaterial color={palette[f.hue]} flatShading />
						</mesh>
					</Prop>
				);
			})}
			{/* rocks */}
			{ROCKS.map(([x, z, r]) => {
				const pose = poseOnGlobe(x, z, x, [0, r * 0.6, 0]);
				return (
					<Prop
						key={`${x.toFixed(2)}:${z.toFixed(2)}`}
						position={pose.position}
						rotation={pose.rotation}
						colliders={false}
						density={2}
						restitution={0.2}
					>
						<BallCollider args={[r * 0.92]} />
						<mesh>
							<icosahedronGeometry args={[r, 0]} />
							<meshStandardMaterial color={DAY.cream} flatShading />
						</mesh>
					</Prop>
				);
			})}
			{BENCHES.map((b) => (
				<Bench key={`${b.map[0]}:${b.map[1]}`} map={b.map} yaw={b.yaw} />
			))}
			{LANTERNS.map((l) => (
				<Lantern key={`${l.map[0]}:${l.map[1]}`} map={l.map} lit={l.lit} />
			))}
			{ROAD_LANTERNS.map((l) => (
				<Lantern
					key={`${l.map[0].toFixed(1)}:${l.map[1].toFixed(1)}`}
					map={l.map}
				/>
			))}
			<Windmill map={[21.5, 22.5]} yaw={-0.9} />
			<CampfireSmoke map={[-29.4, -11.4]} />
			{/* set dressing from the city pack */}
			{SET_DRESSING.map((c, i) => {
				const pose = poseOnGlobe(c.map[0], c.map[1], c.yaw);
				if (c.fixed) {
					return (
						<RigidBody
							key={`${c.src}:${i}`}
							type="fixed"
							colliders="cuboid"
							position={pose.position}
							rotation={pose.rotation}
						>
							<GLB src={c.src} size={c.size} />
						</RigidBody>
					);
				}
				return (
					<Prop
						key={`${c.src}:${i}`}
						position={pose.position}
						rotation={pose.rotation}
						density={c.density ?? 1}
					>
						<GLB src={c.src} size={c.size} />
					</Prop>
				);
			})}
		</group>
	);
}

/** tall glowing pillar marking a venue — visible across the world */
function Beacon({ map, color }: { map: [number, number]; color: string }) {
	const pose = poseOnGlobe(map[0], map[1], 0);
	const glow = useRef<MeshStandardMaterial>(null);
	const phase = map[0] * 0.7 + map[1] * 1.3;

	useFrame(({ clock }) => {
		if (glow.current) {
			glow.current.emissiveIntensity =
				1.5 + Math.sin(clock.elapsedTime * 2 + phase) * 0.7;
		}
	});

	return (
		<group position={pose.position} rotation={pose.rotation}>
			<mesh position={[0, 4, 0]}>
				<cylinderGeometry args={[0.09, 0.16, 8, 8, 1, true]} />
				<meshBasicMaterial color={color} transparent opacity={0.5} />
			</mesh>
			<mesh position={[0, 0.3, 0]}>
				<cylinderGeometry args={[0.3, 0.42, 0.6, 8]} />
				<meshStandardMaterial
					ref={glow}
					color={color}
					emissive={color}
					emissiveIntensity={1.5}
				/>
			</mesh>
		</group>
	);
}

/** spinning windmill at the farm */
function Windmill({ map, yaw }: { map: [number, number]; yaw: number }) {
	const blades = useRef<Group>(null);
	const pose = poseOnGlobe(map[0], map[1], yaw);

	useFrame((_, delta) => {
		if (blades.current) blades.current.rotation.z += delta * 1.1;
	});

	return (
		<group position={pose.position} rotation={pose.rotation}>
			<RigidBody type="fixed" colliders="cuboid">
				<mesh position={[0, 1.5, 0]} castShadow>
					<cylinderGeometry args={[0.22, 0.4, 3, 6]} />
					<meshStandardMaterial color={DAY.cream} flatShading />
				</mesh>
			</RigidBody>
			<mesh position={[0, 2.9, 0.28]} castShadow>
				<boxGeometry args={[0.3, 0.3, 0.36]} />
				<meshStandardMaterial color={DAY.wood} flatShading />
			</mesh>
			<group ref={blades} position={[0, 2.9, 0.5]}>
				{[0, Math.PI / 2].map((rz) => (
					<mesh key={rz} rotation={[0, 0, rz]} castShadow>
						<boxGeometry args={[0.12, 2.6, 0.04]} />
						<meshStandardMaterial color={DAY.wood} flatShading />
					</mesh>
				))}
			</group>
		</group>
	);
}

/** a lazy plume above the campfire in the camping diorama */
function CampfireSmoke({ map }: { map: [number, number] }) {
	const pose = poseOnGlobe(map[0], map[1]);
	const acc = useRef(0);

	useFrame((_, delta) => {
		acc.current += delta;
		if (acc.current > 0.33) {
			acc.current = 0;
			emitDust(pose.position[0], pose.position[1] + 0.7, pose.position[2], 1, 0.1);
		}
	});

	return null;
}

/** autumn foliage tree: trunk + blobby canopy in sunset tones */
function AutumnTree({
	map,
	scale = 1,
	seed,
}: {
	map: [number, number];
	scale?: number;
	seed: number;
}) {
	const pose = poseOnGlobe(map[0], map[1], seed * 1.3);
	const c1 = FOLIAGE[seed % FOLIAGE.length];
	const c2 = FOLIAGE[(seed + 2) % FOLIAGE.length];
	const c3 = FOLIAGE[(seed + 4) % FOLIAGE.length];

	return (
		<Prop
			position={pose.position}
			rotation={pose.rotation}
			colliders={false}
			density={2.5}
			respawnAfter={10}
		>
			<CylinderCollider
				args={[1.0 * scale, 0.45 * scale]}
				position={[0, 1.0 * scale, 0]}
			/>
			<group scale={scale}>
				<mesh position={[0, 0.45, 0]}>
					<cylinderGeometry args={[0.09, 0.14, 0.9, 6]} />
					<meshStandardMaterial color={DAY.trunk} />
				</mesh>
				<mesh position={[0, 1.35, 0]}>
					<icosahedronGeometry args={[0.62, 0]} />
					<meshStandardMaterial color={c1} flatShading />
				</mesh>
				<mesh position={[0.42, 1.05, 0.18]}>
					<icosahedronGeometry args={[0.38, 0]} />
					<meshStandardMaterial color={c2} flatShading />
				</mesh>
				<mesh position={[-0.36, 1.1, -0.2]}>
					<icosahedronGeometry args={[0.34, 0]} />
					<meshStandardMaterial color={c3} flatShading />
				</mesh>
				<mesh position={[0.05, 1.85, -0.1]}>
					<icosahedronGeometry args={[0.3, 0]} />
					<meshStandardMaterial color={c2} flatShading />
				</mesh>
			</group>
		</Prop>
	);
}

/** park bench, knockable */
function Bench({ map, yaw }: { map: [number, number]; yaw: number }) {
	const pose = poseOnGlobe(map[0], map[1], yaw);
	return (
		<Prop position={pose.position} rotation={pose.rotation} density={1.2}>
			{[-0.5, 0.5].map((x) => (
				<mesh key={x} position={[x, 0.2, 0]}>
					<boxGeometry args={[0.08, 0.4, 0.42]} />
					<meshStandardMaterial color={DAY.metal} flatShading />
				</mesh>
			))}
			{[0, 0.09].map((z, i) => (
				<mesh key={z} position={[0, 0.42, i === 0 ? -0.1 : 0.12]}>
					<boxGeometry args={[1.25, 0.05, 0.18]} />
					<meshStandardMaterial color={DAY.wood} />
				</mesh>
			))}
			{[0.62, 0.82].map((y) => (
				<mesh key={y} position={[0, y, -0.21]} rotation={[0.12, 0, 0]}>
					<boxGeometry args={[1.25, 0.1, 0.05]} />
					<meshStandardMaterial color={DAY.wood} />
				</mesh>
			))}
		</Prop>
	);
}

/** glowing box lantern on a short post */
function Lantern({ map, lit = false }: { map: [number, number]; lit?: boolean }) {
	const { palette } = usePlayground();
	const pose = poseOnGlobe(map[0], map[1], 0);

	return (
		<Prop
			position={pose.position}
			rotation={pose.rotation}
			colliders={false}
			density={2}
			respawnAfter={10}
		>
			<CylinderCollider args={[0.55, 0.13]} position={[0, 0.55, 0]} />
			<mesh position={[0, 0.45, 0]}>
				<boxGeometry args={[0.07, 0.9, 0.07]} />
				<meshStandardMaterial color={DAY.metal} flatShading />
			</mesh>
			<mesh position={[0, 0.98, 0]}>
				<boxGeometry args={[0.26, 0.32, 0.26]} />
				<meshStandardMaterial color={DAY.metal} flatShading />
			</mesh>
			<mesh position={[0, 0.97, 0]}>
				<boxGeometry args={[0.2, 0.22, 0.2]} />
				<meshStandardMaterial
					color={palette.amber}
					emissive={palette.amber}
					emissiveIntensity={1.6}
				/>
			</mesh>
			<mesh position={[0, 1.17, 0]}>
				<coneGeometry args={[0.2, 0.12, 4]} />
				<meshStandardMaterial color={DAY.metal} flatShading />
			</mesh>
			{lit && (
				<pointLight
					position={[0, 1, 0]}
					color={palette.amber}
					intensity={2.2}
					distance={6}
					decay={1.8}
				/>
			)}
		</Prop>
	);
}
