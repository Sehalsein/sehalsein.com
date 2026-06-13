"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { poseOnGlobe } from "./constants";
import { AnimatedGLB } from "./GLB";

/* deterministic per-animal randomness */
function hash(a: number, b: number): number {
	let h = Math.imul(a * 1297 + 17, 374761393) ^ Math.imul(b * 911, 668265263);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export type AnimalSpec = {
	src: string;
	size: number;
	speed: number;
	/** grazing ground in map coords */
	home: [number, number];
	range: number;
};

/**
 * A wandering animal: walks between waypoints around its home meadow on
 * the planet surface, playing its built-in walk animation. Pure visual —
 * no physics, so a herd costs almost nothing.
 */
function Animal({ spec, index }: { spec: AnimalSpec; index: number }) {
	const group = useRef<Group>(null);
	const st = useRef({
		x: spec.home[0] + (hash(index, 1) - 0.5) * spec.range,
		z: spec.home[1] + (hash(index, 2) - 0.5) * spec.range,
		tx: spec.home[0],
		tz: spec.home[1],
		leg: 0,
		dx: 0,
		dz: 1,
	});

	useFrame((_, delta) => {
		const g = group.current;
		if (!g) return;
		const dt = Math.min(delta, 0.05);
		const s = st.current;

		let dx = s.tx - s.x;
		let dz = s.tz - s.z;
		const dist = Math.hypot(dx, dz);
		if (dist < 0.4) {
			// pick the next waypoint around home
			s.leg += 1;
			const ang = hash(index, 100 + s.leg) * Math.PI * 2;
			const r = (0.3 + hash(index, 200 + s.leg) * 0.7) * spec.range;
			s.tx = spec.home[0] + Math.cos(ang) * r;
			s.tz = spec.home[1] + Math.sin(ang) * r;
			dx = s.tx - s.x;
			dz = s.tz - s.z;
		}
		const len = Math.hypot(dx, dz) || 1;
		// smooth heading
		s.dx += (dx / len - s.dx) * Math.min(1, 3 * dt);
		s.dz += (dz / len - s.dz) * Math.min(1, 3 * dt);
		const dlen = Math.hypot(s.dx, s.dz) || 1;
		s.x += (s.dx / dlen) * spec.speed * dt;
		s.z += (s.dz / dlen) * spec.speed * dt;

		// face the walking direction
		const yaw = Math.atan2(s.dx, s.dz);
		const pose = poseOnGlobe(s.x, s.z, yaw);
		g.position.set(...pose.position);
		g.rotation.set(...pose.rotation);
	});

	const init = poseOnGlobe(st.current.x, st.current.z, 0);
	return (
		<group ref={group} position={init.position} rotation={init.rotation}>
			<AnimatedGLB src={spec.src} size={spec.size} clip={/walk|run|gallop/i} />
		</group>
	);
}

export default function Animals({ herd }: { herd: AnimalSpec[] }) {
	return (
		<>
			{herd.map((spec, i) => (
				<Animal key={`${spec.src}:${i}`} spec={spec} index={i} />
			))}
		</>
	);
}
