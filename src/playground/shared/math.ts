/** Small math helpers shared by the engine, procedural pipeline and gameplay. */

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
 * `smoothing` is the fraction remaining after one second (e.g. 0.001 = snappy).
 */
export function damp(a: number, b: number, smoothing: number, dt: number): number {
	return lerp(a, b, 1 - Math.pow(smoothing, dt));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = clamp01((x - edge0) / (edge1 - edge0));
	return t * t * (3 - 2 * t);
}

/** Wrap an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
	a = a % TAU;
	if (a > Math.PI) a -= TAU;
	if (a <= -Math.PI) a += TAU;
	return a;
}

/** Shortest-path angle interpolation. */
export function dampAngle(a: number, b: number, smoothing: number, dt: number): number {
	return a + wrapAngle(b - a) * (1 - Math.pow(smoothing, dt));
}

export interface Vec2 {
	x: number;
	y: number;
}

export function v2(x = 0, y = 0): Vec2 {
	return { x, y };
}

export function v2dist(a: Vec2, b: Vec2): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

export function v2len(a: Vec2): number {
	return Math.hypot(a.x, a.y);
}

/**
 * Segment/segment intersection test (proper crossings only, shared endpoints
 * excluded). Used by the track validator to reject self-intersecting loops.
 */
export function segmentsIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
	const d1x = p2.x - p1.x;
	const d1y = p2.y - p1.y;
	const d2x = p4.x - p3.x;
	const d2y = p4.y - p3.y;
	const denom = d1x * d2y - d1y * d2x;
	if (Math.abs(denom) < 1e-10) return false;
	const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
	const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
	const eps = 1e-6;
	return t > eps && t < 1 - eps && u > eps && u < 1 - eps;
}

/** Positive modulo — index wrapping for closed loops. */
export function mod(i: number, n: number): number {
	return ((i % n) + n) % n;
}
