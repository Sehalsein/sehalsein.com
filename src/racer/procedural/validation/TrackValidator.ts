import { mod, segmentsIntersect } from "../../shared/math";
import type { TerrainBuild } from "../terrain/heightfield";
import type {
	Checkpoint,
	RacingLinePoint,
	SpawnPoint,
	TrackSample,
	ValidationIssue,
	ValidationReport,
} from "../types";

export interface ValidatorInput {
	samples: TrackSample[];
	ds: number;
	maxCurvature: number;
	maxGrade: number;
	checkpoints: Checkpoint[];
	spawns: SpawnPoint[];
	racingLine: RacingLinePoint[];
	terrain: TerrainBuild;
}

/**
 * Full-track validation with detailed diagnostics. Every generated track runs
 * through this before becoming playable; the report ships with the TrackData
 * so tooling can display exactly what (if anything) is wrong and where.
 */
export function validateTrack(input: ValidatorInput): ValidationReport {
	const { samples, ds } = input;
	const issues: ValidationIssue[] = [];
	const stats: Record<string, number> = {};
	const count = samples.length;

	// --- closed loop & continuity ---
	const gap = Math.hypot(samples[0].x - samples[count - 1].x, samples[0].z - samples[count - 1].z);
	stats.loopClosureGap = gap;
	if (gap > ds * 2.5) {
		issues.push({ severity: "error", check: "closedLoop", message: `Loop does not close: ${gap.toFixed(1)}m gap between last and first sample` });
	}
	let maxGap = 0;
	for (let i = 0; i < count; i++) {
		const n = mod(i + 1, count);
		const d = Math.hypot(samples[n].x - samples[i].x, samples[n].z - samples[i].z);
		if (d > maxGap) maxGap = d;
	}
	stats.maxSampleGap = maxGap;
	if (maxGap > ds * 3) {
		issues.push({ severity: "error", check: "continuity", message: `Discontinuous road: ${maxGap.toFixed(1)}m gap between consecutive samples` });
	}

	// --- curvature & width limits ---
	let worstK = 0;
	let worstKAt = 0;
	let minWidth = Number.POSITIVE_INFINITY;
	for (let i = 0; i < count; i++) {
		const k = Math.abs(samples[i].curvature);
		if (k > worstK) {
			worstK = k;
			worstKAt = i;
		}
		minWidth = Math.min(minWidth, samples[i].width);
	}
	stats.worstCurvature = worstK;
	stats.minTurnRadius = worstK > 1e-6 ? 1 / worstK : Number.POSITIVE_INFINITY;
	stats.minWidth = minWidth;
	if (worstK > input.maxCurvature * 1.08) {
		const s = samples[worstKAt];
		issues.push({
			severity: "error",
			check: "maxCornerAngle",
			message: `Corner exceeds curvature limit: radius ${(1 / worstK).toFixed(1)}m < ${(1 / input.maxCurvature).toFixed(1)}m at s=${s.s.toFixed(0)}m`,
			at: { x: s.x, z: s.z },
		});
	}
	if (minWidth < 8) {
		issues.push({ severity: "error", check: "minRoadWidth", message: `Road narrower than 8m (${minWidth.toFixed(1)}m)` });
	}

	// --- grade ---
	let maxGrade = 0;
	for (let i = 0; i < count; i++) {
		const n = mod(i + 1, count);
		maxGrade = Math.max(maxGrade, Math.abs(samples[n].y - samples[i].y) / ds);
	}
	stats.maxGrade = maxGrade;
	if (maxGrade > input.maxGrade * 1.3) {
		issues.push({ severity: "warning", check: "grade", message: `Steep section: ${(maxGrade * 100).toFixed(1)}% grade` });
	}

	// --- self-intersection (edge polylines, not just centerline) ---
	const stride = Math.max(1, Math.floor(2 / (ds / 4))); // ~every 2nd sample at ds=4
	const pts = [];
	for (let i = 0; i < count; i += stride) pts.push({ x: samples[i].x, y: samples[i].z, i });
	let crossings = 0;
	for (let a = 0; a < pts.length; a++) {
		const a2 = (a + 1) % pts.length;
		for (let b = a + 2; b < pts.length; b++) {
			const b2 = (b + 1) % pts.length;
			if (b2 === a) continue;
			if (segmentsIntersect(pts[a], pts[a2], pts[b], pts[b2])) {
				crossings++;
				if (crossings === 1) {
					issues.push({
						severity: "error",
						check: "selfIntersection",
						message: `Road crosses itself near (${pts[a].x.toFixed(0)}, ${pts[a].y.toFixed(0)})`,
						at: { x: pts[a].x, z: pts[a].y },
					});
				}
			}
		}
	}
	stats.selfIntersections = crossings;

	// --- proximity clearance (parallel sections too close for two ribbons) ---
	let minClearance = Number.POSITIVE_INFINITY;
	const ignoreSamples = Math.ceil(70 / ds);
	for (let i = 0; i < count; i += 2) {
		for (let j = i + ignoreSamples; j < count; j += 2) {
			if (count - (j - i) < ignoreSamples) continue;
			const dx = samples[i].x - samples[j].x;
			const dz = samples[i].z - samples[j].z;
			const d2 = dx * dx + dz * dz;
			if (d2 < minClearance) minClearance = d2;
		}
	}
	minClearance = Math.sqrt(minClearance);
	stats.minSelfClearance = minClearance;
	const neededClearance = stats.minWidth * 1.4;
	if (minClearance < neededClearance) {
		issues.push({
			severity: "warning",
			check: "clearance",
			message: `Parallel sections only ${minClearance.toFixed(1)}m apart (want ${neededClearance.toFixed(1)}m)`,
		});
	}

	// --- checkpoints ---
	stats.checkpoints = input.checkpoints.length;
	if (input.checkpoints.length < 3) {
		issues.push({ severity: "error", check: "checkpoints", message: "Fewer than 3 checkpoints" });
	}
	for (let i = 1; i < input.checkpoints.length; i++) {
		if (input.checkpoints[i].sampleIndex <= input.checkpoints[i - 1].sampleIndex) {
			issues.push({ severity: "error", check: "checkpointOrder", message: `Checkpoint ${i} out of order` });
		}
	}

	// --- racing line stays on the road & is drivable ---
	let lineViolations = 0;
	let minLineSpeed = Number.POSITIVE_INFINITY;
	for (let i = 0; i < input.racingLine.length; i++) {
		const point = input.racingLine[i];
		const sample = samples[i];
		if (Math.abs(point.offset) > sample.width / 2 - 0.8) lineViolations++;
		minLineSpeed = Math.min(minLineSpeed, point.speed);
	}
	stats.racingLineViolations = lineViolations;
	stats.minRacingLineSpeed = minLineSpeed;
	if (lineViolations > 0) {
		issues.push({ severity: "error", check: "aiPath", message: `Racing line leaves the road at ${lineViolations} samples` });
	}
	if (minLineSpeed < 4) {
		issues.push({ severity: "warning", check: "aiPath", message: `Racing line nearly stalls (${minLineSpeed.toFixed(1)} m/s)` });
	}

	// --- spawns on the road, reasonably spaced ---
	for (const spawn of input.spawns) {
		let nearest = Number.POSITIVE_INFINITY;
		let nearestY = 0;
		for (let i = 0; i < count; i += 2) {
			const dx = samples[i].x - spawn.x;
			const dz = samples[i].z - spawn.z;
			const d2 = dx * dx + dz * dz;
			if (d2 < nearest) {
				nearest = d2;
				nearestY = samples[i].y;
			}
		}
		if (Math.sqrt(nearest) > stats.minWidth) {
			issues.push({
				severity: "error",
				check: "spawnSafety",
				message: `Spawn slot ${spawn.gridSlot} is off the road`,
				at: { x: spawn.x, z: spawn.z },
			});
		}
		if (Math.abs(spawn.y - nearestY) > 4) {
			issues.push({ severity: "warning", check: "spawnSafety", message: `Spawn slot ${spawn.gridSlot} far from road height` });
		}
	}

	// --- terrain clipping through the road surface ---
	let clipCount = 0;
	for (let i = 0; i < count; i += 4) {
		const terrainY = input.terrain.heightAt(samples[i].x, samples[i].z);
		if (terrainY > samples[i].y + 0.6) clipCount++;
	}
	stats.terrainClips = clipCount;
	if (clipCount > 0) {
		issues.push({ severity: "warning", check: "terrainClipping", message: `Terrain pokes through the road at ${clipCount} sampled points` });
	}

	stats.lengthM = count * ds;
	return {
		valid: !issues.some((issue) => issue.severity === "error"),
		issues,
		stats,
	};
}
