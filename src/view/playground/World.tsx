"use client";

import { Text3D } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh, MeshStandardMaterial } from "three";
import helvetiker from "three/examples/fonts/helvetiker_bold.typeface.json";
import { poseAt } from "./constants";
import Prop from "./Prop";
import { WATER_Y } from "./terrain/height";
import { DAY, DREAM } from "./usePalette";

export default function World() {
	return (
		<group>
			{/* the sea around the island; the carved river fills from it */}
			<Sea />
			{/* pond at home */}
			<Water map={[-4.2, 1.4]} radius={1.45} />
			{/* crashable name — bruno style */}
			{typeof window !== "undefined" &&
			new URLSearchParams(window.location.search).has("no-words") ? null : (
				<Words />
			)}
		</group>
	);
}

/** the breathing sea — tide bob and a slow shimmer */
function Sea() {
	const mesh = useRef<Mesh>(null);
	const mat = useRef<MeshStandardMaterial>(null);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		if (mesh.current) mesh.current.position.y = WATER_Y + Math.sin(t * 0.5) * 0.045;
		if (mat.current) {
			mat.current.emissiveIntensity = 0.25 + Math.sin(t * 0.8 + 1) * 0.07;
		}
	});

	return (
		<mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y, 0]}>
			<planeGeometry args={[520, 520]} />
			<meshStandardMaterial
				ref={mat}
				color={DREAM.water}
				emissive={DREAM.water}
				emissiveIntensity={0.25}
				transparent
				opacity={0.82}
			/>
		</mesh>
	);
}

/** flat water disc with a cream shore ring */
function Water({ map, radius }: { map: [number, number]; radius: number }) {
	return (
		<group {...poseAt(map[0], map[1], 0, [0, 0.005, 0])}>
			<mesh position={[0, 0.004, 0]}>
				<cylinderGeometry args={[radius * 1.17, radius * 1.17, 0.015, 12]} />
				<meshStandardMaterial color={DAY.creamDark} />
			</mesh>
			<mesh position={[0, 0.014, 0]}>
				<cylinderGeometry args={[radius, radius, 0.02, 12]} />
				<meshStandardMaterial
					color={DREAM.water}
					emissive={DREAM.water}
					emissiveIntensity={0.25}
				/>
			</mesh>
		</group>
	);
}

function Words() {
	return (
		<group>
			{/* one clean row west of spawn, clear of the river corridor */}
			<GroundWord word="SEHAL SEIN" map={[-1.5, 2.2]} yaw={2.6} size={0.85} />
			<GroundWord
				word="WASD TO DRIVE"
				map={[-2.5, -2.5]}
				yaw={2.6}
				size={0.32}
				density={0.3}
			/>
		</group>
	);
}

type FontData = {
	resolution: number;
	glyphs: Record<string, { ha: number } | undefined>;
};

/** per-glyph horizontal advance from the typeface metrics, in world units */
function advanceOf(ch: string, size: number): number {
	const font = helvetiker as unknown as FontData;
	const ha = font.glyphs[ch]?.ha ?? font.resolution * 0.6;
	return (ha / font.resolution) * size;
}

/**
 * Extruded standing text — every letter is its own physics body, so a word
 * scatters letter by letter when the truck plows through it.
 */
export function GroundWord({
	word,
	map,
	yaw,
	size,
	density = 0.7,
}: {
	word: string;
	map: [number, number];
	yaw: number;
	size: number;
	density?: number;
}) {
	const letters: { ch: string; x: number }[] = [];
	let cursor = 0;
	for (const ch of word) {
		if (ch !== " ") letters.push({ ch, x: cursor });
		cursor += advanceOf(ch, size);
	}
	const width = cursor;
	return (
		<group>
			{letters.map(({ ch, x }, i) => {
				const pose = poseAt(map[0], map[1], yaw, [x - width / 2, 0.02, 0]);
				return (
					<Prop
						key={`${ch}:${i}`}
						position={pose.position}
						rotation={pose.rotation}
						density={density}
						respawnAfter={14}
					>
						<Text3D
							// three's bundled typeface JSON
							font={helvetiker as unknown as string}
							size={size}
							height={size * 0.42}
							bevelEnabled
							bevelSize={size * 0.025}
							bevelThickness={size * 0.03}
							curveSegments={6}
						>
							{ch}
							<meshStandardMaterial color={DAY.cream} />
						</Text3D>
					</Prop>
				);
			})}
		</group>
	);
}
