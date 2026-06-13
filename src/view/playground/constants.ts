import { sampleHeight } from "./terrain/height";
import { type Station, STATION_LIST, STATIONS } from "./stations";

export type { Station, StationId } from "./stations";
export { STATION_LIST, STATIONS } from "./stations";

export type VehicleKind = "car";

export type Pose = {
	position: [number, number, number];
	rotation: [number, number, number];
};

/**
 * World pose for an object standing on the terrain at map coords, optionally
 * offset by a local-space vector (rotated by yaw; y = up off the ground).
 * The ground height is sampled at the offset position, so things lean into
 * the terrain instead of hovering beside it.
 */
export function poseAt(
	mapX: number,
	mapZ: number,
	yaw = 0,
	local: [number, number, number] = [0, 0, 0],
): Pose {
	const s = Math.sin(yaw);
	const c = Math.cos(yaw);
	const x = mapX + local[0] * c + local[2] * s;
	const z = mapZ - local[0] * s + local[2] * c;
	return {
		position: [x, sampleHeight(x, z) + local[1], z],
		rotation: [0, yaw, 0],
	};
}

/** transitional alias — the world used to be a sphere */
export { poseAt as poseOnGlobe };

/** static world pose of each station (group origin at the surface) */
export const STATION_POSES = Object.fromEntries(
	STATION_LIST.map((s) => [s.id, poseAt(s.map[0], s.map[1], s.yaw)]),
) as Record<Station["id"], Pose>;

/** Camera pose looking straight at a station's interactive surface. */
export function stationView(s: Station): {
	cam: [number, number, number];
	target: [number, number, number];
} {
	const fx = Math.sin(s.yaw);
	const fz = Math.cos(s.yaw);
	const base = poseAt(s.map[0], s.map[1]).position;
	const target: [number, number, number] = [
		base[0] + fx * s.surface.forward,
		base[1] + s.surface.up,
		base[2] + fz * s.surface.forward,
	];
	const cam: [number, number, number] = [
		target[0] + fx * s.viewDist,
		target[1] + 0.08,
		target[2] + fz * s.viewDist,
	];
	return { cam, target };
}

export const HOME_VIEW = {
	cam: [11, 8, 12] as [number, number, number],
	target: [0, 0.5, 0] as [number, number, number],
};
