"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import { poseOnGlobe, STATIONS } from "../constants";
import { usePlayground } from "../context";
import Prop from "../Prop";
import { mix } from "../usePalette";

type Vec3 = [number, number, number];

// the desk sits a step behind the terminal station's screen surface and
// follows it wherever the station moves
const ST = STATIONS.terminal;
const DESK_YAW = ST.yaw;
const DESK_MAP: [number, number] = [
	ST.map[0] + Math.sin(ST.yaw) * 0.15,
	ST.map[1] + Math.cos(ST.yaw) * 0.15,
];
const deskLocal = (local: Vec3) =>
	poseOnGlobe(DESK_MAP[0], DESK_MAP[1], DESK_YAW, local);

/**
 * Desk zone: fixed desk body plus a flock of knockable props — chair,
 * keyboard, mouse, mug (with steam), plant.
 */
export default function Desk() {
	const { palette } = usePlayground();
	const wood = mix(palette.amber, palette.bg, 0.5);
	const woodDark = mix(palette.amber, palette.bg, 0.62);
	const metal = mix(palette.rule, palette.ink, 0.15);

	return (
		<group>
			<RigidBody
				type="fixed"
				colliders="cuboid"
				{...poseOnGlobe(DESK_MAP[0], DESK_MAP[1], DESK_YAW)}
			>
				{/* top */}
				<RoundedBox
					args={[3.0, 0.12, 1.4]}
					radius={0.035}
					position={[0, 0.88, 0]}
				>
					<meshStandardMaterial color={wood} />
				</RoundedBox>
				{/* left legs */}
				{[-0.6, 0.6].map((z) => (
					<mesh key={z} position={[-1.35, 0.41, z]}>
						<boxGeometry args={[0.1, 0.82, 0.1]} />
						<meshStandardMaterial color={metal} flatShading />
					</mesh>
				))}
				<mesh position={[-1.35, 0.06, 0]}>
					<boxGeometry args={[0.12, 0.06, 1.2]} />
					<meshStandardMaterial color={metal} flatShading />
				</mesh>
				{/* drawer unit */}
				<RoundedBox
					args={[0.62, 0.78, 1.25]}
					radius={0.03}
					position={[1.05, 0.43, 0]}
				>
					<meshStandardMaterial color={woodDark} />
				</RoundedBox>
				{[0.62, 0.38, 0.14].map((y) => (
					<group key={y}>
						<mesh position={[0.73, y, 0]}>
							<boxGeometry args={[0.03, 0.18, 1.05]} />
							<meshStandardMaterial
								color={mix(palette.amber, palette.bg, 0.42)}
								flatShading
							/>
						</mesh>
						<mesh position={[0.75, y, 0]}>
							<boxGeometry args={[0.025, 0.04, 0.3]} />
							<meshStandardMaterial color={metal} flatShading />
						</mesh>
					</group>
				))}
				{/* desk mat */}
				<mesh position={[-0.35, 0.945, 0.25]}>
					<boxGeometry args={[1.3, 0.015, 0.7]} />
					<meshStandardMaterial
						color={mix(palette.rule, palette.bg, 0.1)}
						flatShading
					/>
				</mesh>
			</RigidBody>

			{/* knockables */}
			<Knockable local={[-0.4, 0.99, 0.22]}>
				<KeyboardModel />
			</Knockable>
			<Knockable local={[0.42, 0.98, 0.3]} density={0.4}>
				<MouseModel />
			</Knockable>
			<Knockable local={[0.45, 0.95, -0.2]} colliders={false} density={0.5}>
				<MugModel />
			</Knockable>
			<Knockable local={[-1.25, 0.95, -0.35]} colliders={false} density={0.8}>
				<PlantModel />
			</Knockable>
			<Knockable local={[-0.3, 0, 1.05]} density={1.2}>
				<ChairModel />
			</Knockable>
		</group>
	);
}

function Knockable({
	local,
	children,
	colliders,
	density = 0.6,
}: {
	local: Vec3;
	children: React.ReactNode;
	colliders?: false;
	density?: number;
}) {
	const pose = deskLocal(local);
	return (
		<Prop
			position={pose.position}
			rotation={pose.rotation}
			colliders={colliders}
			density={density}
		>
			{children}
		</Prop>
	);
}

function KeyboardModel() {
	const { palette } = usePlayground();
	return (
		<group>
			<RoundedBox args={[0.78, 0.06, 0.3]} radius={0.015}>
				<meshStandardMaterial
					color={mix(palette.rule, palette.ink, 0.18)}
					flatShading
				/>
			</RoundedBox>
			{[-0.08, 0, 0.08].map((z) => (
				<mesh key={z} position={[0, 0.032, z]}>
					<boxGeometry args={[0.68, 0.012, 0.055]} />
					<meshStandardMaterial
						color={mix(palette.rule, palette.ink, 0.32)}
						flatShading
					/>
				</mesh>
			))}
		</group>
	);
}

function MouseModel() {
	const { palette } = usePlayground();
	return (
		<group>
			<RoundedBox args={[0.1, 0.05, 0.16]} radius={0.02}>
				<meshStandardMaterial
					color={mix(palette.rule, palette.ink, 0.3)}
					flatShading
				/>
			</RoundedBox>
		</group>
	);
}

function MugModel() {
	const { palette, reducedMotion } = usePlayground();
	const steam = useRef<(Mesh | null)[]>([]);

	useFrame(({ clock }) => {
		if (reducedMotion) return;
		steam.current.forEach((m, i) => {
			if (!m) return;
			const t = (clock.elapsedTime * 0.35 + i / 3) % 1;
			m.position.y = 0.2 + t * 0.45;
			m.position.x = Math.sin((t + i) * 6) * 0.03;
			(m.material as MeshStandardMaterial).opacity = 0.45 * (1 - t);
		});
	});

	return (
		<group>
			<mesh position={[0, 0.1, 0]}>
				<cylinderGeometry args={[0.095, 0.085, 0.2, 12]} />
				<meshStandardMaterial color={palette.amber} flatShading />
			</mesh>
			<mesh position={[0, 0.19, 0]}>
				<cylinderGeometry args={[0.075, 0.075, 0.02, 12]} />
				<meshStandardMaterial
					color={mix(palette.rule, palette.bg, 0.05)}
					flatShading
				/>
			</mesh>
			<mesh position={[0.125, 0.11, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.05, 0.018, 6, 14]} />
				<meshStandardMaterial color={palette.amber} flatShading />
			</mesh>
			{[0, 1, 2].map((i) => (
				<mesh
					key={i}
					position={[0, 0.24, 0]}
					ref={(el) => {
						steam.current[i] = el;
					}}
				>
					<sphereGeometry args={[0.022, 6, 6]} />
					<meshStandardMaterial
						color={palette.ink}
						transparent
						opacity={0.35}
					/>
				</mesh>
			))}
		</group>
	);
}

function PlantModel() {
	const { palette } = usePlayground();
	return (
		<group>
			<mesh position={[0, 0.09, 0]}>
				<cylinderGeometry args={[0.11, 0.085, 0.18, 8]} />
				<meshStandardMaterial
					color={mix(palette.red, palette.bg, 0.35)}
					flatShading
				/>
			</mesh>
			{[
				{ x: 0, h: 0.3, rz: 0 },
				{ x: -0.08, h: 0.22, rz: 0.5 },
				{ x: 0.08, h: 0.25, rz: -0.5 },
				{ x: 0, h: 0.2, rz: 0.9 },
			].map((leaf) => (
				<mesh
					key={`${leaf.rz}:${leaf.h}`}
					position={[leaf.x, 0.18 + leaf.h / 2, 0]}
					rotation={[0, 0, leaf.rz]}
				>
					<coneGeometry args={[0.04, leaf.h, 5]} />
					<meshStandardMaterial color={palette.green} flatShading />
				</mesh>
			))}
		</group>
	);
}

function ChairModel() {
	const { palette } = usePlayground();
	const seat = mix(palette.blue, palette.bg, 0.55);
	const metal = mix(palette.rule, palette.ink, 0.2);

	return (
		<group>
			<RoundedBox args={[0.5, 0.09, 0.48]} radius={0.03} position={[0, 0.52, 0]}>
				<meshStandardMaterial color={seat} />
			</RoundedBox>
			<RoundedBox
				args={[0.48, 0.6, 0.08]}
				radius={0.03}
				position={[0, 0.92, 0.24]}
				rotation={[0.08, 0, 0]}
			>
				<meshStandardMaterial color={seat} />
			</RoundedBox>
			<mesh position={[0, 0.32, 0]}>
				<cylinderGeometry args={[0.035, 0.035, 0.4, 8]} />
				<meshStandardMaterial color={metal} flatShading />
			</mesh>
			{[0, Math.PI / 2].map((ry) => (
				<mesh key={ry} position={[0, 0.07, 0]} rotation={[0, ry, 0]}>
					<boxGeometry args={[0.56, 0.05, 0.07]} />
					<meshStandardMaterial color={metal} flatShading />
				</mesh>
			))}
			{[
				[0.26, 0],
				[-0.26, 0],
				[0, 0.26],
				[0, -0.26],
			].map(([x, z]) => (
				<mesh key={`${x}:${z}`} position={[x, 0.05, z]}>
					<sphereGeometry args={[0.045, 6, 6]} />
					<meshStandardMaterial
						color={mix(palette.rule, palette.bg, 0.05)}
						flatShading
					/>
				</mesh>
			))}
		</group>
	);
}
