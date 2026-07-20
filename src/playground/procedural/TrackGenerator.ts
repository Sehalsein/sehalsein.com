import { TAU, type Vec2 } from "../shared/math";
import { Rng } from "../shared/rng";
import { SpatialHash2D } from "../shared/spatialHash";
import { getBiome } from "./biomes/biomes";
import { generateControlPoints, optimizeControlPoints } from "./generators/controlPoints";
import { generateBanking, generateElevation } from "./generators/elevation";
import { generateCheckpoints, generateMinimap, generateSpawns } from "./generators/features";
import { generateRacingLine } from "./generators/racingLine";
import { minSelfClearance, relaxCurvature, sampleClosedSpline } from "./generators/spline";
import { generateTerrain, type TerrainBuild } from "./terrain/heightfield";
import { placeScenery } from "./decorators/scenery";
import { validateTrack } from "./validation/TrackValidator";
import type { StageProfileEntry, TrackData, TrackDifficulty, TrackParams, TrackSample, TrackStyle } from "./types";

/** Uniform spacing of the resampled center spline (m). */
const SAMPLE_DS = 4;
const LAYOUT_ATTEMPTS = 12;
const FULL_ATTEMPTS = 3;

interface DifficultyConfig {
	minTurnRadius: number;
	roadWidth: number;
	maxGrade: number;
	maxLateralG: number;
}

const DIFFICULTY: Record<TrackDifficulty, DifficultyConfig> = {
	easy: { minTurnRadius: 30, roadWidth: 13, maxGrade: 0.05, maxLateralG: 1.15 },
	medium: { minTurnRadius: 21, roadWidth: 11, maxGrade: 0.065, maxLateralG: 1.35 },
	hard: { minTurnRadius: 16, roadWidth: 9.5, maxGrade: 0.08, maxLateralG: 1.55 },
};

const STYLE_TOP_SPEED: Record<TrackStyle, number> = {
	fast: 56,
	balanced: 49,
	technical: 43,
};

export interface GenerateOptions {
	/** Spawn slots to generate (player + AI). */
	gridSlots?: number;
}

/**
 * The complete deterministic pipeline: same params (including seed) always
 * produce the identical track — required for shareable seeds and future
 * multiplayer. Layout stages retry with forked sub-seeds when validation
 * fails, so one bad roll never rebuilds the stages that already succeeded.
 */
export function generateTrack(params: TrackParams, options: GenerateOptions = {}): { track: TrackData; terrainBuild: TerrainBuild } {
	let lastResult: { track: TrackData; terrainBuild: TerrainBuild } | null = null;
	for (let fullAttempt = 0; fullAttempt < FULL_ATTEMPTS; fullAttempt++) {
		const seed = fullAttempt === 0 ? params.seed : `${params.seed}#retry${fullAttempt}`;
		const result = generateOnce({ ...params, seed }, params, options);
		if (result.track.validation.valid) return result;
		lastResult = result;
	}
	// all attempts had validation errors — surface the last with its report
	if (!lastResult) throw new Error("Track generation failed to produce any result");
	return lastResult;
}

function generateOnce(
	effective: TrackParams,
	original: TrackParams,
	options: GenerateOptions,
): { track: TrackData; terrainBuild: TerrainBuild } {
	const profile: StageProfileEntry[] = [];
	const stage = <T>(name: string, attempts: number, fn: () => T): T => {
		const start = performance.now();
		const result = fn();
		profile.push({ stage: name, ms: performance.now() - start, attempts });
		return result;
	};

	const root = new Rng(effective.seed);
	const config = DIFFICULTY[effective.difficulty];
	const maxCurvature = 1 / config.minTurnRadius;
	const lengthM = Math.max(1500, Math.min(9000, effective.lengthKm * 1000));

	const biome = stage("selectBiome", 1, () => getBiome(effective.biome));
	const name = root.fork("name").pick(biome.trackNames);

	// --- layout: control points → spline → curvature relaxation → clearance ---
	let loop: ReturnType<typeof sampleClosedSpline> | null = null;
	let bestNearMiss: { loop: ReturnType<typeof sampleClosedSpline>; worst: number } | null = null;
	let layoutAttempts = 0;
	const layoutStart = performance.now();
	for (let attempt = 0; attempt < LAYOUT_ATTEMPTS; attempt++) {
		layoutAttempts = attempt + 1;
		const rng = root.fork(`layout:${attempt}`);
		let points = generateControlPoints(rng, lengthM, effective.style, effective.difficulty);
		points = optimizeControlPoints(points, lengthM);
		// measure the loop once, then scale control points so the final spline
		// actually delivers the requested length
		const measured = sampleClosedSpline(points, SAMPLE_DS);
		const lengthScale = lengthM / measured.length;
		points = points.map((p) => ({ x: p.x * lengthScale, y: p.y * lengthScale }));
		const candidate = sampleClosedSpline(points, SAMPLE_DS);
		const worst = relaxCurvature(candidate, maxCurvature, 80);
		const clearance = minSelfClearance(candidate, 70);
		if (clearance < config.roadWidth * 1.6) continue;
		if (worst > maxCurvature * 1.05) {
			// remember the closest miss — better than falling back to an oval
			if (!bestNearMiss || worst < bestNearMiss.worst) bestNearMiss = { loop: candidate, worst };
			continue;
		}
		loop = candidate;
		break;
	}
	if (!loop && bestNearMiss) {
		// give the closest candidate one long extra relaxation before giving up
		const worst = relaxCurvature(bestNearMiss.loop, maxCurvature, 250);
		if (worst <= maxCurvature * 1.1) loop = bestNearMiss.loop;
	}
	if (!loop) {
		// deterministic last resort: a stadium oval always validates
		const fallback: Vec2[] = [];
		const r = lengthM / TAU;
		for (let i = 0; i < 14; i++) {
			const a = (i / 14) * TAU;
			fallback.push({ x: Math.cos(a) * r * 1.25, y: Math.sin(a) * r * 0.75 });
		}
		loop = sampleClosedSpline(fallback, SAMPLE_DS);
		relaxCurvature(loop, maxCurvature);
	}
	profile.push({ stage: "layout", ms: performance.now() - layoutStart, attempts: layoutAttempts });
	const centerLoop = loop;

	// --- vertical profile ---
	const amplitude = Math.min(biome.terrain.amplitude * 0.5, 9);
	const ys = stage("elevation", 1, () => generateElevation(root.fork("elevation"), centerLoop, amplitude, config.maxGrade));
	const banks = stage("banking", 1, () => generateBanking(centerLoop));

	// --- assemble samples ---
	const samples: TrackSample[] = [];
	for (let i = 0; i < centerLoop.count; i++) {
		samples.push({
			x: centerLoop.xs[i],
			y: ys[i],
			z: centerLoop.zs[i],
			tx: centerLoop.txs[i],
			tz: centerLoop.tzs[i],
			curvature: centerLoop.curvature[i],
			bank: banks[i],
			width: config.roadWidth,
			s: i * centerLoop.ds,
		});
	}

	const roadHash = new SpatialHash2D(centerLoop.xs, centerLoop.zs, 24);

	// --- world around the road ---
	const terrainBuild = stage("terrain", 1, () => generateTerrain(root.fork("terrain"), samples, biome, roadHash));
	const scenery = stage("scenery", 1, () =>
		placeScenery(root.fork("scenery"), terrainBuild, roadHash, config.roadWidth / 2, biome),
	);

	// --- race furniture ---
	const checkpoints = stage("checkpoints", 1, () => generateCheckpoints(samples, centerLoop.ds));
	const spawns = stage("spawns", 1, () => generateSpawns(samples, centerLoop.ds, options.gridSlots ?? 8));
	const racingLine = stage("racingLine", 1, () =>
		generateRacingLine(samples, centerLoop.ds, {
			maxLateralG: config.maxLateralG,
			brakeDecel: 16,
			accel: 12,
			topSpeed: STYLE_TOP_SPEED[effective.style],
			edgeMargin: 1.6,
		}),
	);
	const minimap = stage("minimap", 1, () => generateMinimap(samples));

	// --- final validation ---
	const validation = stage("validate", 1, () =>
		validateTrack({
			samples,
			ds: centerLoop.ds,
			maxCurvature,
			maxGrade: config.maxGrade,
			checkpoints,
			spawns,
			racingLine,
			terrain: terrainBuild,
		}),
	);

	const track: TrackData = {
		params: original,
		name,
		biome,
		samples,
		ds: centerLoop.ds,
		length: samples.length * centerLoop.ds,
		checkpoints,
		spawns,
		racingLine,
		terrain: terrainBuild.data,
		scenery,
		minimap,
		validation,
		profile,
	};
	return { track, terrainBuild };
}
