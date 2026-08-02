import { clamp, smoothstep } from "../../shared/math";
import { type Rng, ValueNoise2D } from "../../shared/rng";
import type { SpatialHash2D } from "../../shared/spatialHash";
import type { BiomeDef, TerrainData, TrackSample } from "../types";

export interface TerrainBuild {
	data: TerrainData;
	/** World coordinates of the grid's min corner. */
	originX: number;
	originZ: number;
	cellSize: number;
	/** Bilinear height sampler in world space. */
	heightAt(x: number, z: number): number;
}

/** Radius (from road center) that is flattened to road level. */
export const ROAD_FLATTEN_RADIUS = 14;
/** Radius where terrain fully returns to its natural height. */
export const ROAD_BLEND_RADIUS = 58;
/**
 * How far under the road surface the flattened terrain sits. Small on purpose
 * — a big drop is what makes the ribbon read as a slab hovering over the
 * grass. The clamp pass below is what actually guarantees no poke-through.
 */
const ROAD_TERRAIN_CLEARANCE = 0.14;

/**
 * Stage: terrain. A square heightfield around the track: fbm noise hills,
 * smoothly flattened to road height near the racing surface so the road never
 * hangs in the air or tunnels through a hill unintentionally.
 */
export function generateTerrain(
	rng: Rng,
	samples: TrackSample[],
	biome: BiomeDef,
	roadHash: SpatialHash2D,
): TerrainBuild {
	// bounds of the track plus generous margin
	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minZ = Number.POSITIVE_INFINITY;
	let maxZ = Number.NEGATIVE_INFINITY;
	for (const s of samples) {
		minX = Math.min(minX, s.x);
		maxX = Math.max(maxX, s.x);
		minZ = Math.min(minZ, s.z);
		maxZ = Math.max(maxZ, s.z);
	}
	const margin = 230;
	const size = Math.max(maxX - minX, maxZ - minZ) + margin * 2;
	const originX = (minX + maxX) / 2 - size / 2;
	const originZ = (minZ + maxZ) / 2 - size / 2;

	const resolution = clamp(Math.ceil(size / 7) + 1, 96, 240);
	const cellSize = size / (resolution - 1);
	const heights = new Float32Array(resolution * resolution);

	const noise = new ValueNoise2D(rng);
	const freq = biome.terrain.noiseScale;
	const amplitude = biome.terrain.amplitude;

	for (let row = 0; row < resolution; row++) {
		for (let col = 0; col < resolution; col++) {
			const wx = originX + col * cellSize;
			const wz = originZ + row * cellSize;
			const natural = (noise.fbm(wx * freq + 31.7, wz * freq + 12.3, 4) - 0.45) * 2 * amplitude;

			// distance to nearest road sample (and its height) within blend range
			const near = roadHash.query(wx, wz, ROAD_BLEND_RADIUS);
			let blended = natural;
			if (near.length > 0) {
				let bestD2 = Number.POSITIVE_INFINITY;
				let roadY = 0;
				for (const i of near) {
					const dx = samples[i].x - wx;
					const dz = samples[i].z - wz;
					const d2 = dx * dx + dz * dz;
					if (d2 < bestD2) {
						bestD2 = d2;
						roadY = samples[i].y;
					}
				}
				const dist = Math.sqrt(bestD2);
				const t = smoothstep(ROAD_FLATTEN_RADIUS, ROAD_BLEND_RADIUS, dist);
				blended = (roadY - ROAD_TERRAIN_CLEARANCE) * (1 - t) + natural * t;
			}
			heights[row * resolution + col] = blended;
		}
	}

	/**
	 * Blending above uses each vertex's *nearest* sample, which is not enough
	 * on a slope: two neighbouring vertices can flatten to different road
	 * heights, and the terrain interpolated between them bulges up through the
	 * road. Clamping every vertex against *every* sample near it removes that
	 * by construction — a cell whose corners all sit below the road surface
	 * cannot cross it in between. Cheap: a few thousand comparisons.
	 */
	for (const s of samples) {
		// Reach just past the road edge by a cell and a half: that is exactly
		// the set of grid corners belonging to a cell the road crosses, and no
		// more. Going wider would drag the terrain beside an elevated section
		// down to the height of whatever else passes nearby (hairpins double
		// back within the flatten radius), digging a trench under the road.
		const radius = s.width / 2 + cellSize * 1.5;
		const minCol = Math.max(0, Math.floor((s.x - radius - originX) / cellSize));
		const maxCol = Math.min(resolution - 1, Math.ceil((s.x + radius - originX) / cellSize));
		const minRow = Math.max(0, Math.floor((s.z - radius - originZ) / cellSize));
		const maxRow = Math.min(resolution - 1, Math.ceil((s.z + radius - originZ) / cellSize));
		// A banked corner tilts about the centreline, so its lower edge sits
		// well below s.y. Clamp against the lowest point of the whole
		// cross-section or the terrain slices straight through that edge.
		const bankDrop = Math.abs(Math.sin(s.bank)) * (s.width / 2);
		const ceiling = s.y - bankDrop - ROAD_TERRAIN_CLEARANCE;
		for (let row = minRow; row <= maxRow; row++) {
			const wz = originZ + row * cellSize;
			for (let col = minCol; col <= maxCol; col++) {
				const wx = originX + col * cellSize;
				const dx = wx - s.x;
				const dz = wz - s.z;
				if (dx * dx + dz * dz > radius * radius) continue;
				const idx = row * resolution + col;
				if (heights[idx] > ceiling) heights[idx] = ceiling;
			}
		}
	}

	const heightAt = (x: number, z: number): number => {
		const fx = clamp((x - originX) / cellSize, 0, resolution - 1.001);
		const fz = clamp((z - originZ) / cellSize, 0, resolution - 1.001);
		const c0 = Math.floor(fx);
		const r0 = Math.floor(fz);
		const tx = fx - c0;
		const tz = fz - r0;
		const h00 = heights[r0 * resolution + c0];
		const h01 = heights[r0 * resolution + c0 + 1];
		const h10 = heights[(r0 + 1) * resolution + c0];
		const h11 = heights[(r0 + 1) * resolution + c0 + 1];
		return (h00 * (1 - tx) + h01 * tx) * (1 - tz) + (h10 * (1 - tx) + h11 * tx) * tz;
	};

	return { data: { size, resolution, heights }, originX, originZ, cellSize, heightAt };
}
