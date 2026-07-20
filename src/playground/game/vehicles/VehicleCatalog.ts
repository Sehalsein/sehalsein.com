import type { VehicleStats } from "../../engine/physics/RaycastVehicle";
import roadster from "../../data/vehicles/roadster.json";
import muscle from "../../data/vehicles/muscle.json";
import zip from "../../data/vehicles/zip.json";

export interface VehicleConfig {
	id: string;
	name: string;
	description: string;
	colors: { body: string; accent: string; cabin: string };
	stats: VehicleStats;
}

/**
 * Data-driven vehicle registry. Adding a vehicle = new JSON file + one line
 * here; no vehicle-specific logic exists anywhere in code.
 */
const CATALOG: VehicleConfig[] = [roadster, muscle, zip];

export function allVehicles(): VehicleConfig[] {
	return CATALOG;
}

export function getVehicle(id: string): VehicleConfig {
	const config = CATALOG.find((v) => v.id === id);
	if (!config) throw new Error(`Unknown vehicle: ${id}`);
	return config;
}
