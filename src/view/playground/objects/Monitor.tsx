"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { STATIONS } from "../constants";
import { usePlayground } from "../context";
import Hotspot from "../Hotspot";
import { StationScreen } from "../StationScreen";
import { mix } from "../usePalette";

const STATION = STATIONS.terminal;

export default function Monitor() {
	const { palette, reducedMotion, focused } = usePlayground();
	const cursor = useRef<Mesh>(null);
	const live = focused === STATION.id;

	useFrame(({ clock }) => {
		if (!cursor.current) return;
		cursor.current.visible =
			!live &&
			(reducedMotion || Math.floor(clock.elapsedTime * 1.6) % 2 === 0);
	});

	const shell = mix(palette.rule, palette.ink, 0.14);

	return (
		<Hotspot station={STATION} labelY={2.45}>
			<group position={[0, 0.94, 0]}>
			{/* arm */}
			<mesh position={[0, 0.015, -0.18]}>
				<cylinderGeometry args={[0.14, 0.17, 0.03, 10]} />
				<meshStandardMaterial color={shell} flatShading />
			</mesh>
			<mesh position={[0, 0.22, -0.18]} rotation={[0.25, 0, 0]}>
				<boxGeometry args={[0.06, 0.45, 0.06]} />
				<meshStandardMaterial color={shell} flatShading />
			</mesh>
			{/* body */}
			<RoundedBox
				args={[1.5, 0.92, 0.1]}
				radius={0.03}
				position={[0, 0.66, 0]}
			>
				<meshStandardMaterial color={shell} />
			</RoundedBox>
			{/* screen */}
			<mesh position={[0, 0.66, 0.055]}>
				<planeGeometry args={[1.34, 0.78]} />
				<meshStandardMaterial
					color={palette.bg}
					emissive={palette.bg2}
					emissiveIntensity={0.7}
				/>
			</mesh>
			{/* power dot */}
			<mesh position={[0, 0.235, 0.056]}>
				<circleGeometry args={[0.012, 8]} />
				<meshStandardMaterial
					color={palette.green}
					emissive={palette.green}
					emissiveIntensity={1.4}
				/>
			</mesh>
			{!live && (
				<>
					{/* prompt line */}
					<mesh position={[-0.48, 0.92, 0.062]}>
						<planeGeometry args={[0.28, 0.05]} />
						<meshStandardMaterial
							color={palette.green}
							emissive={palette.green}
							emissiveIntensity={0.9}
						/>
					</mesh>
					{/* blinking cursor */}
					<mesh ref={cursor} position={[-0.28, 0.92, 0.062]}>
						<planeGeometry args={[0.05, 0.075]} />
						<meshStandardMaterial
							color={palette.green}
							emissive={palette.green}
							emissiveIntensity={1}
						/>
					</mesh>
					{/* output lines */}
					{[
						{ x: -0.33, y: 0.78, w: 0.58 },
						{ x: -0.42, y: 0.68, w: 0.4 },
						{ x: -0.27, y: 0.58, w: 0.7 },
					].map((l) => (
						<mesh key={l.y} position={[l.x, l.y, 0.062]}>
							<planeGeometry args={[l.w, 0.04]} />
							<meshStandardMaterial
								color={palette.faint}
								emissive={palette.faint}
								emissiveIntensity={0.5}
							/>
						</mesh>
					))}
				</>
			)}
			</group>
			{/* outside the lifted group: surface.up is measured from the
			    station origin, which already includes the desk height */}
			{live && (
				<StationScreen station={STATION} worldWidth={1.34} pxWidth={960}>
					<iframe
						src={STATION.href}
						title="terminal"
						style={{
							width: 960,
							height: 560,
							border: 0,
							display: "block",
							background: "var(--color-term-bg)",
						}}
					/>
				</StationScreen>
			)}
		</Hotspot>
	);
}
