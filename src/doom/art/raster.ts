import { blueOf, greenOf, mix, rgb, redOf, type Color } from "../engine/Framebuffer";
import type { Rng } from "../engine/rng";

/**
 * Tiny pixel-art canvas used by the texture and sprite generators. Everything
 * the game draws in the world is painted here at boot, procedurally — there are
 * no image files anywhere in the project.
 */
export class Raster {
	readonly w: number;
	readonly h: number;
	readonly data: Uint32Array;

	constructor(w: number, h: number, fill: Color = 0) {
		this.w = w;
		this.h = h;
		this.data = new Uint32Array(w * h);
		if (fill) this.data.fill(fill);
	}

	get(x: number, y: number): Color {
		if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
		return this.data[y * this.w + x];
	}

	set(x: number, y: number, color: Color): void {
		const px = Math.round(x);
		const py = Math.round(y);
		if (px < 0 || py < 0 || px >= this.w || py >= this.h) return;
		this.data[py * this.w + px] = color;
	}

	/** Set with wraparound — keeps generated wall textures seamless. */
	setWrapped(x: number, y: number, color: Color): void {
		const px = ((Math.round(x) % this.w) + this.w) % this.w;
		const py = ((Math.round(y) % this.h) + this.h) % this.h;
		this.data[py * this.w + px] = color;
	}

	rect(x: number, y: number, w: number, h: number, color: Color): void {
		const x0 = Math.round(x);
		const y0 = Math.round(y);
		for (let py = y0; py < y0 + Math.round(h); py++) {
			for (let px = x0; px < x0 + Math.round(w); px++) this.set(px, py, color);
		}
	}

	/** Filled rect with a lit top/left edge and a shadowed bottom/right one. */
	bevel(
		x: number,
		y: number,
		w: number,
		h: number,
		fill: Color,
		light: Color,
		dark: Color,
	): void {
		this.rect(x, y, w, h, fill);
		this.rect(x, y, w, 1, light);
		this.rect(x, y, 1, h, light);
		this.rect(x, y + h - 1, w, 1, dark);
		this.rect(x + w - 1, y, 1, h, dark);
	}

	outlineRect(x: number, y: number, w: number, h: number, color: Color): void {
		this.rect(x, y, w, 1, color);
		this.rect(x, y + h - 1, w, 1, color);
		this.rect(x, y, 1, h, color);
		this.rect(x + w - 1, y, 1, h, color);
	}

	ellipse(cx: number, cy: number, rx: number, ry: number, color: Color): void {
		if (rx <= 0 || ry <= 0) return;
		const y0 = Math.floor(cy - ry);
		const y1 = Math.ceil(cy + ry);
		for (let py = y0; py <= y1; py++) {
			const dy = (py - cy) / ry;
			if (Math.abs(dy) > 1) continue;
			const span = rx * Math.sqrt(1 - dy * dy);
			for (let px = Math.floor(cx - span); px <= Math.ceil(cx + span); px++) {
				this.set(px, py, color);
			}
		}
	}

	circle(cx: number, cy: number, r: number, color: Color): void {
		this.ellipse(cx, cy, r, r, color);
	}

	/** Thick line — legs, arms, gun barrels. */
	limb(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		thickness: number,
		color: Color,
	): void {
		const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
		const r = thickness / 2;
		for (let i = 0; i <= steps; i++) {
			const t = i / steps;
			this.ellipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, color);
		}
	}

	/** Per-pixel brightness jitter on opaque pixels — breaks up flat fills. */
	grain(rng: Rng, amount: number): void {
		for (let i = 0; i < this.data.length; i++) {
			const c = this.data[i];
			if ((c & 0xff000000) === 0) continue;
			const d = (rng.next() * 2 - 1) * amount;
			this.data[i] = rgb(redOf(c) + d, greenOf(c) + d, blueOf(c) + d);
		}
	}

	/** Multiply a region's brightness — vents, scorch marks, shadowed panels. */
	darken(x: number, y: number, w: number, h: number, factor: number): void {
		for (let py = Math.round(y); py < Math.round(y + h); py++) {
			for (let px = Math.round(x); px < Math.round(x + w); px++) {
				const c = this.get(px, py);
				if ((c & 0xff000000) === 0) continue;
				this.set(
					px,
					py,
					rgb(redOf(c) * factor, greenOf(c) * factor, blueOf(c) * factor),
				);
			}
		}
	}

	/** Wrap a one-pixel outline around every opaque pixel. Sprites read better. */
	outline(color: Color): void {
		const copy = this.data.slice();
		const opaque = (x: number, y: number) => {
			if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
			return (copy[y * this.w + x] & 0xff000000) !== 0;
		};
		for (let y = 0; y < this.h; y++) {
			for (let x = 0; x < this.w; x++) {
				if (opaque(x, y)) continue;
				if (
					opaque(x - 1, y) ||
					opaque(x + 1, y) ||
					opaque(x, y - 1) ||
					opaque(x, y + 1)
				) {
					this.data[y * this.w + x] = color;
				}
			}
		}
	}

	/** Blend `color` into every opaque pixel — used for pain flashes. */
	tint(color: Color, amount: number): void {
		for (let i = 0; i < this.data.length; i++) {
			const c = this.data[i];
			if ((c & 0xff000000) === 0) continue;
			this.data[i] = mix(c, color, amount);
		}
	}

	/** Horizontal mirror — cheap second frame for walk cycles. */
	mirrored(): Raster {
		const out = new Raster(this.w, this.h);
		for (let y = 0; y < this.h; y++) {
			for (let x = 0; x < this.w; x++) {
				out.data[y * this.w + (this.w - 1 - x)] = this.data[y * this.w + x];
			}
		}
		return out;
	}
}

/**
 * Seamless value noise on a `size x size` lattice, sampled in 0..1 texture
 * space. Wrapping the lattice is what keeps tiled wall textures from showing
 * grid seams.
 */
export function noiseField(
	rng: Rng,
	size: number,
): (x: number, y: number) => number {
	const grid = new Float32Array(size * size);
	for (let i = 0; i < grid.length; i++) grid[i] = rng.next();
	const at = (x: number, y: number) =>
		grid[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
	const smooth = (t: number) => t * t * (3 - 2 * t);
	return (x, y) => {
		const fx = x * size;
		const fy = y * size;
		const x0 = Math.floor(fx);
		const y0 = Math.floor(fy);
		const tx = smooth(fx - x0);
		const ty = smooth(fy - y0);
		const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
		const bot = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
		return top + (bot - top) * ty;
	};
}

/** Sum of octaves of `noiseField`, normalized to 0..1. */
export function fbm(
	rng: Rng,
	octaves: number[],
): (x: number, y: number) => number {
	const fields = octaves.map((size) => noiseField(rng, size));
	let total = 0;
	const weights = octaves.map((_, i) => {
		const w = 1 / 2 ** i;
		total += w;
		return w;
	});
	return (x, y) => {
		let sum = 0;
		for (let i = 0; i < fields.length; i++) sum += fields[i](x, y) * weights[i];
		return sum / total;
	};
}
