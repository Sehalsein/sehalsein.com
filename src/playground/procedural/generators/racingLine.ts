import { mod } from "../../shared/math";
import type { RacingLinePoint, TrackSample } from "../types";

/**
 * Stage: AI racing line.
 *
 * Geometric out-in-out: the lateral offset tracks negated, heavily smoothed
 * curvature — smoothing over a lookahead window naturally swings wide before
 * a corner, clips the apex at max curvature, and releases wide on exit.
 *
 * Speeds come from a three-pass profile: corner-limited speed from curvature,
 * then a backward pass limiting braking and a forward pass limiting
 * acceleration, giving AI physically honest brake points.
 */
export function generateRacingLine(
	samples: TrackSample[],
	ds: number,
	options: {
		maxLateralG: number;
		brakeDecel: number;
		accel: number;
		topSpeed: number;
		edgeMargin: number;
	},
): RacingLinePoint[] {
	const count = samples.length;

	// 1) smooth curvature over ~70m for the offset shape
	const window = Math.max(1, Math.round(35 / ds));
	const smoothK = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		let sum = 0;
		for (let o = -window; o <= window; o++) sum += samples[mod(i + o, count)].curvature;
		smoothK[i] = sum / (window * 2 + 1);
	}
	let kRef = 0;
	for (let i = 0; i < count; i++) kRef = Math.max(kRef, Math.abs(smoothK[i]));
	kRef = Math.max(kRef, 1e-4);

	// 2) lateral offsets (positive = toward the left edge)
	const offsets = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		const maxOffset = samples[i].width / 2 - options.edgeMargin;
		// inside of a left turn (k>0) is the left edge → offset toward +
		offsets[i] = (smoothK[i] / kRef) * maxOffset;
	}

	// 3) corner speed limit from the *line's* curvature (slightly gentler than
	// centerline curvature because the line straightens corners)
	const lineK = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		lineK[i] = Math.abs(samples[i].curvature) * 0.82;
	}
	const speeds = new Float32Array(count);
	const aLat = options.maxLateralG * 9.81;
	for (let i = 0; i < count; i++) {
		speeds[i] = Math.min(options.topSpeed, Math.sqrt(aLat / Math.max(lineK[i], 1e-4)));
	}

	// backward pass: cap approach speed by braking capability
	for (let pass = 0; pass < 2; pass++) {
		for (let i = count * 2 - 1; i >= 0; i--) {
			const a = mod(i, count);
			const b = mod(i + 1, count);
			const allowed = Math.sqrt(speeds[b] * speeds[b] + 2 * options.brakeDecel * ds);
			if (speeds[a] > allowed) speeds[a] = allowed;
		}
	}
	// forward pass: cap exit speed by acceleration capability
	for (let pass = 0; pass < 2; pass++) {
		for (let i = 0; i < count * 2; i++) {
			const a = mod(i, count);
			const b = mod(i + 1, count);
			const allowed = Math.sqrt(speeds[a] * speeds[a] + 2 * options.accel * ds);
			if (speeds[b] > allowed) speeds[b] = allowed;
		}
	}

	// 4) assemble world-space points (offset along the left normal)
	const line: RacingLinePoint[] = [];
	for (let i = 0; i < count; i++) {
		const sample = samples[i];
		// left normal of travel direction: up × t = (tz, 0, -tx)
		const nx = sample.tz;
		const nz = -sample.tx;
		line.push({
			x: sample.x + nx * offsets[i],
			y: sample.y,
			z: sample.z + nz * offsets[i],
			speed: speeds[i],
			offset: offsets[i],
		});
	}
	return line;
}
