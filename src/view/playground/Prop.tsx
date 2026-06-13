"use client";

import { useFrame } from "@react-three/fiber";
import {
	type RapierRigidBody,
	RigidBody,
	type RigidBodyProps,
} from "@react-three/rapier";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { Euler, Quaternion } from "three";
import { thud } from "./audio/sfx";
import { emitDust } from "./particles/Dust";
import { WORLD_BOUND } from "./terrain/height";
import { carTelemetry } from "./Vehicles";

const IDENTITY = new Quaternion();

type PropProps = {
	position: [number, number, number];
	rotation?: [number, number, number];
	children: ReactNode;
	/** rapier auto-collider mode; pass false and add collider children for custom shapes */
	colliders?: RigidBodyProps["colliders"];
	density?: number;
	restitution?: number;
	/** seconds a disturbed prop lies around before the world tidies it up */
	respawnAfter?: number;
};

/**
 * A destructible scene prop. It sleeps as a FIXED body (zero jitter, zero
 * cost) until a vehicle rams it or it gets clicked — then it goes dynamic
 * and tumbles with real physics. It respawns where it started after lying
 * disturbed for a while or falling out of the world.
 */
export default function Prop({
	position,
	rotation,
	children,
	colliders = "cuboid",
	density = 1,
	restitution = 0.35,
	respawnAfter = 12,
}: PropProps) {
	const body = useRef<RapierRigidBody>(null);
	const [live, setLive] = useState(false);
	const wokeAt = useRef<number | null>(null);
	const pendingPoke = useRef(false);
	const home = useMemo(
		() => ({ x: position[0], y: position[1], z: position[2] }),
		[position],
	);
	const homeRot = useMemo(() => {
		const q = new Quaternion();
		if (rotation) {
			q.setFromEuler(new Euler(rotation[0], rotation[1], rotation[2]));
		}
		return q;
	}, [rotation]);

	const wake = () => {
		if (!live) setLive(true);
	};

	useFrame(({ clock }) => {
		const b = body.current;
		if (!b) return;
		if (!live) return;
		if (wokeAt.current === null) wokeAt.current = clock.elapsedTime;
		// clicked: give it a hop once the body has actually turned dynamic
		if (pendingPoke.current && b.bodyType() === 0) {
			pendingPoke.current = false;
			const m = b.mass();
			b.applyImpulse(
				{
					x: (Math.random() - 0.5) * 0.6 * m,
					y: 2.4 * m,
					z: (Math.random() - 0.5) * 0.6 * m,
				},
				true,
			);
			b.applyTorqueImpulse(
				{
					x: (Math.random() - 0.5) * 0.25 * m,
					y: (Math.random() - 0.5) * 0.35 * m,
					z: (Math.random() - 0.5) * 0.25 * m,
				},
				true,
			);
		}
		const t = b.translation();
		const expired =
			wokeAt.current !== null &&
			clock.elapsedTime - wokeAt.current > respawnAfter;
		const out =
			Math.abs(t.x) > WORLD_BOUND ||
			Math.abs(t.z) > WORLD_BOUND ||
			t.y < -0.6; // in the water — even a shallow bank counts
		if (out || expired) {
			b.setTranslation(home, true);
			b.setRotation(homeRot ?? IDENTITY, true);
			b.setLinvel({ x: 0, y: 0, z: 0 }, true);
			b.setAngvel({ x: 0, y: 0, z: 0 }, true);
			wokeAt.current = null;
			pendingPoke.current = false;
			setLive(false);
		}
	});

	return (
		<RigidBody
			ref={body}
			type={live ? "dynamic" : "fixed"}
			position={position}
			rotation={rotation}
			colliders={colliders}
			density={density}
			restitution={restitution}
			friction={0.8}
			linearDamping={0.15}
			angularDamping={0.3}
			onCollisionEnter={(e) => {
				const data = e.other.rigidBody?.userData as
					| { vehicle?: boolean }
					| undefined;
				if (data?.vehicle) {
					wake();
					thud(0.25 + carTelemetry.speedNorm);
					const t = body.current?.translation();
					if (t) emitDust(t.x, t.y + 0.1, t.z, 7, 0.55);
				}
			}}
		>
			<group
				onClick={(e) => {
					e.stopPropagation();
					pendingPoke.current = true;
					wake();
				}}
				onPointerOver={(e) => {
					e.stopPropagation();
					document.body.style.cursor = "grab";
				}}
				onPointerOut={() => {
					document.body.style.cursor = "auto";
				}}
			>
				{children}
			</group>
		</RigidBody>
	);
}
