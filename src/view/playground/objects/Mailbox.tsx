"use client";

import { STATIONS } from "../constants";
import { usePlayground } from "../context";
import GLB from "../GLB";
import Hotspot from "../Hotspot";
import { StationPanel, StationScreen } from "../StationScreen";

const STATION = STATIONS.guestbook;

export default function Mailbox() {
	const { focused } = usePlayground();

	return (
		<Hotspot station={STATION} labelY={1.8}>
			<GLB src="/models/mailbox.glb" size={1.5} />
			{/* guestbook opens like a letter pulled from the box */}
			{focused === STATION.id && (
				<StationScreen station={STATION} worldWidth={1.9} pxWidth={760}>
					<StationPanel station={STATION} />
				</StationScreen>
			)}
		</Hotspot>
	);
}
