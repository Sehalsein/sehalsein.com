import { Vector3 } from "three";
import { STATION_LIST } from "../stations";

/** the world is a WORLD_SIZE × WORLD_SIZE plane centered on the origin */
export const WORLD_SIZE = 260;
export const WORLD_HALF = WORLD_SIZE / 2;

/** anything past here respawns */
export const WORLD_BOUND = 120;

/** the sea surface; the riverbed is carved below it */
export const WATER_Y = -0.8;

/* deterministic lattice hash → value noise, stable between visits */
function lhash(ix: number, iz: number): number {
	let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** smooth value noise in [-1, 1] */
export function noise2(x: number, z: number): number {
	const ix = Math.floor(x);
	const iz = Math.floor(z);
	const fx = x - ix;
	const fz = z - iz;
	const sx = fx * fx * (3 - 2 * fx);
	const sz = fz * fz * (3 - 2 * fz);
	const a = lhash(ix, iz);
	const b = lhash(ix + 1, iz);
	const c = lhash(ix, iz + 1);
	const d = lhash(ix + 1, iz + 1);
	return (a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz) * 2 - 1;
}

function smoothstep(e0: number, e1: number, x: number): number {
	const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
	return t * t * (3 - 2 * t);
}

/* ── landforms: broad highlands that the terracing cuts into rings ── */

export type Dome = { x: number; z: number; r: number; h: number };

export const DOMES: Dome[] = [
	{ x: 55, z: -48, r: 55, h: 11 }, // NE highland — resume on the top terrace
	{ x: -35, z: 52, r: 40, h: 7 }, // north hill — the now viewpoint
	{ x: -45, z: -25, r: 38, h: 4.2 }, // west rise — the arcade grove
];

function domeHeight(x: number, z: number): number {
	let h = 0;
	for (const m of DOMES) {
		const t = Math.hypot(x - m.x, z - m.z) / m.r;
		if (t < 1) h += m.h * ((Math.cos(t * Math.PI) + 1) / 2);
	}
	return h;
}

/** long flat shelves with quick cliff rises between them */
const TERRACE_STEP = 3.4;
function terrace(h: number): number {
	const t = h / TERRACE_STEP;
	const f = t - Math.floor(t);
	return (Math.floor(t) + smoothstep(0.6, 0.95, f)) * TERRACE_STEP;
}

/* ── polylines: the journey roads and the river ─────────────────── */

export type Road = { pts: [number, number][] };

function distToPolyline(x: number, z: number, pts: [number, number][]): number {
	let min = Infinity;
	for (let i = 0; i < pts.length - 1; i++) {
		const [ax, az] = pts[i];
		const [bx, bz] = pts[i + 1];
		const dx = bx - ax;
		const dz = bz - az;
		const len2 = dx * dx + dz * dz || 1;
		const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
		min = Math.min(min, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
	}
	return min;
}

function spiralPts(
	cx: number,
	cz: number,
	r0: number,
	r1: number,
	phi0: number,
	turns: number,
	steps: number,
): [number, number][] {
	const pts: [number, number][] = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const r = r0 + (r1 - r0) * t;
		const phi = phi0 + turns * Math.PI * 2 * t;
		pts.push([cx + Math.cos(phi) * r, cz + Math.sin(phi) * r]);
	}
	return pts;
}

/**
 * The river: from a spring pool in the north meadow, winding south
 * between home and the highland, out to the sea.
 */
export const RIVER: [number, number][] = [
	[-18, 38],
	[-8, 28],
	[-2, 18],
	[6, 12],
	[10, 2],
	[10, -10],
	[14, -22],
	[22, -40],
	[30, -62],
	[40, -88],
];

/** where roads cross the river, the carve relaxes into a shallow ford */
export const FORDS: [number, number][] = [
	[12.5, -17.5], // the village road
	[8.3, 10.3], // the guestbook road
];

export function distToRiver(x: number, z: number): number {
	return distToPolyline(x, z, RIVER);
}

/**
 * Winding journey roads. One loop home → guestbook (east village) → now
 * (north hill) → snake (west grove) → home, plus the spur over the ford
 * to the base-camp village and up the highland terraces to the summit.
 */
export const ROADS: Road[] = [
	// home → ford → base-camp village → switchbacks to the summit (resume)
	{
		pts: [
			[2, -5],
			[5, -9],
			[9, -15],
			[16, -20],
			[26, -26],
			[34, -32],
			[42, -40],
			...spiralPts(55, -48, 24, 3, Math.atan2(8, -13), 1.2, 16),
			[55, -46],
		],
	},
	// home → west rise → arcade grove (snake)
	{ pts: [[-3, 2], [-12, 5], [-22, 2], [-32, -8], [-40, -16], [-45, -25]] },
	// grove → north along the west coast → viewpoint hill (now)
	{ pts: [[-45, -25], [-52, -6], [-50, 14], [-44, 30], [-35, 52]] },
	// viewpoint → spring pool → guestbook
	{ pts: [[-35, 52], [-24, 46], [-18, 38], [-6, 34], [8, 36], [18, 38], [25, 38]] },
	// guestbook → ford → home, closing the loop
	{ pts: [[25, 38], [20, 26], [14, 16], [8, 10], [4, 8], [-3, 2]] },
];

/**
 * Spots that must stay free of rolling detail and scatter: the home
 * meadow, the journey POIs, and a level pad at each station.
 */
export const CLEARINGS: [number, number, number][] = [
	[0, 0, 2.2], // spawn
	[-4.2, 1.4, 2.6], // pond
	[-1.2, 1.6, 2.6], // name text
	[0.6, 2.6, 2.2],
	[34, -32, 13], // base-camp village under the highland
	[-18, 38, 4], // spring pool
	[17, 20, 5], // farm
	[-30, -12, 4], // campsite
	[-52.5, 14, 4], // bus stop
	...STATION_LIST.map(
		(s) => [s.map[0], s.map[1], 6] as [number, number, number],
	),
];

/**
 * Level building pads, snapped to the nearest full terrace so nothing
 * sits tilted on a cliff rise: every station plus the village, the farm,
 * the campsite and the bus stop.
 */
const PADS = [
	...STATION_LIST.map((s) => ({ x: s.map[0], z: s.map[1], r0: 6, r1: 14 })),
	{ x: 34, z: -32, r0: 13, r1: 20 }, // base-camp village
	{ x: 17, z: 20, r0: 5, r1: 10 }, // farm
	{ x: -30, z: -12, r0: 4, r1: 8 }, // campsite
	{ x: -52.5, z: 14, r0: 4, r1: 8 }, // bus stop
].map((p) => ({
	...p,
	level: Math.round(domeHeight(p.x, p.z) / TERRACE_STEP) * TERRACE_STEP,
}));

/**
 * The landscape with no roads in it: terraced highlands, the coast
 * falling into the sea, the carved river, level building pads.
 */
function rawHeight(x: number, z: number): number {
	const base = domeHeight(x, z) + noise2(x * 0.014 + 31, z * 0.014 + 17) * 1.1;
	let h = terrace(base);

	// the island falls away into the sea past a noisy coastline
	const coast = 92 + noise2(x * 0.045 + 9, z * 0.045 + 9) * 9;
	h = -5 + (h + 5) * (1 - smoothstep(coast - 14, coast, Math.hypot(x, z)));

	// level pads where anything is built
	for (const p of PADS) {
		const t = smoothstep(p.r0, p.r1, Math.hypot(x - p.x, z - p.z));
		h = h * t + p.level * (1 - t);
	}

	// the river carves below the water line, except at the fords — last,
	// so no pad can fill in a pool that a station sits beside
	let carve = 1 - smoothstep(2.2, 4.6, distToRiver(x, z));
	for (const [fx, fz] of FORDS) {
		carve *= smoothstep(3, 7, Math.hypot(x - fx, z - fz));
	}
	h += (-2.4 - h) * carve;
	return h;
}

/* ── road elevation profiles ─────────────────────────────────────────
 * Every road is sampled along its length and slope-limited in both
 * directions, so no road is ever steeper than MAX_GRADE or dips under
 * water. The terrain then blends toward the profile near the road —
 * cuttings through cliffs, embankments over dips, gentle ramps always. */

const PROFILE_STEP = 2;
const MAX_GRADE = 0.2;

type ProfilePt = { x: number; z: number; h: number };

const ROAD_PROFILES: ProfilePt[][] = ROADS.map((road) => {
	const pts: ProfilePt[] = [];
	for (let i = 0; i < road.pts.length - 1; i++) {
		const [ax, az] = road.pts[i];
		const [bx, bz] = road.pts[i + 1];
		const len = Math.hypot(bx - ax, bz - az);
		const steps = Math.max(1, Math.ceil(len / PROFILE_STEP));
		for (let s = 0; s < steps; s++) {
			const t = s / steps;
			pts.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, h: 0 });
		}
	}
	const last = road.pts[road.pts.length - 1];
	pts.push({ x: last[0], z: last[1], h: 0 });

	// target the raw landscape, but never below a dry bank
	for (const p of pts) p.h = Math.max(rawHeight(p.x, p.z), 0.35);
	// slope-limit in both directions until every grade is gentle
	for (let pass = 0; pass < 3; pass++) {
		for (let i = 1; i < pts.length; i++) {
			const ds = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
			pts[i].h = Math.min(pts[i].h, pts[i - 1].h + MAX_GRADE * ds);
		}
		for (let i = pts.length - 2; i >= 0; i--) {
			const ds = Math.hypot(pts[i].x - pts[i + 1].x, pts[i].z - pts[i + 1].z);
			pts[i].h = Math.min(pts[i].h, pts[i + 1].h + MAX_GRADE * ds);
		}
	}
	// soften kinks
	for (let i = 1; i < pts.length - 1; i++) {
		pts[i].h = (pts[i - 1].h + pts[i].h * 2 + pts[i + 1].h) / 4;
	}
	return pts;
});

/** distance to the nearest road and the road's height there */
export function roadInfo(x: number, z: number): { d: number; h: number } {
	let d = Infinity;
	let h = 0;
	for (const pts of ROAD_PROFILES) {
		for (let i = 0; i < pts.length - 1; i++) {
			const a = pts[i];
			const b = pts[i + 1];
			const dx = b.x - a.x;
			const dz = b.z - a.z;
			const len2 = dx * dx + dz * dz || 1;
			const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / len2));
			const dist = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
			if (dist < d) {
				d = dist;
				h = a.h + (b.h - a.h) * t;
			}
		}
	}
	return { d, h };
}

/** distance from a point to the nearest road centerline, in map units */
export function distToRoads(x: number, z: number): number {
	return roadInfo(x, z).d;
}

/** true if a point is far enough from roads, water and clearings for scatter */
export function clearOf(x: number, z: number, roadMargin = 1.8): boolean {
	if (distToRoads(x, z) < roadMargin) return false;
	if (distToRiver(x, z) < 4.2) return false;
	return CLEARINGS.every(([cx, cz, r]) => Math.hypot(x - cx, z - cz) > r);
}

/**
 * Single source of truth for ground height: the raw terraced island,
 * rolling detail in the wilds, and the slope-limited road profiles
 * blended in near every road. The visual mesh, the physics collider,
 * `poseAt`, and the car's nets all sample this — nothing else invents
 * a y.
 */
export function sampleHeight(x: number, z: number): number {
	const road = roadInfo(x, z);
	let h = rawHeight(x, z);

	// rolling detail in the wilds, calm near anything man-made or wet
	let mask = smoothstep(12, 20, Math.hypot(x, z));
	for (const [cx, cz, r] of CLEARINGS) {
		mask = Math.min(mask, smoothstep(r + 1.5, r + 7, Math.hypot(x - cx, z - cz)));
	}
	mask = Math.min(mask, smoothstep(3, 8, road.d));
	mask = Math.min(mask, smoothstep(3.5, 7.5, distToRiver(x, z)));
	const detail =
		noise2(x * 0.022, z * 0.022) * 2.4 + noise2(x * 0.07 + 53, z * 0.07 + 91) * 0.6;
	// hills rise freely but dips stay shallow — no accidental puddles
	h += (detail < 0 ? detail * 0.2 : detail) * mask;

	// the road wins near the road: gentle ramps, cuttings, embankments
	const w = 1 - smoothstep(2.4, 6.5, road.d);
	return h * (1 - w) + road.h * w;
}

/** approximate terrain normal from central differences */
export function sampleNormal(out: Vector3, x: number, z: number, eps = 0.6): Vector3 {
	const hl = sampleHeight(x - eps, z);
	const hr = sampleHeight(x + eps, z);
	const hd = sampleHeight(x, z - eps);
	const hu = sampleHeight(x, z + eps);
	return out.set(hl - hr, 2 * eps, hd - hu).normalize();
}
