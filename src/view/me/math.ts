/**
 * Small math helpers for the /me stage.
 *
 * These duplicate `src/racer/shared/math.ts` on purpose: importing engine
 * internals from a view that has nothing to do with the racer would couple two
 * unrelated features through a path that reads like it belongs to the game.
 * If a third consumer shows up, promote these to `src/lib/math.ts` and re-export
 * from the racer's `shared/math.ts` so that side sees no churn.
 */

export const TAU = Math.PI * 2;

export function clamp(v: number, min: number, max: number): number {
	return v < min ? min : v > max ? max : v;
}

export function clamp01(v: number): number {
	return clamp(v, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Frame-rate independent exponential damping.
 * `smoothing` is the fraction of the gap remaining after one second — smaller
 * is snappier (0.02 ≈ 180ms to settle, 0.0015 ≈ 55ms).
 */
export function damp(a: number, b: number, smoothing: number, dt: number): number {
	return lerp(a, b, 1 - Math.pow(smoothing, dt));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = clamp01((x - edge0) / (edge1 - edge0));
	return t * t * (3 - 2 * t);
}

/** Sign that returns 0 for 0, matching GLSL. */
export function sign(v: number): number {
	return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/**
 * Seeded PRNG. Every autonomic schedule (blink, look-away, saccades) draws from
 * one of these rather than `Math.random`, so a headless probe that pins the seed
 * gets the same blink at the same frame every run.
 */
export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
