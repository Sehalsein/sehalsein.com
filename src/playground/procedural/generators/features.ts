import { type Vec2, mod } from "../../shared/math";
import type { Checkpoint, MinimapData, SpawnPoint, TrackSample } from "../types";

/**
 * Stage: checkpoints. Evenly spaced gates around the loop; checkpoint 0 is the
 * start/finish line. Lap logic and wrong-way detection key off these.
 */
export function generateCheckpoints(samples: TrackSample[], ds: number): Checkpoint[] {
	const length = samples.length * ds;
	const count = Math.min(24, Math.max(8, Math.round(length / 400)));
	const checkpoints: Checkpoint[] = [];
	for (let i = 0; i < count; i++) {
		const sampleIndex = Math.round((i / count) * samples.length) % samples.length;
		const s = samples[sampleIndex];
		checkpoints.push({
			index: i,
			sampleIndex,
			x: s.x,
			y: s.y,
			z: s.z,
			tx: s.tx,
			tz: s.tz,
			halfWidth: s.width / 2 + 3,
		});
	}
	return checkpoints;
}

/**
 * Stage: spawn grid. Two staggered columns behind the start line, aligned to
 * the road tangent, every slot verified to sit on the road surface.
 */
export function generateSpawns(samples: TrackSample[], ds: number, slots: number): SpawnPoint[] {
	const spawns: SpawnPoint[] = [];
	const count = samples.length;
	for (let slot = 0; slot < slots; slot++) {
		const row = Math.floor(slot / 2);
		const column = slot % 2 === 0 ? -1 : 1;
		// first row starts 8m behind the line, rows every 8m, columns staggered 4m
		const back = 8 + row * 8 + (column === 1 ? 4 : 0);
		const sampleIndex = mod(-Math.round(back / ds), count);
		const s = samples[sampleIndex];
		const nx = s.tz;
		const nz = -s.tx;
		const lateral = column * Math.min(s.width * 0.22, 2.6);
		spawns.push({
			x: s.x + nx * lateral,
			y: s.y + 0.8,
			z: s.z + nz * lateral,
			yaw: Math.atan2(s.tx, s.tz),
			gridSlot: slot,
		});
	}
	return spawns;
}

/** Stage: minimap. Downsampled outline + bounds for the HUD canvas. */
export function generateMinimap(samples: TrackSample[]): MinimapData {
	const stride = Math.max(1, Math.floor(samples.length / 220));
	const points: Vec2[] = [];
	for (let i = 0; i < samples.length; i += stride) {
		points.push({ x: samples[i].x, y: samples[i].z });
	}
	const min = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY };
	const max = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY };
	for (const p of points) {
		min.x = Math.min(min.x, p.x);
		min.y = Math.min(min.y, p.y);
		max.x = Math.max(max.x, p.x);
		max.y = Math.max(max.y, p.y);
	}
	return { points, min, max, startIndex: 0 };
}
