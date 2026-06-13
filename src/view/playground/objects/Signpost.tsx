"use client";

import { RoundedBox } from "@react-three/drei";
import { STATIONS } from "../constants";
import { usePlayground } from "../context";
import Hotspot from "../Hotspot";
import { StationPanel, StationScreen } from "../StationScreen";
import { mix } from "../usePalette";

const STATION = STATIONS.now;

export default function Signpost() {
	const { palette, focused } = usePlayground();
	const wood = mix(palette.amber, palette.bg, 0.55);

	return (
		<Hotspot station={STATION} labelY={1.95}>
			{/* post */}
			<RoundedBox args={[0.1, 1.55, 0.1]} radius={0.02} position={[0, 0.77, 0]}>
				<meshStandardMaterial color={wood} />
			</RoundedBox>
			{/* top plank → */}
			<group position={[0.1, 1.32, 0]} rotation={[0, 0, -0.05]}>
				<RoundedBox args={[0.85, 0.26, 0.06]} radius={0.02}>
					<meshStandardMaterial
						color={mix(palette.cyan, palette.bg, 0.35)}
						flatShading
					/>
				</RoundedBox>
				<mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
					<coneGeometry args={[0.14, 0.2, 4]} />
					<meshStandardMaterial
						color={mix(palette.cyan, palette.bg, 0.35)}
						flatShading
					/>
				</mesh>
			</group>
			{/* lower plank ← */}
			<group position={[-0.06, 0.95, 0]} rotation={[0, 0, 0.06]}>
				<RoundedBox args={[0.7, 0.22, 0.06]} radius={0.02}>
					<meshStandardMaterial
						color={mix(palette.mag, palette.bg, 0.4)}
						flatShading
					/>
				</RoundedBox>
				<mesh position={[-0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
					<coneGeometry args={[0.12, 0.18, 4]} />
					<meshStandardMaterial
						color={mix(palette.mag, palette.bg, 0.4)}
						flatShading
					/>
				</mesh>
			</group>
			{/* the /now board */}
			{focused === STATION.id && (
				<StationScreen station={STATION} worldWidth={1.9} pxWidth={760}>
					<StationPanel station={STATION} />
				</StationScreen>
			)}
		</Hotspot>
	);
}
