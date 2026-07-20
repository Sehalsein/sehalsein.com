import type { BiomeId, TrackDifficulty, TrackStyle } from "../procedural/types";
import type { RaceSetup } from "./ui/Menu";
import type { RaceMode } from "./systems/RaceSystem";
import { allVehicles } from "./vehicles/VehicleCatalog";
import { BIOME_IDS } from "../procedural/biomes/biomes";

/**
 * Every run has a shareable URL: /playground/<seed>?biome=…&mode=…
 * Same URL → same track, same AI field. Unknown/invalid params fall back to
 * sensible defaults so old or hand-edited links always still load a race.
 */

const MODES: RaceMode[] = ["race", "timetrial", "practice"];
const DIFFICULTIES: TrackDifficulty[] = ["easy", "medium", "hard"];
const STYLES: TrackStyle[] = ["fast", "balanced", "technical"];

export function sanitizeSeed(raw: string): string {
	const seed = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
	return seed.length > 0 ? seed : "GP1";
}

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Parse a race setup from the current location; null on the bare /playground. */
export function parseRunFromLocation(location: Location): RaceSetup | null {
	const match = location.pathname.match(/^\/playground\/([^/]+)\/?$/);
	if (!match) return null;
	const params = new URLSearchParams(location.search);
	const vehicles = allVehicles();
	const vehicleId = params.get("vehicle");
	// missing params must fall back to defaults, not to Number(null) === 0
	const num = (name: string, fallback: number, min: number, max: number): number => {
		const raw = params.get(name);
		const value = raw === null || raw === "" ? Number.NaN : Number(raw);
		return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
	};
	return {
		seed: sanitizeSeed(decodeURIComponent(match[1])),
		mode: pick(params.get("mode"), MODES, "race"),
		biome: pick(params.get("biome"), BIOME_IDS as readonly BiomeId[], "forest"),
		difficulty: pick(params.get("difficulty"), DIFFICULTIES, "medium"),
		style: pick(params.get("style"), STYLES, "balanced"),
		lengthKm: num("length", 4, 2, 8),
		vehicleId: vehicles.some((v) => v.id === vehicleId) ? (vehicleId as string) : vehicles[0].id,
		aiCount: Math.round(num("ai", 5, 0, 7)),
	};
}

export function runUrl(setup: RaceSetup): string {
	const params = new URLSearchParams({
		mode: setup.mode,
		biome: setup.biome,
		difficulty: setup.difficulty,
		style: setup.style,
		length: String(setup.lengthKm),
		vehicle: setup.vehicleId,
		ai: String(setup.aiCount),
	});
	return `/playground/${encodeURIComponent(setup.seed)}?${params.toString()}`;
}
