"use client";

import { RoundedBox } from "@react-three/drei";
import { poseOnGlobe, STATIONS } from "../constants";
import { usePlayground } from "../context";
import Hotspot from "../Hotspot";
import Prop from "../Prop";
import { StationPanel, StationScreen } from "../StationScreen";
import { mix } from "../usePalette";

const STATION = STATIONS.resume;

const BOOKS: { lx: number; shelf: 0 | 1; h: number; lean: number; hue: number }[] =
	[
		{ lx: -0.42, shelf: 0, h: 0.46, lean: -0.03, hue: 0 },
		{ lx: -0.26, shelf: 0, h: 0.52, lean: 0.05, hue: 1 },
		{ lx: -0.1, shelf: 0, h: 0.44, lean: -0.06, hue: 2 },
		{ lx: 0.08, shelf: 0, h: 0.5, lean: 0.04, hue: 3 },
		{ lx: -0.38, shelf: 1, h: 0.48, lean: 0.05, hue: 4 },
		{ lx: -0.2, shelf: 1, h: 0.42, lean: -0.04, hue: 5 },
		{ lx: -0.02, shelf: 1, h: 0.5, lean: 0.06, hue: 0 },
		{ lx: 0.34, shelf: 1, h: 0.44, lean: -0.5, hue: 2 },
	];

export default function Bookshelf() {
	const { palette, focused } = usePlayground();
	const frame = mix(palette.amber, palette.bg, 0.55);
	const hues = [
		palette.green,
		palette.amber,
		palette.blue,
		palette.mag,
		palette.cyan,
		palette.red,
	];

	return (
		<group>
			<Hotspot station={STATION} labelY={2.25}>
				{/* back panel */}
				<mesh position={[0, 0.98, -0.18]}>
					<boxGeometry args={[1.32, 1.88, 0.045]} />
					<meshStandardMaterial
						color={mix(palette.amber, palette.bg, 0.66)}
						flatShading
					/>
				</mesh>
				{/* sides */}
				{[-0.66, 0.66].map((x) => (
					<RoundedBox
						key={x}
						args={[0.07, 1.92, 0.42]}
						radius={0.02}
						position={[x, 0.98, 0]}
					>
						<meshStandardMaterial color={frame} />
					</RoundedBox>
				))}
				{/* shelves */}
				{[0.06, 0.7, 1.34].map((y) => (
					<mesh key={y} position={[0, y, 0]}>
						<boxGeometry args={[1.32, 0.06, 0.42]} />
						<meshStandardMaterial color={frame} flatShading />
					</mesh>
				))}
				{/* top */}
				<RoundedBox
					args={[1.44, 0.08, 0.46]}
					radius={0.02}
					position={[0, 1.96, 0]}
				>
					<meshStandardMaterial color={frame} />
				</RoundedBox>
				{/* tiny plant on top */}
				<mesh position={[0.45, 2.06, 0]}>
					<cylinderGeometry args={[0.07, 0.055, 0.12, 7]} />
					<meshStandardMaterial
						color={mix(palette.red, palette.bg, 0.35)}
						flatShading
					/>
				</mesh>
				<mesh position={[0.45, 2.2, 0]}>
					<coneGeometry args={[0.06, 0.18, 5]} />
					<meshStandardMaterial color={palette.green} flatShading />
				</mesh>
				{/* resume floats open above the shelf */}
				{focused === STATION.id && (
					<StationScreen station={STATION} worldWidth={1.9} pxWidth={760}>
						<StationPanel station={STATION} />
					</StationScreen>
				)}
			</Hotspot>
			{/* the books are real physics bodies — ram the shelf, they tumble */}
			{BOOKS.map((b) => {
				const pose = poseOnGlobe(STATION.map[0], STATION.map[1], STATION.yaw, [
					b.lx,
					(b.shelf === 0 ? 0.09 : 0.73) + b.h / 2,
					0.02,
				]);
				return (
					<Prop
						key={`${b.lx}:${b.shelf}`}
						position={pose.position}
						rotation={pose.rotation}
						density={0.5}
					>
						<RoundedBox args={[0.13, b.h, 0.3]} radius={0.012}>
							<meshStandardMaterial
								color={mix(hues[b.hue], palette.bg, 0.25)}
								flatShading
							/>
						</RoundedBox>
						<mesh position={[0, 0, 0.151]}>
							<planeGeometry args={[0.1, b.h * 0.8]} />
							<meshStandardMaterial
								color={mix(hues[b.hue], palette.ink, 0.5)}
								flatShading
							/>
						</mesh>
					</Prop>
				);
			})}
		</group>
	);
}
