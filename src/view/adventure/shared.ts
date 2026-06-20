/* Hollowreach — shared types, D&D-style rules data, and the woodcut avatar
 * generator used by the /adventure game. Ported from a Claude Design import. */

export const STAT_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

/** The standard-array scores handed out at character creation. */
export const STAT_ARRAY = [15, 14, 13, 12, 10, 8];

export type ClassKey =
	| "Fighter"
	| "Ranger"
	| "Rogue"
	| "Wizard"
	| "Cleric"
	| "Bard";

export type Character = {
	name: string;
	class: ClassKey;
	background: string;
	level: number;
	xp: number;
	stats: Stats;
};

export type Enemy = { name: string; hp: number; maxHp: number };

export type LogEntry =
	| { kind: "gm"; text: string }
	| { kind: "player"; text: string }
	| { kind: "system"; text: string }
	| { kind: "loot"; text: string }
	| {
			kind: "dice";
			skill: string;
			ability: string;
			roll: number;
			mod: number;
			total: number;
			dc: number;
			success: boolean;
	  };

export type GMCheck = { skill: string; ability: string; dc: number };

/** The raw shape the Game Master model returns each turn. */
export type GMResponse = {
	narration?: string;
	location?: string;
	choices?: string[];
	check?: GMCheck | null;
	hpDelta?: number;
	addItems?: string[];
	removeItems?: string[];
	enemy?: Enemy | null;
	xpDelta?: number;
	status?: "playing" | "dead" | "victory";
};

/* ------------------------------------------------------------------ *
 *  Ability-score math
 * ------------------------------------------------------------------ */

export function mod(v: number): number {
	return Math.floor(((v || 10) - 10) / 2);
}
export function modStr(v: number): string {
	const m = mod(v);
	return (m >= 0 ? "+" : "") + m;
}
export function modColor(v: number): string {
	return mod(v) >= 0 ? "#2f7d3a" : "#b5482f";
}

/* ------------------------------------------------------------------ *
 *  Classes & backgrounds
 * ------------------------------------------------------------------ */

export const CLASSES: Record<
	ClassKey,
	{
		hpBase: number;
		primary: StatKey;
		tag: string;
		priority: StatKey[];
		items: string[];
		blurb: string;
	}
> = {
	Fighter: {
		hpBase: 12,
		primary: "STR",
		tag: "STR",
		priority: ["STR", "CON", "DEX", "WIS", "CHA", "INT"],
		items: [
			"Longsword",
			"Wooden shield",
			"Chain mail",
			"Adventurer’s pack",
			"Healing potion",
		],
		blurb: "Disciplined master of weapon and armor. Stands at the front and does not break.",
	},
	Ranger: {
		hpBase: 10,
		primary: "DEX",
		tag: "DEX",
		priority: ["DEX", "WIS", "CON", "STR", "INT", "CHA"],
		items: [
			"Shortbow",
			"Quiver (20 arrows)",
			"Two shortswords",
			"Leather armor",
			"Healing potion",
		],
		blurb: "Hunter of the wild marches. Tracks what others cannot even see.",
	},
	Rogue: {
		hpBase: 10,
		primary: "DEX",
		tag: "DEX",
		priority: ["DEX", "INT", "CON", "CHA", "WIS", "STR"],
		items: [
			"Two daggers",
			"Shortbow",
			"Thieves’ tools",
			"Leather armor",
			"Smoke bomb",
		],
		blurb: "A shadow with quick fingers and quicker instincts. Strikes where it hurts.",
	},
	Wizard: {
		hpBase: 8,
		primary: "INT",
		tag: "INT",
		priority: ["INT", "CON", "DEX", "WIS", "CHA", "STR"],
		items: [
			"Quarterstaff",
			"Spellbook",
			"Component pouch",
			"Scroll of Magic Missile",
			"Dagger",
		],
		blurb: "Scholar of the arcane. Bends the laws of the world to a memorized will.",
	},
	Cleric: {
		hpBase: 9,
		primary: "WIS",
		tag: "WIS",
		priority: ["WIS", "CON", "STR", "CHA", "INT", "DEX"],
		items: [
			"Mace",
			"Wooden shield",
			"Holy symbol",
			"Chain shirt",
			"Healing potion",
		],
		blurb: "Vessel of a watching god. Mends the faithful and smites the wicked.",
	},
	Bard: {
		hpBase: 9,
		primary: "CHA",
		tag: "CHA",
		priority: ["CHA", "DEX", "CON", "INT", "WIS", "STR"],
		items: ["Rapier", "Lute", "Dagger", "Leather armor", "Disguise kit"],
		blurb: "Silver-tongued wanderer. Talks past trouble — or sings it to sleep.",
	},
};

export const CLASS_KEYS = Object.keys(CLASSES) as ClassKey[];

export const BACKGROUNDS: { key: string; blurb: string }[] = [
	{ key: "Soldier", blurb: "You served in a company that no longer exists." },
	{ key: "Outlander", blurb: "Raised beyond the maps, at home in the wild." },
	{ key: "Sage", blurb: "Dust and candlelight in forgotten libraries." },
	{ key: "Criminal", blurb: "You know which doors are never truly locked." },
	{ key: "Acolyte", blurb: "You tended a shrine before the road called." },
	{ key: "Noble", blurb: "A name that still opens some gates." },
];

/* ------------------------------------------------------------------ *
 *  Woodcut portrait medallions — head-and-shoulders SVGs, per class.
 *  Rendered to a data URI and used as a CSS background image.
 * ------------------------------------------------------------------ */

type AvatarOpts = { bg?: string; ink?: string; accent?: string; frame?: string };

const SH = (ink: string) =>
	`<path fill="${ink}" d="M5 75 C7 58 19 50 40 50 C61 50 73 58 75 75 Z"/>`;

const AV: Record<string, (ink: string, bg: string, acc: string) => string> = {
	Fighter: (ink, bg, acc) =>
		SH(ink) +
		`<path fill="${ink}" d="M27 15 C32 10 48 10 53 15 C56 24 56 35 53 43 C51 50 45 53 40 53 C35 53 29 50 27 43 C24 35 24 24 27 15 Z"/>` +
		`<path fill="${bg}" d="M29 28 C34 26 46 26 51 28 L51 31 C46 33 34 33 29 31 Z"/>` +
		`<rect x="38.5" y="28" width="3" height="19" fill="${bg}"/>` +
		`<path fill="${acc}" d="M40 11 C35 3 41 -1 50 1 C45 5 44 8 43 12 Z"/>` +
		`<circle cx="35" cy="29.5" r="1.7" fill="${acc}"/><circle cx="45" cy="29.5" r="1.7" fill="${acc}"/>`,
	Ranger: (ink, bg, acc) =>
		`<path fill="${ink}" d="M3 75 C5 56 17 49 40 49 C63 49 75 56 77 75 Z"/>` +
		`<path fill="${ink}" d="M24 41 C20 22 30 9 40 9 C50 9 60 22 56 41 C54 48 48 53 40 53 C32 53 26 48 24 41 Z"/>` +
		`<path fill="${bg}" d="M32 31 C32 22 35 18 40 18 C45 18 48 22 48 31 C48 41 45 47 40 47 C35 47 32 41 32 31 Z"/>` +
		`<path fill="${ink}" d="M39.2 30 L40.8 30 L40.3 37 L39.7 37 Z"/>` +
		`<circle cx="36" cy="30" r="1.6" fill="${acc}"/><circle cx="44" cy="30" r="1.6" fill="${acc}"/>` +
		`<path fill="${acc}" d="M55 17 C64 11 66 2 63 -2 C55 4 52 11 52 18 Z"/>`,
	Rogue: (ink, bg, acc) =>
		SH(ink) +
		`<path fill="${ink}" d="M25 39 C22 20 30 9 40 9 C50 9 58 20 55 39 C53 47 48 53 40 53 C32 53 27 47 25 39 Z"/>` +
		`<path fill="${bg}" d="M26 26 C32 24 48 24 54 26 L54 31 C48 33 32 33 26 31 Z"/>` +
		`<circle cx="34" cy="28.5" r="1.8" fill="${acc}"/><circle cx="46" cy="28.5" r="1.8" fill="${acc}"/>`,
	Wizard: (ink, bg, acc) =>
		`<path fill="${ink}" d="M3 75 C7 57 19 52 40 52 C61 52 73 57 77 75 Z"/>` +
		`<path fill="${ink}" d="M40 2 C44 12 50 27 58 34 C48 37 32 37 22 34 C30 27 36 12 40 2 Z"/>` +
		`<path fill="${acc}" d="M40 19 l1.7 3.6 3.9 .4 -2.9 2.7 .8 3.9 -3.5 -2 -3.5 2 .8 -3.9 -2.9 -2.7 3.9 -.4 Z"/>` +
		`<path fill="${ink}" d="M30 41 C30 54 35 62 40 62 C45 62 50 54 50 41 C46 44 34 44 30 41 Z"/>` +
		`<circle cx="35" cy="39" r="1.6" fill="${acc}"/><circle cx="45" cy="39" r="1.6" fill="${acc}"/>`,
	Cleric: (ink, bg, acc) =>
		SH(ink) +
		`<circle cx="40" cy="13" r="10" fill="none" stroke="${acc}" stroke-width="2.4"/>` +
		`<path fill="${ink}" d="M26 41 C24 25 32 15 40 15 C48 15 56 25 54 41 C52 48 47 53 40 53 C33 53 28 48 26 41 Z"/>` +
		`<path fill="${bg}" d="M33 33 C33 25 36 21 40 21 C44 21 47 25 47 33 C47 42 44 47 40 47 C36 47 33 42 33 33 Z"/>` +
		`<circle cx="37" cy="33" r="1.5" fill="${acc}"/><circle cx="43" cy="33" r="1.5" fill="${acc}"/>`,
	Bard: (ink, bg, acc) =>
		SH(ink) +
		`<path fill="${ink}" d="M30 30 C30 45 34 52 40 52 C46 52 50 45 50 30 C50 22 46 18 40 18 C34 18 30 22 30 30 Z"/>` +
		`<path fill="${bg}" d="M33 31 C33 24 36 21 40 21 C44 21 47 24 47 31 C47 41 44 46 40 46 C36 46 33 41 33 31 Z"/>` +
		`<path fill="${ink}" d="M24 27 C24 19 31 14 40 14 C49 14 56 19 56 27 C56 32 49 34 40 34 C31 34 24 32 24 27 Z"/>` +
		`<circle cx="36" cy="31" r="1.6" fill="${acc}"/><circle cx="44" cy="31" r="1.6" fill="${acc}"/>` +
		`<path fill="${acc}" d="M53 22 C62 14 64 4 61 0 C53 6 49 15 49 23 Z"/>` +
		`<path fill="${acc}" d="M30 49 C34 45 46 45 50 49 C46 53 34 53 30 49 Z"/>`,
	Monster: (ink, bg, acc) =>
		`<path fill="${ink}" d="M5 75 C8 58 20 52 40 52 C60 52 72 58 75 75 Z"/>` +
		`<path fill="${ink}" d="M22 44 C18 27 28 16 40 16 C52 16 62 27 58 44 C56 50 48 54 40 54 C32 54 24 50 22 44 Z"/>` +
		`<path fill="${acc}" d="M27 20 C18 13 15 4 17 -1 C24 4 29 11 31 19 Z"/>` +
		`<path fill="${acc}" d="M53 20 C62 13 65 4 63 -1 C56 4 51 11 49 19 Z"/>` +
		`<path fill="${acc}" d="M28 33 L38 30 L36 37 L29 36 Z"/><path fill="${acc}" d="M52 33 L42 30 L44 37 L51 36 Z"/>` +
		`<path fill="${bg}" d="M33 44 L40 50 L47 44 C44 46 36 46 33 44 Z"/>` +
		`<path fill="${bg}" d="M35.5 44 L37 48 L33.5 45 Z"/><path fill="${bg}" d="M44.5 44 L43 48 L46.5 45 Z"/>`,
};

function shade(hex: string): string {
	try {
		const n = parseInt(hex.slice(1), 16);
		let r = (n >> 16) & 255,
			g = (n >> 8) & 255,
			b = n & 255;
		r = Math.round(r * 0.84);
		g = Math.round(g * 0.82);
		b = Math.round(b * 0.8);
		return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	} catch {
		return hex;
	}
}

function avatarSvg(key: string, o: AvatarOpts = {}): string {
	const bg = o.bg || "#ece5d6",
		ink = o.ink || "#1a1714",
		acc = o.accent || "#d23b22",
		frame = o.frame || "#1a1714";
	const body = (AV[key] || AV.Fighter)(ink, bg, acc);
	return (
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">' +
		'<defs><clipPath id="m"><circle cx="40" cy="40" r="38"/></clipPath>' +
		`<radialGradient id="g" cx="50%" cy="34%" r="70%"><stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="${shade(bg)}"/></radialGradient></defs>` +
		'<circle cx="40" cy="40" r="38" fill="url(#g)"/>' +
		`<g clip-path="url(#m)">${body}</g>` +
		`<circle cx="40" cy="40" r="37" fill="none" stroke="${frame}" stroke-width="2"/>` +
		"</svg>"
	);
}

export function avatarUri(key: string, o: AvatarOpts = {}): string {
	return "data:image/svg+xml," + encodeURIComponent(avatarSvg(key, o));
}

/* ------------------------------------------------------------------ *
 *  Parsing the GM's JSON turn (tolerant of code fences / stray prose)
 * ------------------------------------------------------------------ */

export function parseGM(raw: string): GMResponse | null {
	let t = String(raw || "").trim();
	t = t
		.replace(/^```(?:json)?/i, "")
		.replace(/```$/, "")
		.trim();
	const a = t.indexOf("{"),
		b = t.lastIndexOf("}");
	if (a >= 0 && b > a) t = t.slice(a, b + 1);
	try {
		return JSON.parse(t) as GMResponse;
	} catch {
		return null;
	}
}

/* ------------------------------------------------------------------ *
 *  Shared design tokens (parchment-on-ink, blackletter title)
 * ------------------------------------------------------------------ */
export const INK = "#1a1714";
export const BONE = "#ece5d6";
export const RED = "#d23b22";
export const GOLD = "#d4a84b";
export const PANEL = "#f4efe3";
export const DIM = "#7a7266";
export const FAINT = "#9a8f76";
export const PIRATA = "var(--font-pirata), 'Pirata One', serif";
export const SERIF = "var(--font-serif), 'Spectral', Georgia, serif";

/* ------------------------------------------------------------------ *
 *  Per-adventure persistence — each run lives under its own key so a
 *  player can leave (/adventure) and return to a specific /adventure/[id].
 * ------------------------------------------------------------------ */
export const SAVE_PREFIX = "hollowreach_save_v2:";

export type SavedRun = {
	char: Character;
	hp: number;
	maxHp: number;
	inventory: string[];
	log: LogEntry[];
	history: string[];
	choices: string[];
	enemy: Enemy | null;
	location: string;
	status: "playing" | "dead" | "victory";
	turn: number;
	updatedAt: number;
};

/** Lightweight row for the title screen's "your tales" list. */
export type SaveMeta = {
	id: string;
	name: string;
	classLine: string;
	location: string;
	level: number;
	turn: number;
	status: "playing" | "dead" | "victory";
	updatedAt: number;
};

export function newAdventureId(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
	}
	return Math.random().toString(36).slice(2, 12);
}

export function loadSave(id: string): SavedRun | null {
	if (typeof localStorage === "undefined") return null;
	try {
		const d = JSON.parse(localStorage.getItem(SAVE_PREFIX + id) || "null");
		return d && d.char ? (d as SavedRun) : null;
	} catch {
		return null;
	}
}

export function writeSave(id: string, run: Omit<SavedRun, "updatedAt">): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(
			SAVE_PREFIX + id,
			JSON.stringify({ ...run, updatedAt: Date.now() }),
		);
	} catch {
		/* storage full / unavailable */
	}
}

export function deleteSave(id: string): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.removeItem(SAVE_PREFIX + id);
	} catch {
		/* ignore */
	}
}

/** All saved adventures, newest first. */
export function listSaves(): SaveMeta[] {
	if (typeof localStorage === "undefined") return [];
	const out: SaveMeta[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key || !key.startsWith(SAVE_PREFIX)) continue;
		try {
			const d = JSON.parse(localStorage.getItem(key) || "null");
			if (!d || !d.char) continue;
			out.push({
				id: key.slice(SAVE_PREFIX.length),
				name: d.char.name || "Hero",
				classLine: `Level ${d.char.level} ${d.char.class} · ${d.char.background}`,
				location: d.location || "",
				level: d.char.level || 1,
				turn: d.turn || 0,
				status: d.status || "playing",
				updatedAt: d.updatedAt || 0,
			});
		} catch {
			/* skip corrupt entry */
		}
	}
	out.sort((a, b) => b.updatedAt - a.updatedAt);
	return out;
}
