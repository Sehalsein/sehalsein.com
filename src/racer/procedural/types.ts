import type { Vec2 } from "../shared/math";
import type { EnvironmentSettings } from "../engine/renderer/Renderer";

export type BiomeId = "forest" | "desert" | "snow";
export type TrackDifficulty = "easy" | "medium" | "hard";
export type TrackStyle = "fast" | "balanced" | "technical";

/** Input to the track builder — everything reproducible flows from these. */
export interface TrackParams {
	seed: string;
	biome: BiomeId;
	lengthKm: number;
	difficulty: TrackDifficulty;
	style: TrackStyle;
}

/** One point of the resampled center spline (uniform arc-length spacing). */
export interface TrackSample {
	x: number;
	y: number;
	z: number;
	/** Horizontal unit tangent. */
	tx: number;
	tz: number;
	/** Signed curvature (1/m); positive = turning left. */
	curvature: number;
	/** Banking roll around the tangent, radians. */
	bank: number;
	/** Full road width in meters. */
	width: number;
	/** Arc length from the start line. */
	s: number;
}

export interface Checkpoint {
	index: number;
	sampleIndex: number;
	x: number;
	y: number;
	z: number;
	tx: number;
	tz: number;
	halfWidth: number;
}

export interface SpawnPoint {
	x: number;
	y: number;
	z: number;
	yaw: number;
	gridSlot: number;
}

export interface RacingLinePoint {
	x: number;
	y: number;
	z: number;
	/** Target speed (m/s) a well-driven car can carry here. */
	speed: number;
	/** Lateral offset from the centerline that produced this point. */
	offset: number;
}

export type PropKind = "pine" | "pineSnow" | "cactus" | "rock" | "bush" | "boulder";

export interface SceneryInstance {
	kind: PropKind;
	x: number;
	y: number;
	z: number;
	rotY: number;
	scale: number;
	/** Index into the biome prop palette for color variation. */
	tint: number;
}

export interface TerrainData {
	/** World size (square, centered on origin). */
	size: number;
	/** Vertices per side. */
	resolution: number;
	/** Row-major heights, resolution × resolution. */
	heights: Float32Array;
}

export interface MinimapData {
	points: Vec2[];
	min: Vec2;
	max: Vec2;
	startIndex: number;
}

export interface ValidationIssue {
	severity: "error" | "warning";
	check: string;
	message: string;
	/** Approximate world location of the problem, when known. */
	at?: { x: number; z: number };
}

export interface ValidationReport {
	valid: boolean;
	issues: ValidationIssue[];
	/** Summary stats useful for tuning/debugging generation. */
	stats: Record<string, number>;
}

export interface StageProfileEntry {
	stage: string;
	ms: number;
	attempts: number;
}

export interface BiomePropSpec {
	kind: PropKind;
	weight: number;
	minScale: number;
	maxScale: number;
}

export interface BiomeDef {
	id: BiomeId;
	name: string;
	trackNames: string[];
	environment: EnvironmentSettings;
	terrain: {
		baseColor: string;
		lowColor: string;
		highColor: string;
		/** Max hill amplitude in meters. */
		amplitude: number;
		/** World-space noise frequency. */
		noiseScale: number;
	};
	road: {
		color: string;
		edgeColor: string;
		runoffColor: string;
		curbColorA: string;
		curbColorB: string;
		barrierColor: string;
	};
	props: {
		/** Instances per 1000 m² of usable terrain. */
		density: number;
		specs: BiomePropSpec[];
		palette: string[];
	};
}

/** The complete generated race environment — input to the TrackBuilder. */
export interface TrackData {
	params: TrackParams;
	name: string;
	biome: BiomeDef;
	samples: TrackSample[];
	/** Uniform spacing between samples (m). */
	ds: number;
	length: number;
	checkpoints: Checkpoint[];
	spawns: SpawnPoint[];
	racingLine: RacingLinePoint[];
	terrain: TerrainData;
	scenery: SceneryInstance[];
	minimap: MinimapData;
	validation: ValidationReport;
	profile: StageProfileEntry[];
}
