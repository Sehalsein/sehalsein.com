import type { Rng } from "../../shared/rng";
import type { SpatialHash2D } from "../../shared/spatialHash";
import type { TerrainBuild } from "../terrain/heightfield";
import type { BiomeDef, BiomePropSpec, SceneryInstance } from "../types";

const MAX_INSTANCES = 4500;
/** Extra clearance beyond the road edge no prop may enter. */
const ROAD_KEEPOUT = 12;

/**
 * Stage: scenery. Rejection-sampled prop placement: uniform candidates over
 * the terrain, rejected near the road (keep-out) and outside bounds. Density
 * and prop mix are biome data; heights snap to the terrain sampler so nothing
 * floats or sinks.
 */
export function placeScenery(
	rng: Rng,
	terrain: TerrainBuild,
	roadHash: SpatialHash2D,
	roadHalfWidth: number,
	biome: BiomeDef,
): SceneryInstance[] {
	const { size } = terrain.data;
	const inset = 12;
	const usable = size - inset * 2;
	const areaK = (usable * usable) / 1000; // thousands of m²
	const target = Math.min(MAX_INSTANCES, Math.round(areaK * biome.props.density * 0.001 * 1000));

	const totalWeight = biome.props.specs.reduce((sum, s) => sum + s.weight, 0);
	const pickSpec = (): BiomePropSpec => {
		let r = rng.next() * totalWeight;
		for (const spec of biome.props.specs) {
			r -= spec.weight;
			if (r <= 0) return spec;
		}
		return biome.props.specs[biome.props.specs.length - 1];
	};

	const keepOut = roadHalfWidth + ROAD_KEEPOUT;
	const instances: SceneryInstance[] = [];
	const maxAttempts = target * 3;
	for (let attempt = 0; attempt < maxAttempts && instances.length < target; attempt++) {
		const x = terrain.originX + inset + rng.next() * usable;
		const z = terrain.originZ + inset + rng.next() * usable;
		// direct radius query — nearestDistSq's ring search starts at the hash
		// cell size, which can exceed keepOut and silently skip the check
		if (roadHash.query(x, z, keepOut).length > 0) continue;

		const spec = pickSpec();
		instances.push({
			kind: spec.kind,
			x,
			y: terrain.heightAt(x, z),
			z,
			rotY: rng.next() * Math.PI * 2,
			scale: rng.range(spec.minScale, spec.maxScale),
			tint: rng.int(0, biome.props.palette.length - 1),
		});
	}
	return instances;
}
