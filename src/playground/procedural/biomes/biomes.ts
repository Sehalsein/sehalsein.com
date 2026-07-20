import type { BiomeDef, BiomeId } from "../types";
import forest from "../../data/biomes/forest.json";
import desert from "../../data/biomes/desert.json";
import snow from "../../data/biomes/snow.json";

/**
 * Biome registry. Adding a biome = drop a JSON file in data/biomes and list it
 * here; terrain, lighting, props and road styling all follow from the data.
 */
const REGISTRY: Record<BiomeId, BiomeDef> = {
	forest: forest as BiomeDef,
	desert: desert as BiomeDef,
	snow: snow as BiomeDef,
};

export const BIOME_IDS = Object.keys(REGISTRY) as BiomeId[];

export function getBiome(id: BiomeId): BiomeDef {
	const biome = REGISTRY[id];
	if (!biome) throw new Error(`Unknown biome: ${id}`);
	return biome;
}
