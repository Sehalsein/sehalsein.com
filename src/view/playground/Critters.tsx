"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type Group, type Mesh, Vector3 } from "three";
import { usePlayground } from "./context";
import { sampleHeight } from "./terrain/height";
import { DREAM, mix } from "./usePalette";

/** clusters near flowers and along the lanes */
const BUTTERFLIES: { at: [number, number]; hue: "mag" | "cyan"; phase: number }[] = [
	{ at: [-2.4, 2.3], hue: "mag", phase: 0 },
	{ at: [5.6, 1.3], hue: "cyan", phase: 2.4 },
	{ at: [-1.5, -5.3], hue: "mag", phase: 4.1 },
	{ at: [-5.8, 2.6], hue: "cyan", phase: 1.2 },
	{ at: [8.2, 7.4], hue: "mag", phase: 3.3 },
	{ at: [-12.5, 9.8], hue: "cyan", phase: 5.0 },
	{ at: [14.6, -6.2], hue: "mag", phase: 0.8 },
	{ at: [-20.4, 16.8], hue: "mag", phase: 2.0 },
	{ at: [22.8, 14.4], hue: "cyan", phase: 4.6 },
	{ at: [-9.2, -14.6], hue: "cyan", phase: 1.7 },
];

export default function Critters() {
	const { palette, reducedMotion } = usePlayground();
	const pondY = sampleHeight(-4.2, 1.4);

	return (
		<group>
			{!reducedMotion && (
				<>
					<Bird radius={9} height={4.4} speed={0.32} />
					<Bird radius={17} height={6.2} speed={-0.22} />
					<Bird radius={26} height={8.5} speed={0.16} />
				</>
			)}
			{BUTTERFLIES.map((b) => (
				<Butterfly
					key={`${b.at[0]}:${b.at[1]}`}
					anchor={[b.at[0], sampleHeight(b.at[0], b.at[1]) + 0.4, b.at[1]]}
					hue={b.hue}
					phase={b.phase}
				/>
			))}
			{/* drifting embers in the sunset air */}
			<Sparkles
				count={80}
				scale={[18, 4, 18]}
				position={[0, 1.6, 0]}
				size={2}
				speed={reducedMotion ? 0 : 0.3}
				opacity={0.6}
				color={palette.amber}
			/>
			{/* pollen haze that travels with the truck */}
			<Pollen still={reducedMotion} />
			{/* fireflies over the pond and the spring pool */}
			<Sparkles
				count={26}
				scale={[4.5, 1.6, 4.5]}
				position={[-4.2, pondY + 0.9, 1.4]}
				size={2.6}
				speed={reducedMotion ? 0 : 0.45}
				opacity={0.85}
				color="#fff3c4"
			/>
			<Sparkles
				count={30}
				scale={[6, 1.8, 6]}
				position={[-18, 0.4, 38]}
				size={2.6}
				speed={reducedMotion ? 0 : 0.4}
				opacity={0.85}
				color="#fff3c4"
			/>
		</group>
	);
}

const pollenTarget = new Vector3();

/** a soft cloud of pastel motes that follows the player around the world */
function Pollen({ still }: { still: boolean }) {
	const { playerPosRef } = usePlayground();
	const group = useRef<Group>(null);

	useFrame(() => {
		const g = group.current;
		if (!g) return;
		const p = playerPosRef.current;
		g.position.lerp(pollenTarget.set(p.x, p.y, p.z), 0.03);
	});

	return (
		<group ref={group}>
			<Sparkles
				count={120}
				scale={[42, 6, 42]}
				position={[0, 2.6, 0]}
				size={1.6}
				speed={still ? 0 : 0.22}
				opacity={0.45}
				color={DREAM.cloud}
			/>
		</group>
	);
}

function Bird({
	radius,
	height,
	speed,
}: {
	radius: number;
	height: number;
	speed: number;
}) {
	const { palette } = usePlayground();
	const group = useRef<Group>(null);
	const wingL = useRef<Mesh>(null);
	const wingR = useRef<Mesh>(null);

	useFrame(({ clock }) => {
		const g = group.current;
		if (!g) return;
		const t = clock.elapsedTime * speed;
		g.position.set(
			Math.cos(t) * radius,
			height + Math.sin(clock.elapsedTime * 1.3) * 0.3,
			Math.sin(t) * radius,
		);
		g.rotation.y = speed >= 0 ? -t : Math.PI - t;
		const flap = Math.sin(clock.elapsedTime * 9) * 0.55;
		if (wingL.current) wingL.current.rotation.z = flap;
		if (wingR.current) wingR.current.rotation.z = -flap;
	});

	const feather = mix(palette.ink, palette.bg, 0.2);

	return (
		<group ref={group}>
			{/* body, pointing along +z */}
			<mesh rotation={[Math.PI / 2, 0, 0]}>
				<coneGeometry args={[0.07, 0.3, 5]} />
				<meshStandardMaterial color={feather} flatShading />
			</mesh>
			<mesh position={[0, 0.04, 0.16]}>
				<sphereGeometry args={[0.055, 6, 6]} />
				<meshStandardMaterial color={feather} flatShading />
			</mesh>
			<mesh position={[0, 0.04, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
				<coneGeometry args={[0.02, 0.06, 4]} />
				<meshStandardMaterial color={palette.amber} flatShading />
			</mesh>
			<mesh ref={wingL} position={[0.14, 0.02, 0]}>
				<planeGeometry args={[0.26, 0.12]} />
				<meshStandardMaterial color={feather} flatShading side={2} />
			</mesh>
			<mesh ref={wingR} position={[-0.14, 0.02, 0]}>
				<planeGeometry args={[0.26, 0.12]} />
				<meshStandardMaterial color={feather} flatShading side={2} />
			</mesh>
		</group>
	);
}

function Butterfly({
	anchor,
	hue,
	phase,
}: {
	anchor: [number, number, number];
	hue: "mag" | "cyan";
	phase: number;
}) {
	const { palette, reducedMotion } = usePlayground();
	const group = useRef<Group>(null);
	const wingL = useRef<Group>(null);
	const wingR = useRef<Group>(null);

	useFrame(({ clock }) => {
		const g = group.current;
		if (!g || reducedMotion) return;
		const t = clock.elapsedTime + phase;
		g.position.set(
			anchor[0] + Math.sin(t * 0.7) * 0.5,
			anchor[1] + 0.25 + Math.sin(t * 1.7) * 0.18,
			anchor[2] + Math.cos(t * 0.9) * 0.5,
		);
		g.rotation.y = Math.sin(t * 0.5) * 2;
		const flap = 0.35 + Math.abs(Math.sin(t * 11)) * 0.8;
		if (wingL.current) wingL.current.rotation.z = flap;
		if (wingR.current) wingR.current.rotation.z = -flap;
	});

	return (
		<group
			ref={group}
			position={[anchor[0], anchor[1] + 0.25, anchor[2]]}
		>
			<mesh>
				<boxGeometry args={[0.02, 0.02, 0.09]} />
				<meshStandardMaterial
					color={mix(palette.ink, palette.bg, 0.3)}
					flatShading
				/>
			</mesh>
			<group ref={wingL}>
				<mesh position={[0.05, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
					<planeGeometry args={[0.1, 0.08]} />
					<meshStandardMaterial color={palette[hue]} flatShading side={2} />
				</mesh>
			</group>
			<group ref={wingR}>
				<mesh position={[-0.05, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
					<planeGeometry args={[0.1, 0.08]} />
					<meshStandardMaterial color={palette[hue]} flatShading side={2} />
				</mesh>
			</group>
		</group>
	);
}
