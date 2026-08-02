/**
 * Deterministic seeded random numbers.
 *
 * Every procedural stage pulls from its own forked stream (`rng.fork("roads")`)
 * so a change in how one stage consumes randomness never perturbs the others —
 * a requirement for stable seeds across engine versions and future multiplayer.
 */

/** xmur3 string hash — turns an arbitrary seed string into a 32-bit state. */
function hashString(str: string): number {
	let h = 1779033703 ^ str.length;
	for (let i = 0; i < str.length; i++) {
		h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	h = Math.imul(h ^ (h >>> 16), 2246822507);
	h = Math.imul(h ^ (h >>> 13), 3266489909);
	return (h ^= h >>> 16) >>> 0;
}

export class Rng {
	private state: number;
	readonly seed: string;

	constructor(seed: string | number) {
		this.seed = String(seed);
		this.state = hashString(this.seed);
		// burn a few values so nearby seeds diverge quickly
		this.next();
		this.next();
	}

	/** mulberry32 — uniform float in [0, 1). */
	next(): number {
		this.state = (this.state + 0x6d2b79f5) | 0;
		let t = this.state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	range(min: number, max: number): number {
		return min + (max - min) * this.next();
	}

	int(min: number, max: number): number {
		return Math.floor(this.range(min, max + 1));
	}

	pick<T>(items: readonly T[]): T {
		return items[Math.floor(this.next() * items.length)];
	}

	/** Roughly gaussian in [-1, 1] (sum of three uniforms). */
	gaussian(): number {
		return (this.next() + this.next() + this.next()) / 1.5 - 1;
	}

	chance(probability: number): boolean {
		return this.next() < probability;
	}

	/** Independent child stream — deterministic per (seed, label). */
	fork(label: string): Rng {
		return new Rng(`${this.seed}:${label}`);
	}
}

/**
 * Tileable 2D value noise with a seeded permutation. Deterministic, cheap and
 * good enough for stylized low-poly terrain (no need for simplex).
 */
export class ValueNoise2D {
	private perm: Uint8Array;

	constructor(rng: Rng) {
		this.perm = new Uint8Array(512);
		const p = new Uint8Array(256);
		for (let i = 0; i < 256; i++) p[i] = i;
		for (let i = 255; i > 0; i--) {
			const j = Math.floor(rng.next() * (i + 1));
			const tmp = p[i];
			p[i] = p[j];
			p[j] = tmp;
		}
		for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
	}

	private hash(x: number, y: number): number {
		return this.perm[(this.perm[x & 255] + y) & 255] / 255;
	}

	/** Single octave, smooth-interpolated, output in [0, 1]. */
	sample(x: number, y: number): number {
		const xi = Math.floor(x);
		const yi = Math.floor(y);
		const xf = x - xi;
		const yf = y - yi;
		const u = xf * xf * (3 - 2 * xf);
		const v = yf * yf * (3 - 2 * yf);
		const a = this.hash(xi, yi);
		const b = this.hash(xi + 1, yi);
		const c = this.hash(xi, yi + 1);
		const d = this.hash(xi + 1, yi + 1);
		return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
	}

	/** Fractal sum, output roughly in [0, 1]. */
	fbm(x: number, y: number, octaves = 3, lacunarity = 2, gain = 0.5): number {
		let amp = 1;
		let freq = 1;
		let sum = 0;
		let norm = 0;
		for (let o = 0; o < octaves; o++) {
			sum += amp * this.sample(x * freq, y * freq);
			norm += amp;
			amp *= gain;
			freq *= lacunarity;
		}
		return sum / norm;
	}
}
