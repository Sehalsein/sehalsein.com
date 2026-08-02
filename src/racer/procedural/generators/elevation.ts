import { TAU, clamp, mod } from "../../shared/math";
import { type Rng, ValueNoise2D } from "../../shared/rng";
import type { SampledLoop } from "./spline";

/**
 * Stage: elevation. Heights are sampled from 2D noise along a circle in noise
 * space — a standard trick that makes the 1D profile perfectly periodic, so
 * the loop closes with zero seam. Slopes are then clamped so no section
 * exceeds a drivable grade.
 */
export function generateElevation(
	rng: Rng,
	loop: SampledLoop,
	amplitude: number,
	maxGrade = 0.07,
): Float32Array {
	const noise = new ValueNoise2D(rng);
	const count = loop.count;
	const ys = new Float32Array(count);

	// two octaves around circles of different radii in noise space
	const cx = rng.range(0, 100);
	const cy = rng.range(0, 100);
	for (let i = 0; i < count; i++) {
		const theta = (i / count) * TAU;
		const broad = noise.sample(cx + Math.cos(theta) * 1.6, cy + Math.sin(theta) * 1.6);
		const detail = noise.sample(cx + 40 + Math.cos(theta) * 4, cy + 40 + Math.sin(theta) * 4);
		ys[i] = (broad - 0.5) * 2 * amplitude + (detail - 0.5) * amplitude * 0.35;
	}

	// clamp grade in both directions (two passes handle up and downhill)
	const maxStep = maxGrade * loop.ds;
	for (let pass = 0; pass < 3; pass++) {
		for (let i = 1; i <= count; i++) {
			const a = mod(i - 1, count);
			const b = mod(i, count);
			ys[b] = clamp(ys[b], ys[a] - maxStep, ys[a] + maxStep);
		}
		for (let i = count - 1; i >= -1; i--) {
			const a = mod(i + 1, count);
			const b = mod(i, count);
			ys[b] = clamp(ys[b], ys[a] - maxStep, ys[a] + maxStep);
		}
	}

	// gentle box smooth to kill any clamping creases
	const smoothed = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		let sum = 0;
		for (let o = -2; o <= 2; o++) sum += ys[mod(i + o, count)];
		smoothed[i] = sum / 5;
	}
	return smoothed;
}

/**
 * Stage: banking. Corners tilt into the turn proportionally to curvature,
 * clamped and heavily smoothed so transitions never snap.
 */
export function generateBanking(loop: SampledLoop, maxBankRad = 0.21): Float32Array {
	const count = loop.count;
	const banks = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		// positive curvature (left turn) banks the road so the left edge drops
		banks[i] = clamp(loop.curvature[i] * 9, -1, 1) * maxBankRad;
	}
	// wide box smoothing — banking should ease in over ~40m
	const window = Math.max(1, Math.round(20 / loop.ds));
	const smoothed = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		let sum = 0;
		for (let o = -window; o <= window; o++) sum += banks[mod(i + o, count)];
		smoothed[i] = sum / (window * 2 + 1);
	}
	return smoothed;
}
