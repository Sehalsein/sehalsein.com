export const APP_LINKS = {
	strata: "https://strata.sehalsein.com",
	finn: "https://finn.sehalsein.com",
	dgymbook: "https://dgymbook.com",
} as const;

export const MARQUEE_WORDS = ["STRATA", "FINN", "DGYMBOOK", "PLANNED"];

export const CHAPTERS = [
	{ target: "top", name: "hello" },
	{ target: "strata", name: "the couch" },
	{ target: "finn", name: "the nursery" },
	{ target: "gym", name: "the gym" },
	{ target: "drawer", name: "the toy drawer" },
	{ target: "hi", name: "say hi" },
] as const;

export const INTRO_LINES = [
	"finding the coffee…",
	"warming up the projector…",
	"warming a bottle…",
	"loading the bar…",
	"ok, ready.",
];

export const POSTER_TITLES = [
	"The Long Quiet",
	"Neon Harbor",
	"Paper Moons",
	"Dust & Echo",
	"Northbound",
	"Small Hours",
	"Glass City",
	"Tidewater",
	"Lantern",
	"Second Summer",
	"Low Orbit",
	"Wildfire Season",
];

export const POSTER_COLORS = [
	["#ff8a5c", "#7a2b8f"],
	["#4fd1a5", "#1b3a6b"],
	["#ffc940", "#b8432e"],
	["#a99cff", "#211a55"],
	["#ff8fb8", "#3b5bff"],
	["#89e0ff", "#0e3b46"],
] as const;

export const FINN_LOG = [
	{ icon: "🍼", tint: "#ffd9c2", label: "Feed", time: "3:12 · 120 ml" },
	{ icon: "🧷", tint: "#d6e4ff", label: "Diaper", who: "mom", time: "3:40" },
	{ icon: "🌙", tint: "#e4dcff", label: "Back asleep", time: "4:05" },
	{ icon: "🍼", tint: "#ffd9c2", label: "Feed", who: "dad", time: "5:30 · 90 ml" },
	{ icon: "😴", tint: "#d5f5e8", label: "Nap", time: "5:55 · 1h 05m" },
	{ icon: "☀️", tint: "#fff0b8", label: "Good morning", time: "7:00" },
] as const;

export const GYM_CHECKINS = [
	"6:02 checked in",
	"spin class full",
	"membership renewed",
	"leg day booked",
];

export const GYM_PLATES = [
	{ height: 150, color: "#ff5b36" },
	{ height: 130, color: "#3b5bff" },
	{ height: 110, color: "#ffc940" },
	{ height: 86, color: "#4fd1a5" },
];

export const TOYS = [
	{ href: "/racer", name: "racer", note: "procedural tracks, rude AI drivers", art: "racer", x: 3, y: 8, tilt: -5 },
	{ href: "/doom", name: "doom-ish", note: "raycast walls, synth noises", art: "doom", x: 27, y: 34, tilt: 4 },
	{ href: "/adventure", name: "hollowreach", note: "an AI dungeon master that remembers", art: "adventure", x: 51, y: 6, tilt: -3 },
	{ href: "/os", name: "sehalOS", note: "a tiny desktop, with windows", art: "os", x: 75, y: 30, tilt: 6 },
	{ href: "/editor", name: "draftroom", note: "notebook with paper personality", art: "editor", x: 8, y: 60, tilt: 3 },
	{ href: "/terminal", name: "terminal", note: "this site, as a command line", art: "terminal", x: 56, y: 62, tilt: -6 },
] as const;

export type ToyArt = (typeof TOYS)[number]["art"];
