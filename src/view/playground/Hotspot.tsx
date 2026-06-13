"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import clsx from "clsx";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { STATION_POSES, type Station } from "./constants";
import { usePlayground } from "./context";

type HotspotProps = {
	station: Station;
	/** Height of the floating label above the group origin. */
	labelY?: number;
	children: ReactNode;
};

/**
 * Interactive station wrapper: hover glow + floating label, click to dock
 * the camera (click again to release). The whole thing is a fixed physics
 * body with one collider per child mesh, and it wobbles when rammed.
 */
export default function Hotspot({
	station,
	labelY = 1.6,
	children,
}: HotspotProps) {
	const visual = useRef<Group>(null);
	const wobbleStart = useRef<number | null>(null);
	const [hovered, setHovered] = useState(false);
	const { reducedMotion, focused, setFocused } = usePlayground();
	const isFocused = focused === station.id;

	useEffect(
		() => () => {
			document.body.style.cursor = "auto";
		},
		[],
	);

	useFrame(({ clock }) => {
		const v = visual.current;
		if (!v) return;
		if (!reducedMotion) {
			const target = hovered && !isFocused ? 1.03 : 1;
			v.scale.setScalar(v.scale.x + (target - v.scale.x) * 0.15);
		}
		// ram wobble: -1 marks "hit this frame", stamped with real time here
		if (wobbleStart.current === -1) wobbleStart.current = clock.elapsedTime;
		if (wobbleStart.current !== null) {
			const age = clock.elapsedTime - wobbleStart.current;
			if (age > 1.4) {
				wobbleStart.current = null;
				v.rotation.z = 0;
			} else {
				v.rotation.z = Math.sin(age * 22) * 0.055 * Math.exp(-3 * age);
			}
		}
	});

	const pose = STATION_POSES[station.id];

	return (
		<group
			position={pose.position}
			rotation={pose.rotation}
			onPointerOver={(e) => {
				e.stopPropagation();
				setHovered(true);
				document.body.style.cursor = "pointer";
			}}
			onPointerOut={() => {
				setHovered(false);
				document.body.style.cursor = "auto";
			}}
			onClick={(e) => {
				e.stopPropagation();
				setFocused(isFocused ? null : station.id);
			}}
		>
			<RigidBody
				type="fixed"
				colliders="cuboid"
				onCollisionEnter={() => {
					if (wobbleStart.current === null) wobbleStart.current = -1;
				}}
			>
				<group ref={visual}>{children}</group>
			</RigidBody>
			{!isFocused && (
				<Html
					position={[0, labelY, 0]}
					center
					distanceFactor={11}
					zIndexRange={[10, 0]}
				>
					<div
						className={clsx(
							"pointer-events-none whitespace-nowrap rounded border px-2 py-1 text-[11px] transition-colors",
							hovered
								? "border-term-green bg-term-bg text-term-green"
								: "border-term-rule bg-term-bg/80 text-term-faint",
						)}
					>
						{station.label}
					</div>
				</Html>
			)}
		</group>
	);
}
