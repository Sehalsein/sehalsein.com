"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MeshStandardMaterial } from "three";
import Snake from "@/src/view/os/apps/Snake";
import { STATIONS } from "../constants";
import { usePlayground } from "../context";
import Hotspot from "../Hotspot";
import { StationScreen } from "../StationScreen";
import { mix } from "../usePalette";

const STATION = STATIONS.snake;

const SNAKE_PIXELS: [number, number][] = [
	[-0.17, -0.08],
	[-0.09, -0.08],
	[-0.01, -0.08],
	[-0.01, 0.0],
];

export default function Arcade() {
	const { palette, reducedMotion, focused } = usePlayground();
	const screenMat = useRef<MeshStandardMaterial>(null);
	const live = focused === STATION.id;

	useFrame(({ clock }) => {
		if (!screenMat.current) return;
		screenMat.current.emissiveIntensity =
			reducedMotion || live
				? 0.5
				: 0.45 + Math.sin(clock.elapsedTime * 2.2) * 0.18;
	});

	const body = mix(palette.rule, palette.bg, 0.12);
	const accent = mix(palette.mag, palette.bg, 0.45);

	return (
		<Hotspot station={STATION} labelY={2.55}>
			{/* plinth */}
			<mesh position={[0, 0.07, 0]}>
				<boxGeometry args={[1.12, 0.14, 0.86]} />
				<meshStandardMaterial
					color={mix(palette.rule, palette.bg, 0.02)}
					flatShading
				/>
			</mesh>
			{/* cabinet */}
			<RoundedBox args={[1.05, 2.0, 0.8] } radius={0.04} position={[0, 1.05, 0]}>
				<meshStandardMaterial color={body} />
			</RoundedBox>
			{/* side art panels */}
			{[-0.535, 0.535].map((x) => (
				<mesh key={x} position={[x, 1.05, 0]}>
					<boxGeometry args={[0.025, 1.9, 0.74]} />
					<meshStandardMaterial color={accent} flatShading />
				</mesh>
			))}
			{/* marquee */}
			<RoundedBox
				args={[1.08, 0.26, 0.82]}
				radius={0.03}
				position={[0, 2.12, 0.02]}
			>
				<meshStandardMaterial
					color={mix(palette.rule, palette.bg, 0.02)}
					flatShading
				/>
			</RoundedBox>
			<mesh position={[0, 2.12, 0.44]}>
				<planeGeometry args={[0.9, 0.16]} />
				<meshStandardMaterial
					color={palette.amber}
					emissive={palette.amber}
					emissiveIntensity={1.3}
				/>
			</mesh>
			{/* screen bezel + screen */}
			<RoundedBox
				args={[0.84, 0.66, 0.07]}
				radius={0.02}
				position={[0, 1.38, 0.39]}
			>
				<meshStandardMaterial
					color={mix(palette.rule, palette.bg, 0.0)}
					flatShading
				/>
			</RoundedBox>
			<mesh position={[0, 1.38, 0.428]}>
				<planeGeometry args={[0.68, 0.52]} />
				<meshStandardMaterial
					ref={screenMat}
					color={palette.bg}
					emissive={palette.amber}
					emissiveIntensity={0.5}
				/>
			</mesh>
			{/* idle snake on screen */}
			{!live &&
				SNAKE_PIXELS.map(([x, y]) => (
					<mesh key={`${x}:${y}`} position={[x, 1.36 + y, 0.433]}>
						<planeGeometry args={[0.06, 0.06]} />
						<meshStandardMaterial
							color={palette.green}
							emissive={palette.green}
							emissiveIntensity={1}
						/>
					</mesh>
				))}
			{!live && (
				<mesh position={[0.18, 1.48, 0.433]}>
					<planeGeometry args={[0.055, 0.055]} />
					<meshStandardMaterial
						color={palette.red}
						emissive={palette.red}
						emissiveIntensity={1}
					/>
				</mesh>
			)}
			{/* playable snake, the real component on the cabinet screen */}
			{live && (
				<StationScreen station={STATION} worldWidth={0.6} pxWidth={460}>
					<div className="flex w-[460px] flex-col items-center gap-1.5 rounded border border-term-rule bg-term-bg p-2.5 [&_.hud]:flex [&_.hud]:gap-5 [&_.hud]:text-[12px] [&_.hud]:text-term-dim [&_.hud_b]:text-term-green [&_.tip]:text-[10px] [&_.tip]:text-term-faint [&_canvas]:rounded-sm [&_canvas]:border [&_canvas]:border-term-rule">
						<Snake />
					</div>
				</StationScreen>
			)}
			{/* control deck */}
			<RoundedBox
				args={[1.05, 0.12, 0.5]}
				radius={0.03}
				position={[0, 0.92, 0.52]}
				rotation={[-0.42, 0, 0]}
			>
				<meshStandardMaterial color={body} />
			</RoundedBox>
			{/* joystick */}
			<mesh position={[-0.24, 1.06, 0.58]}>
				<cylinderGeometry args={[0.022, 0.022, 0.13, 6]} />
				<meshStandardMaterial color={palette.faint} flatShading />
			</mesh>
			<mesh position={[-0.24, 1.14, 0.58]}>
				<sphereGeometry args={[0.05, 8, 8]} />
				<meshStandardMaterial color={palette.red} flatShading />
			</mesh>
			{/* buttons */}
			{[
				{ x: 0.06, c: palette.blue },
				{ x: 0.2, c: palette.green },
				{ x: 0.34, c: palette.amber },
			].map((b) => (
				<mesh
					key={b.x}
					position={[b.x, 1.03, 0.57]}
					rotation={[-0.42, 0, 0]}
				>
					<cylinderGeometry args={[0.038, 0.038, 0.035, 10]} />
					<meshStandardMaterial color={b.c} flatShading />
				</mesh>
			))}
			{/* coin door */}
			<mesh position={[0, 0.45, 0.405]}>
				<planeGeometry args={[0.3, 0.22]} />
				<meshStandardMaterial
					color={mix(palette.rule, palette.ink, 0.25)}
					flatShading
				/>
			</mesh>
			<mesh position={[0, 0.45, 0.41]}>
				<planeGeometry args={[0.035, 0.1]} />
				<meshStandardMaterial
					color={palette.amber}
					emissive={palette.amber}
					emissiveIntensity={0.7}
				/>
			</mesh>
		</Hotspot>
	);
}
