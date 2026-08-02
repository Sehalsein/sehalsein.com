import type { RaceSetup } from "./ui/Menu";

/**
 * Per-track personal bests, kept in localStorage.
 *
 * The key is the *track recipe* only (seed + biome + length + difficulty +
 * style) — deliberately not the car or the mode, so a lap set in the Zip Kart
 * during a time trial is still the record to beat in a full race.
 */

const STORAGE_KEY = "iso-racer:records:v1";

export interface TrackRecord {
	bestLapMs: number | null;
	/** Best full-race time, when the track has been raced to the flag. */
	bestTotalMs: number | null;
	/** Best finishing position across attempts (1 = won). */
	bestPosition: number | null;
}

type RecordMap = Record<string, TrackRecord>;

export function trackKey(setup: RaceSetup): string {
	return [setup.seed, setup.biome, setup.lengthKm, setup.difficulty, setup.style].join("|");
}

/** localStorage can throw (private mode, disabled storage) — never fatal. */
function readAll(): RecordMap {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as RecordMap) : {};
	} catch {
		return {};
	}
}

export function loadRecord(key: string): TrackRecord | null {
	return readAll()[key] ?? null;
}

/** Merge a result into the stored record and return the merged record. */
export function saveRecord(
	key: string,
	result: { lapMs?: number | null; totalMs?: number | null; position?: number | null },
): TrackRecord {
	const all = readAll();
	const previous = all[key];
	const merged: TrackRecord = {
		bestLapMs: bestOf(previous?.bestLapMs, result.lapMs),
		bestTotalMs: bestOf(previous?.bestTotalMs, result.totalMs),
		bestPosition: bestOf(previous?.bestPosition, result.position),
	};
	all[key] = merged;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
	} catch {
		// storage full or blocked — the record just doesn't persist
	}
	return merged;
}

function bestOf(a: number | null | undefined, b: number | null | undefined): number | null {
	const values = [a, b].filter((v): v is number => typeof v === "number" && Number.isFinite(v));
	return values.length ? Math.min(...values) : null;
}
