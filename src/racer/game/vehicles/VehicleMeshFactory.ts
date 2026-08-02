import * as THREE from "three";
import type { SilhouetteId, VehicleColors, VehicleConfig } from "./VehicleCatalog";
import tuning from "../../data/physics/tuning.json";

export interface VehicleMesh {
	root: THREE.Group;
	wheels: THREE.Object3D[];
}

const C = tuning.chassis;
const W = tuning.wheels;
const WHEEL_RADIUS = tuning.suspension.wheelRadius;

interface Palette {
	body: THREE.MeshStandardMaterial;
	accent: THREE.MeshStandardMaterial;
	cabin: THREE.MeshStandardMaterial;
	tire: THREE.MeshStandardMaterial;
	hub: THREE.MeshStandardMaterial;
	dark: THREE.MeshStandardMaterial;
}

/**
 * Per-silhouette wheel treatment.
 *
 * Deliberately no radius knob: ride height falls out of the suspension, which
 * is sized from the one physics wheel radius, so a tire drawn at a different
 * radius either hovers above the road or buries itself in the arch. Width and
 * stance carry the visual difference instead, and every car sits correctly.
 */
interface WheelStyle {
	width: number;
	/** Pushes rendered wheels outboard, for open-wheel and kart stances. */
	trackOffset: number;
}

const DEFAULT_WHEELS: WheelStyle = { width: 0.3, trackOffset: 0 };

/**
 * Procedural low-poly cars. Each vehicle picks a silhouette builder, so the
 * six cars read as genuinely different shapes rather than recolours of one
 * box — at isometric distance the shape is what you recognise, well before
 * the paint. Wheel order matches RaycastVehicle (FL, FR, RL, RR) so the
 * render system can mirror physics state directly.
 */
export function buildVehicleMesh(config: VehicleConfig, colors: VehicleColors): VehicleMesh {
	const root = new THREE.Group();
	const palette = makePalette(colors);
	const builder = BUILDERS[config.silhouette] ?? BUILDERS.roadster;
	const style = builder(root, palette);
	return { root, wheels: addWheels(root, palette, style ?? DEFAULT_WHEELS) };
}

function makePalette(colors: VehicleColors): Palette {
	return {
		body: new THREE.MeshStandardMaterial({
			color: colors.body,
			roughness: 0.55,
			metalness: 0.15,
			flatShading: true,
		}),
		accent: new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.6, flatShading: true }),
		cabin: new THREE.MeshStandardMaterial({
			color: colors.cabin,
			roughness: 0.25,
			metalness: 0.4,
			flatShading: true,
		}),
		tire: new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.92, flatShading: true }),
		hub: new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.4, flatShading: true }),
		dark: new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.8, flatShading: true }),
	};
}

function box(
	parent: THREE.Object3D,
	material: THREE.Material,
	size: [number, number, number],
	position: [number, number, number],
	rotationX = 0,
): THREE.Mesh {
	const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
	mesh.position.set(position[0], position[1], position[2]);
	mesh.rotation.x = rotationX;
	mesh.castShadow = true;
	parent.add(mesh);
	return mesh;
}

interface TaperOptions {
	/** Front height as a fraction of the back — under 1 gives a wedge profile. */
	heightFront?: number;
	/** Sinks the nose relative to the tail, in chassis units. */
	noseDrop?: number;
}

/**
 * A tapered prism — the workhorse for noses, tubs and wedge profiles. Built
 * from a 4-sided cylinder (i.e. a box) whose front ring is narrowed, squashed
 * and dropped.
 */
function wedgeBox(
	parent: THREE.Object3D,
	material: THREE.Material,
	widthBack: number,
	widthFront: number,
	height: number,
	length: number,
	position: [number, number, number],
	options: TaperOptions = {},
): THREE.Mesh {
	const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 4, 1);
	geo.rotateY(Math.PI / 4);
	geo.rotateX(Math.PI / 2);
	const attr = geo.attributes.position;
	const heightFront = options.heightFront ?? 1;
	for (let i = 0; i < attr.count; i++) {
		// after the rotations +z is "front" — reshape that end only
		if (attr.getZ(i) <= 0) continue;
		attr.setX(i, attr.getX(i) * (widthFront / widthBack));
		attr.setY(i, attr.getY(i) * heightFront - (1 - heightFront) * 0.5);
	}
	geo.scale(widthBack * Math.SQRT2, height, length);
	if (options.noseDrop) {
		for (let i = 0; i < attr.count; i++) {
			if (attr.getZ(i) > 0) attr.setY(i, attr.getY(i) - options.noseDrop);
		}
	}
	geo.computeVertexNormals();
	const mesh = new THREE.Mesh(geo, material);
	mesh.position.set(position[0], position[1], position[2]);
	mesh.castShadow = true;
	parent.add(mesh);
	return mesh;
}

type Builder = (root: THREE.Group, p: Palette) => WheelStyle | void;

const BUILDERS: Record<SilhouetteId, Builder> = {
	/** Low, soft sports car: sloped nose, set-back cabin, small ducktail. */
	roadster(root, p) {
		box(root, p.body, [C.halfWidth * 2, C.halfHeight * 1.5, C.halfLength * 2], [0, 0, 0]);
		wedgeBox(
			root,
			p.body,
			C.halfWidth * 1.8,
			C.halfWidth * 1.3,
			C.halfHeight * 0.9,
			C.halfLength * 0.8,
			[0, C.halfHeight * 0.85, C.halfLength * 0.62],
		);
		box(
			root,
			p.cabin,
			[C.halfWidth * 1.55, C.halfHeight * 1.5, C.halfLength * 0.95],
			[0, C.halfHeight * 1.5, -C.halfLength * 0.12],
		);
		box(
			root,
			p.accent,
			[C.halfWidth * 1.9, C.halfHeight * 0.7, C.halfLength * 0.24],
			[0, C.halfHeight * 1.1, -C.halfLength * 0.9],
		);
		box(
			root,
			p.accent,
			[C.halfWidth * 1.95, C.halfHeight * 0.5, C.halfLength * 0.14],
			[0, -C.halfHeight * 0.2, C.halfLength * 0.98],
		);
	},

	/** Long flat hood with a scoop, tall greenhouse, high strutted wing. */
	muscle(root, p) {
		// kept narrower than the wheel track so the fat rears stay proud of the
		// bodywork — that stance is most of what makes it read as "muscle"
		box(root, p.body, [C.halfWidth * 1.78, C.halfHeight * 1.9, C.halfLength * 2], [0, C.halfHeight * 0.15, 0]);
		box(
			root,
			p.body,
			[C.halfWidth * 1.7, C.halfHeight * 0.8, C.halfLength * 0.9],
			[0, C.halfHeight * 1.05, C.halfLength * 0.55],
		);
		box(
			root,
			p.dark,
			[C.halfWidth * 0.62, C.halfHeight * 0.55, C.halfLength * 0.34],
			[0, C.halfHeight * 1.6, C.halfLength * 0.6],
		);
		box(
			root,
			p.cabin,
			[C.halfWidth * 1.7, C.halfHeight * 1.5, C.halfLength * 0.8],
			[0, C.halfHeight * 1.75, -C.halfLength * 0.22],
		);
		for (const side of [-1, 1]) {
			box(
				root,
				p.dark,
				[C.halfWidth * 0.16, C.halfHeight * 0.9, C.halfLength * 0.1],
				[side * C.halfWidth * 0.7, C.halfHeight * 1.6, -C.halfLength * 0.92],
			);
			// side exhaust running under the doors
			box(
				root,
				p.hub,
				[C.halfWidth * 0.12, C.halfHeight * 0.18, C.halfLength * 0.7],
				[side * C.halfWidth * 0.9, -C.halfHeight * 0.55, C.halfLength * 0.05],
			);
		}
		box(
			root,
			p.accent,
			[C.halfWidth * 2.15, C.halfHeight * 0.28, C.halfLength * 0.3],
			[0, C.halfHeight * 2.1, -C.halfLength * 0.94],
		);
		box(
			root,
			p.accent,
			[C.halfWidth * 2.05, C.halfHeight * 0.45, C.halfLength * 0.12],
			[0, -C.halfHeight * 0.3, C.halfLength],
		);
		return { width: 0.44, trackOffset: 0.07 };
	},

	/** Open kart: floor pan, seat, roll hoop, exposed outboard wheels. */
	kart(root, p) {
		box(root, p.body, [C.halfWidth * 1.5, C.halfHeight * 0.55, C.halfLength * 1.75], [0, -C.halfHeight * 0.35, 0]);
		wedgeBox(
			root,
			p.accent,
			C.halfWidth * 1.25,
			C.halfWidth * 0.5,
			C.halfHeight * 0.5,
			C.halfLength * 0.6,
			[0, -C.halfHeight * 0.3, C.halfLength],
		);
		box(
			root,
			p.cabin,
			[C.halfWidth * 0.95, C.halfHeight * 1.5, C.halfLength * 0.22],
			[0, C.halfHeight * 0.5, -C.halfLength * 0.42],
		);
		for (const side of [-1, 1]) {
			box(
				root,
				p.body,
				[C.halfWidth * 0.45, C.halfHeight * 0.75, C.halfLength * 0.8],
				[side * C.halfWidth * 0.95, 0, -C.halfLength * 0.05],
			);
			box(
				root,
				p.dark,
				[C.halfWidth * 0.14, C.halfHeight * 1.5, C.halfLength * 0.1],
				[side * C.halfWidth * 0.42, C.halfHeight * 1.3, -C.halfLength * 0.5],
			);
		}
		box(
			root,
			p.dark,
			[C.halfWidth * 0.98, C.halfHeight * 0.16, C.halfLength * 0.1],
			[0, C.halfHeight * 2.0, -C.halfLength * 0.5],
		);
		box(
			root,
			p.dark,
			[C.halfWidth * 0.5, C.halfHeight * 0.12, C.halfLength * 0.08],
			[0, C.halfHeight * 0.75, C.halfLength * 0.12],
		);
		return { width: 0.32, trackOffset: 0.14 };
	},

	/** Doorstop supercar: razor nose rising in one line to a flat rear deck. */
	wedge(root, p) {
		// one long tapered slab does all the work — the whole car is the wedge
		wedgeBox(
			root,
			p.body,
			C.halfWidth * 2,
			C.halfWidth * 1.25,
			C.halfHeight * 1.9,
			C.halfLength * 2,
			[0, C.halfHeight * 0.25, 0],
			{ heightFront: 0.34, noseDrop: C.halfHeight * 0.42 },
		);
		// low glasshouse: a narrow slot rather than a tall greenhouse
		box(
			root,
			p.cabin,
			[C.halfWidth * 1.5, C.halfHeight * 0.62, C.halfLength * 0.62],
			[0, C.halfHeight * 1.28, C.halfLength * 0.02],
			-0.07,
		);
		// flying-buttress rear deck with a lip spoiler
		box(
			root,
			p.body,
			[C.halfWidth * 1.86, C.halfHeight * 0.26, C.halfLength * 0.66],
			[0, C.halfHeight * 1.2, -C.halfLength * 0.62],
		);
		box(
			root,
			p.accent,
			[C.halfWidth * 1.9, C.halfHeight * 0.22, C.halfLength * 0.18],
			[0, C.halfHeight * 1.42, -C.halfLength * 0.98],
		);
		// side strake down the flank, and pop-up headlight blocks on the nose
		for (const side of [-1, 1]) {
			box(
				root,
				p.accent,
				[C.halfWidth * 0.1, C.halfHeight * 0.2, C.halfLength * 1.1],
				[side * C.halfWidth * 0.98, C.halfHeight * 0.15, C.halfLength * 0.05],
			);
			box(
				root,
				p.dark,
				[C.halfWidth * 0.42, C.halfHeight * 0.14, C.halfLength * 0.16],
				[side * C.halfWidth * 0.6, C.halfHeight * 0.02, C.halfLength * 0.92],
			);
		}
		return { ...DEFAULT_WHEELS, width: 0.36 };
	},

	/** Open-wheeler: needle tub between wings, wheels far outboard. */
	formula(root, p) {
		wedgeBox(
			root,
			p.body,
			C.halfWidth * 0.95,
			C.halfWidth * 0.3,
			C.halfHeight * 0.9,
			C.halfLength * 1.5,
			[0, -C.halfHeight * 0.1, C.halfLength * 0.28],
		);
		box(root, p.body, [C.halfWidth, C.halfHeight * 1.1, C.halfLength * 0.7], [0, 0, -C.halfLength * 0.55]);
		for (const side of [-1, 1]) {
			box(
				root,
				p.accent,
				[C.halfWidth * 0.5, C.halfHeight * 0.8, C.halfLength * 0.85],
				[side * C.halfWidth * 0.95, -C.halfHeight * 0.1, -C.halfLength * 0.2],
			);
			box(
				root,
				p.dark,
				[C.halfWidth * 0.12, C.halfHeight * 1.5, C.halfLength * 0.28],
				[side * C.halfWidth * 0.8, C.halfHeight * 0.7, -C.halfLength * 0.95],
			);
		}
		box(
			root,
			p.cabin,
			[C.halfWidth * 0.62, C.halfHeight * 0.7, C.halfLength * 0.45],
			[0, C.halfHeight * 0.6, -C.halfLength * 0.12],
		);
		box(
			root,
			p.dark,
			[C.halfWidth * 0.72, C.halfHeight * 0.8, C.halfLength * 0.12],
			[0, C.halfHeight * 1.15, -C.halfLength * 0.36],
		);
		box(
			root,
			p.accent,
			[C.halfWidth * 1.85, C.halfHeight * 0.16, C.halfLength * 0.26],
			[0, -C.halfHeight * 0.55, C.halfLength * 1.05],
		);
		box(
			root,
			p.accent,
			[C.halfWidth * 1.75, C.halfHeight * 0.18, C.halfLength * 0.3],
			[0, C.halfHeight * 1.45, -C.halfLength * 0.95],
		);
		return { width: 0.46, trackOffset: 0.18 };
	},

	/** Tall pickup: upright cab, open bed, roof light bar, chunky tires. */
	pickup(root, p) {
		box(root, p.body, [C.halfWidth * 2.05, C.halfHeight * 1.9, C.halfLength * 2], [0, C.halfHeight * 0.35, 0]);
		box(
			root,
			p.body,
			[C.halfWidth * 1.95, C.halfHeight * 0.8, C.halfLength * 0.6],
			[0, C.halfHeight * 1.35, C.halfLength * 0.68],
		);
		box(
			root,
			p.cabin,
			[C.halfWidth * 1.8, C.halfHeight * 1.7, C.halfLength * 0.72],
			[0, C.halfHeight * 2.15, C.halfLength * 0.08],
		);
		box(
			root,
			p.body,
			[C.halfWidth * 1.9, C.halfHeight * 0.3, C.halfLength * 0.8],
			[0, C.halfHeight * 3.0, C.halfLength * 0.08],
		);
		box(
			root,
			p.accent,
			[C.halfWidth * 1.5, C.halfHeight * 0.22, C.halfLength * 0.14],
			[0, C.halfHeight * 3.25, C.halfLength * 0.14],
		);
		for (const side of [-1, 1]) {
			box(
				root,
				p.body,
				[C.halfWidth * 0.2, C.halfHeight * 0.85, C.halfLength * 0.85],
				[side * C.halfWidth * 0.92, C.halfHeight * 1.65, -C.halfLength * 0.55],
			);
		}
		box(
			root,
			p.body,
			[C.halfWidth * 2.0, C.halfHeight * 0.85, C.halfLength * 0.16],
			[0, C.halfHeight * 1.65, -C.halfLength * 0.95],
		);
		box(
			root,
			p.accent,
			[C.halfWidth * 2.05, C.halfHeight * 0.55, C.halfLength * 0.16],
			[0, C.halfHeight * 0.2, C.halfLength],
		);
		return { width: 0.46, trackOffset: 0.08 };
	},
};

function addWheels(root: THREE.Group, p: Palette, style: WheelStyle): THREE.Object3D[] {
	const wheels: THREE.Object3D[] = [];
	const wheelGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, style.width, 12);
	wheelGeo.rotateZ(Math.PI / 2);
	const hubGeo = new THREE.CylinderGeometry(WHEEL_RADIUS * 0.55, WHEEL_RADIUS * 0.55, style.width * 1.07, 8);
	hubGeo.rotateZ(Math.PI / 2);

	const offsets: [number, number][] = [
		[-W.offsetX, W.offsetZFront],
		[W.offsetX, W.offsetZFront],
		[-W.offsetX, W.offsetZRear],
		[W.offsetX, W.offsetZRear],
	];
	for (const [x, z] of offsets) {
		const wheelGroup = new THREE.Group();
		const tire = new THREE.Mesh(wheelGeo, p.tire);
		tire.castShadow = true;
		wheelGroup.add(tire, new THREE.Mesh(hubGeo, p.hub));
		// the rendered wheel can sit wider than the raycast anchor without
		// changing a single thing about how the car actually drives
		wheelGroup.position.set(x + Math.sign(x) * style.trackOffset, 0, z);
		root.add(wheelGroup);
		wheels.push(wheelGroup);
	}
	return wheels;
}
