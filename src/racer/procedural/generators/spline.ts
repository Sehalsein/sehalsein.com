import * as THREE from "three";
import { type Vec2, mod } from "../../shared/math";

/** Flat XZ polyline sampled at uniform arc length; y is filled in later. */
export interface SampledLoop {
	xs: Float32Array;
	zs: Float32Array;
	/** Unit tangents. */
	txs: Float32Array;
	tzs: Float32Array;
	/** Signed curvature (1/m), positive = left turn. */
	curvature: Float32Array;
	count: number;
	ds: number;
	length: number;
}

/**
 * Fit a closed centripetal Catmull-Rom through the control points and resample
 * it at (roughly) `targetDs` meters. Centripetal parameterization is the
 * variant that provably avoids loops/cusps between control points.
 */
export function sampleClosedSpline(controlPoints: Vec2[], targetDs: number): SampledLoop {
	const curve = new THREE.CatmullRomCurve3(
		controlPoints.map((p) => new THREE.Vector3(p.x, 0, p.y)),
		true,
		"centripetal",
	);
	const length = curve.getLength();
	const count = Math.max(64, Math.round(length / targetDs));
	const ds = length / count;

	const xs = new Float32Array(count);
	const zs = new Float32Array(count);
	// getSpacedPoints returns count+1 with last == first; drop the duplicate
	const points = curve.getSpacedPoints(count);
	for (let i = 0; i < count; i++) {
		xs[i] = points[i].x;
		zs[i] = points[i].z;
	}

	const loop: SampledLoop = {
		xs,
		zs,
		txs: new Float32Array(count),
		tzs: new Float32Array(count),
		curvature: new Float32Array(count),
		count,
		ds,
		length,
	};
	computeTangentsAndCurvature(loop);
	return loop;
}

/** Central-difference tangents + Menger curvature (signed via 2D cross). */
export function computeTangentsAndCurvature(loop: SampledLoop): void {
	const { xs, zs, txs, tzs, curvature, count } = loop;
	for (let i = 0; i < count; i++) {
		const prev = mod(i - 1, count);
		const next = mod(i + 1, count);
		let tx = xs[next] - xs[prev];
		let tz = zs[next] - zs[prev];
		const tLen = Math.hypot(tx, tz) || 1;
		tx /= tLen;
		tz /= tLen;
		txs[i] = tx;
		tzs[i] = tz;

		const abx = xs[i] - xs[prev];
		const abz = zs[i] - zs[prev];
		const bcx = xs[next] - xs[i];
		const bcz = zs[next] - zs[i];
		const cross = abx * bcz - abz * bcx;
		const ab = Math.hypot(abx, abz);
		const bc = Math.hypot(bcx, bcz);
		const cax = xs[next] - xs[prev];
		const caz = zs[next] - zs[prev];
		const ca = Math.hypot(cax, caz);
		const denom = ab * bc * ca;
		// Menger curvature k = 2|cross| / (|ab||bc||ca|). In XZ with y-up, a left
		// turn produces a negative cross, so negate to make positive = left turn.
		curvature[i] = denom > 1e-9 ? -(2 * cross) / denom : 0;
	}
}

/**
 * Curvature relaxation: Laplacian-smooth the polyline wherever |k| exceeds the
 * drivable limit, then re-derive tangents/curvature. Returns the worst |k|
 * remaining so the caller can decide whether the stage converged.
 */
export function relaxCurvature(loop: SampledLoop, maxCurvature: number, iterations = 40): number {
	const { xs, zs, curvature, count } = loop;
	let worst = 0;
	for (let iter = 0; iter < iterations; iter++) {
		worst = 0;
		for (let i = 0; i < count; i++) {
			if (Math.abs(curvature[i]) > worst) worst = Math.abs(curvature[i]);
		}
		if (worst <= maxCurvature) break;

		const nx = new Float32Array(count);
		const nz = new Float32Array(count);
		for (let i = 0; i < count; i++) {
			// smoothing strength ramps with local violation, spread to neighbors
			let violation = 0;
			for (let o = -3; o <= 3; o++) {
				const k = Math.abs(curvature[mod(i + o, count)]);
				violation = Math.max(violation, k / maxCurvature - 1);
			}
			const t = Math.min(0.5, Math.max(0, violation) * 0.5);
			const prev = mod(i - 1, count);
			const next = mod(i + 1, count);
			nx[i] = xs[i] + ((xs[prev] + xs[next]) / 2 - xs[i]) * t;
			nz[i] = zs[i] + ((zs[prev] + zs[next]) / 2 - zs[i]) * t;
		}
		xs.set(nx);
		zs.set(nz);
		computeTangentsAndCurvature(loop);
	}
	return worst;
}

/**
 * Minimum clearance between non-neighboring sections of the loop (meters).
 * Small values mean the track folds back on itself too tightly for two road
 * ribbons plus barriers to fit.
 */
export function minSelfClearance(loop: SampledLoop, ignoreArc: number): number {
	const { xs, zs, count, ds } = loop;
	const ignoreSamples = Math.ceil(ignoreArc / ds);
	let minDist = Number.POSITIVE_INFINITY;
	// O(n²) but n is ~1000-2000 and this runs once per generation attempt
	for (let i = 0; i < count; i++) {
		for (let j = i + ignoreSamples; j < count; j++) {
			// wrap-around adjacency
			if (count - (j - i) < ignoreSamples) continue;
			const dx = xs[i] - xs[j];
			const dz = zs[i] - zs[j];
			const d = dx * dx + dz * dz;
			if (d < minDist) minDist = d;
		}
	}
	return Math.sqrt(minDist);
}
