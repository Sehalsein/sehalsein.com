import type { VehicleStats } from "../../engine/physics/RaycastVehicle";
import type { Rng } from "../../shared/rng";
import liveries from "../../data/vehicles/liveries.json";
import roadster from "../../data/vehicles/roadster.json";
import muscle from "../../data/vehicles/muscle.json";
import zip from "../../data/vehicles/zip.json";
import wedge from "../../data/vehicles/wedge.json";
import formula from "../../data/vehicles/formula.json";
import hauler from "../../data/vehicles/hauler.json";

/** Body shapes built by the mesh factory — one distinct silhouette each. */
export type SilhouetteId = "roadster" | "muscle" | "kart" | "wedge" | "formula" | "pickup";

export interface VehicleColors {
	body: string;
	accent: string;
	cabin: string;
}

/** A paint scheme. Any livery can be applied to any vehicle. */
export interface Livery extends VehicleColors {
	id: string;
	name: string;
}

export interface VehicleConfig {
	id: string;
	name: string;
	description: string;
	silhouette: SilhouetteId;
	defaultLivery: string;
	stats: VehicleStats;
}

/**
 * Data-driven vehicle registry. Adding a vehicle = new JSON file + one line
 * here; the only vehicle-specific code is its silhouette builder in
 * VehicleMeshFactory. Paint is orthogonal — every car can wear every livery.
 */
const CATALOG: VehicleConfig[] = [roadster, wedge, muscle, hauler, zip, formula] as VehicleConfig[];
const LIVERIES: Livery[] = liveries;

export function allVehicles(): VehicleConfig[] {
	return CATALOG;
}

export function getVehicle(id: string): VehicleConfig {
	const config = CATALOG.find((v) => v.id === id);
	if (!config) throw new Error(`Unknown vehicle: ${id}`);
	return config;
}

export function allLiveries(): Livery[] {
	return LIVERIES;
}

/** Falls back to the vehicle's own default, so old links never break. */
export function getLivery(id: string | null | undefined, config: VehicleConfig): Livery {
	return (
		LIVERIES.find((l) => l.id === id) ?? LIVERIES.find((l) => l.id === config.defaultLivery) ?? LIVERIES[0]
	);
}

/** A livery for an AI car, kept off whatever the player is wearing. */
export function randomLivery(rng: Rng, exclude?: string): Livery {
	const pool = LIVERIES.filter((l) => l.id !== exclude);
	return pool[rng.int(0, pool.length - 1)];
}
