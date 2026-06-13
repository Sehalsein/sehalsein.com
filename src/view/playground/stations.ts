export type StationId = "terminal" | "snake" | "resume" | "guestbook" | "now";

export type Station = {
	id: StationId;
	/** full-page fallback / "open ↗" target */
	href: string;
	label: string;
	title: string;
	/** flat map coords from the origin + heading */
	map: [number, number];
	yaw: number;
	/** local offset of the interactive surface from the object origin */
	surface: { up: number; forward: number };
	/** camera distance in front of the surface when focused */
	viewDist: number;
};

export const STATIONS: Record<StationId, Station> = {
	terminal: {
		id: "terminal",
		href: "/terminal",
		label: "› terminal",
		title: "terminal",
		/** a desk in the meadow by the spring pool */
		map: [-23, 36],
		yaw: 1.2,
		surface: { up: 1.6, forward: 0.07 },
		viewDist: 1.7,
	},
	snake: {
		id: "snake",
		href: "/os?open=snake",
		label: "▸ snake",
		title: "snake",
		/** arcade tucked in the forest grove on the west rise */
		map: [-45, -25],
		yaw: 2.9,
		surface: { up: 1.38, forward: 0.43 },
		viewDist: 1.6,
	},
	resume: {
		id: "resume",
		href: "/resume",
		label: "▤ resume",
		title: "resume",
		/** on the highland's top terrace — drive the switchbacks up */
		map: [55, -48],
		yaw: 0.2,
		surface: { up: 2.5, forward: 0.55 },
		viewDist: 2.4,
	},
	guestbook: {
		id: "guestbook",
		href: "/guestbook",
		label: "✉ guestbook",
		title: "guestbook",
		/** village at the loop junction, east meadow */
		map: [25, 38],
		yaw: -2.0,
		surface: { up: 2.05, forward: 0.4 },
		viewDist: 2.3,
	},
	now: {
		id: "now",
		href: "/now",
		label: "☞ now",
		title: "now",
		/** viewpoint on the north hill */
		map: [-35, 52],
		yaw: 1.4,
		surface: { up: 2.0, forward: 0.4 },
		viewDist: 2.3,
	},
};

export const STATION_LIST: Station[] = Object.values(STATIONS);
