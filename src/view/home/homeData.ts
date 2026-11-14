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

/** Strata's library wall: dim, warm, a little cinematic. */
export const POSTER_COLORS = [
	["#3a2a22", "#121316"],
	["#24303a", "#0e1013"],
	["#4a2f1f", "#16120f"],
	["#2b2838", "#0f0f14"],
	["#3d3424", "#14130f"],
	["#1f3330", "#0d1112"],
] as const;

/** Finn's own category colours (bottle, diaper, sleep…), straight from the app. */
export const FINN_LOG = [
	{ kind: "bottle", color: "#0088ff", label: "Bottle", time: "3:12 · 120 ml" },
	{ kind: "diaper", color: "#00c3d0", label: "Diaper", who: "mom", time: "3:40" },
	{ kind: "sleep", color: "#6155f5", label: "Back asleep", time: "4:05" },
	{ kind: "bottle", color: "#0088ff", label: "Bottle", who: "dad", time: "5:30 · 90 ml" },
	{ kind: "sleep", color: "#6155f5", label: "Nap", time: "5:55 · 1h 05m" },
	{ kind: "sun", color: "#ff8d28", label: "Good morning", time: "7:00" },
] as const;

export type FinnKind = (typeof FINN_LOG)[number]["kind"];

/** Notifications in the style of DGymBook's owner app. */
export const GYM_CHECKINS = [
	{ title: "Checked in", detail: "Priya S. · #DGYM118", meta: "6:02 am", tone: "blue" },
	{ title: "Spin class full", detail: "20 of 20 booked", meta: "7:00 am", tone: "amber" },
	{ title: "Membership renewed", detail: "Ali O. · 12 months", meta: "₹18,000", tone: "green" },
	{ title: "Leg day booked", detail: "Rahul K. · 6:30 pm", meta: "2m ago", tone: "blue" },
] as const;

export const GYM_STATS = [
	{ label: "Checked in today", to: 186, tone: "blue" },
	{ label: "Expiring in 10 days", to: 52, tone: "red" },
	{ label: "Classes booked", to: 34, tone: "blue" },
] as const;

/** Attendance per day, as a share of the busiest day. */
export const GYM_WEEK = [
	{ day: "M", value: 0.86 },
	{ day: "T", value: 0.68 },
	{ day: "W", value: 0.94 },
	{ day: "T", value: 0.72 },
	{ day: "F", value: 1 },
	{ day: "S", value: 0.58 },
	{ day: "S", value: 0.4 },
] as const;

export const TOYS = [
	{ href: "/racer", name: "racer", note: "procedural tracks, rude AI drivers", art: "racer", x: 3, y: 8, tilt: -5 },
	{ href: "/doom", name: "doom-ish", note: "raycast walls, synth noises", art: "doom", x: 27, y: 34, tilt: 4 },
	{ href: "/adventure", name: "hollowreach", note: "an AI dungeon master that remembers", art: "adventure", x: 51, y: 6, tilt: -3 },
	{ href: "/os", name: "sehalOS", note: "a tiny desktop, with windows", art: "os", x: 75, y: 30, tilt: 6 },
	{ href: "/editor", name: "draftroom", note: "notebook with paper personality", art: "editor", x: 8, y: 60, tilt: 3 },
	{ href: "/terminal", name: "terminal", note: "this site, as a command line", art: "terminal", x: 56, y: 62, tilt: -6 },
] as const;

export type ToyArt = (typeof TOYS)[number]["art"];
