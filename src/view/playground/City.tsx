"use client";

import { RigidBody } from "@react-three/rapier";
import { poseOnGlobe } from "./constants";
import GLB, { AnimatedGLB } from "./GLB";
import Prop from "./Prop";
import { DAY } from "./usePalette";

/**
 * The base-camp village at the foot of the resume mountain: a real street
 * with building rows, parked cars, streetlights, alley clutter and people —
 * the last stop before the switchbacks. Laid out in street-local
 * coordinates and mapped onto the world.
 */

const CENTER: [number, number] = [34, -32];
/** street axis: ALONG the journey road where it passes the village, so the
 * building rows line the actual road instead of crossing it */
const AXIS: [number, number] = [0.75, -0.66];
/** side axis: perpendicular, toward the back rows */
const SIDE: [number, number] = [0.66, 0.75];

/** street-local (along, side) → map coords */
function at(along: number, side: number): [number, number] {
	return [
		CENTER[0] + AXIS[0] * along + SIDE[0] * side,
		CENTER[1] + AXIS[1] * along + SIDE[1] * side,
	];
}

/** yaw so local +z faces map direction (dx, dz) */
function yawToward(_x: number, _z: number, dx: number, dz: number): number {
	return Math.atan2(dx, dz);
}

const STREET_YAW_DIR = AXIS;
const FACE_STREET = [-SIDE[0], -SIDE[1]] as const; // far row faces spawn-ward

const BUILDINGS: {
	src: string;
	along: number;
	side: number;
	size: number;
	face?: readonly [number, number];
}[] = [
	// far row (facing the street) — spaced wider than each model's footprint
	{ src: "/models/big-building.glb", along: -7.5, side: 3.8, size: 5 },
	{ src: "/models/building-red.glb", along: -2.5, side: 3.6, size: 4 },
	{ src: "/models/building-green.glb", along: 2.5, side: 3.7, size: 4 },
	{ src: "/models/building-red-corner.glb", along: 7.5, side: 3.8, size: 4.2 },
	// near row, with a plaza gap where the street opens out
	{ src: "/models/building-green.glb", along: -7, side: -3.6, size: 3.8, face: SIDE },
	{ src: "/models/big-building.glb", along: 7, side: -3.8, size: 4.8, face: SIDE },
];

const PARKED: { src: string; along: number; side: number; size: number }[] = [
	{ src: "/models/car.glb", along: -3.5, side: -1.4, size: 1.4 },
	{ src: "/models/car-2.glb", along: 0.5, side: 1.4, size: 1.4 },
	{ src: "/models/van.glb", along: 3.8, side: -1.4, size: 1.5 },
	{ src: "/models/motorcycle.glb", along: 2.2, side: 1.3, size: 0.95 },
];

const CLUTTER: {
	src: string;
	along: number;
	side: number;
	size: number;
	density?: number;
	yawJitter?: number;
}[] = [
	{ src: "/models/traffic-light.glb", along: -6.5, side: -0.9, size: 1.8 },
	{ src: "/models/traffic-light.glb", along: 6.5, side: 0.9, size: 1.8 },
	{ src: "/models/dumpster.glb", along: -3.8, side: 5.2, size: 1.2 },
	{ src: "/models/box.glb", along: -3.2, side: 5.4, size: 0.55, density: 0.4 },
	{ src: "/models/box.glb", along: -3.0, side: 5.0, size: 0.55, density: 0.4 },
	{ src: "/models/power-box.glb", along: 0.6, side: 5.2, size: 0.9 },
	{ src: "/models/fire-exit.glb", along: 4.2, side: 5.0, size: 2.2 },
	{ src: "/models/rock-band-poster.glb", along: 1.8, side: 5.1, size: 1.1 },
	{ src: "/models/trash-can.glb", along: 2.2, side: -1.2, size: 0.55 },
	{ src: "/models/bus-stop-sign.glb", along: -2.0, side: -1.3, size: 1.4 },
	{ src: "/models/planter.glb", along: 4.6, side: 1.3, size: 1.1 },
	{ src: "/models/atm.glb", along: 5.2, side: 2.6, size: 1.15 },
	{ src: "/models/cone.glb", along: -0.8, side: 0.3, size: 0.4, density: 0.3 },
	{ src: "/models/cone.glb", along: -1.4, side: -0.3, size: 0.4, density: 0.3 },
];

const PEOPLE: { src: string; along: number; side: number; yawJitter: number }[] =
	[
		{ src: "/models/adventurer.glb", along: 1.2, side: -2.2, yawJitter: 0.4 },
		{ src: "/models/animated-woman.glb", along: -2.6, side: 2.2, yawJitter: -0.6 },
		{ src: "/models/animated-woman-2.glb", along: 4.4, side: -2.0, yawJitter: 2.6 },
	];

export default function City() {
	const streetYaw = yawToward(
		CENTER[0],
		CENTER[1],
		STREET_YAW_DIR[0],
		STREET_YAW_DIR[1],
	);

	return (
		<group>
			{/* street surface + sidewalk strips */}
			{[
				{ w: 2.6, lift: 0.012, color: DAY.sandDark, len: 15 },
				{ w: 0.12, lift: 0.022, color: DAY.cream, len: 13 },
			].map((s) => {
				const pose = poseOnGlobe(CENTER[0], CENTER[1], streetYaw, [
					0,
					s.lift,
					0,
				]);
				return (
					<mesh
						key={s.w}
						position={pose.position}
						rotation={pose.rotation}
						receiveShadow
					>
						<boxGeometry args={[s.w, 0.024, s.len]} />
						<meshStandardMaterial color={s.color} />
					</mesh>
				);
			})}
			{/* manholes */}
			{[-2.2, 2.6].map((along) => {
				const [x, z] = at(along, 0.4);
				const pose = poseOnGlobe(x, z, 0, [0, 0.03, 0]);
				return (
					<Prop
						key={along}
						position={pose.position}
						rotation={pose.rotation}
						density={0.8}
					>
						<GLB src="/models/manhole-cover.glb" size={0.6} />
					</Prop>
				);
			})}
			{/* buildings: fixed, you bounce off them */}
			{BUILDINGS.map((b) => {
				const [x, z] = at(b.along, b.side);
				const face = b.face ?? FACE_STREET;
				const pose = poseOnGlobe(x, z, yawToward(x, z, face[0], face[1]));
				return (
					<RigidBody
						key={`${b.src}:${b.along}`}
						type="fixed"
						colliders="cuboid"
						position={pose.position}
						rotation={pose.rotation}
					>
						<GLB src={b.src} size={b.size} />
					</RigidBody>
				);
			})}
			{/* parked vehicles, knockable */}
			{PARKED.map((c) => {
				const [x, z] = at(c.along, c.side);
				const pose = poseOnGlobe(
					x,
					z,
					yawToward(x, z, AXIS[0], AXIS[1]) + (c.side > 0 ? Math.PI : 0),
				);
				return (
					<Prop
						key={`${c.src}:${c.along}`}
						position={pose.position}
						rotation={pose.rotation}
						density={1.6}
					>
						<GLB src={c.src} size={c.size} />
					</Prop>
				);
			})}
			{/* clutter */}
			{CLUTTER.map((c, i) => {
				const [x, z] = at(c.along, c.side);
				const pose = poseOnGlobe(
					x,
					z,
					yawToward(x, z, FACE_STREET[0], FACE_STREET[1]) +
						(c.yawJitter ?? 0),
				);
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
			{/* people, idling */}
			{PEOPLE.map((p) => {
				const [x, z] = at(p.along, p.side);
				const pose = poseOnGlobe(
					x,
					z,
					yawToward(x, z, FACE_STREET[0], FACE_STREET[1]) + p.yawJitter,
				);
				return (
					<group
						key={p.src}
						position={pose.position}
						rotation={pose.rotation}
					>
						<AnimatedGLB src={p.src} size={1.15} clip={/idle/i} />
					</group>
				);
			})}
		</group>
	);
}
