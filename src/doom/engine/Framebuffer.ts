/**
 * Software framebuffer.
 *
 * Everything the game draws — walls, sprites, HUD, menus — lands in one
 * `Uint32Array` at a fixed low internal resolution, which the browser then
 * upscales with `image-rendering: pixelated`. That keeps the chunky look of a
 * 1990s software renderer and makes the whole frame cost independent of the
 * display size.
 *
 * Pixels are packed the way `ImageData` lays bytes out on little-endian
 * machines (every platform a browser ships on): 0xAABBGGRR.
 */

export type Color = number;

export function rgb(r: number, g: number, b: number): Color {
	return (
		(0xff000000 | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff)) >>> 0
	);
}

export function redOf(c: Color): number {
	return c & 0xff;
}

export function greenOf(c: Color): number {
	return (c >>> 8) & 0xff;
}

export function blueOf(c: Color): number {
	return (c >>> 16) & 0xff;
}

/** Number of discrete light levels — DOOM's colormaps, in spirit. */
export const LIGHT_LEVELS = 32;

/**
 * `SHADE[level << 8 | channel]` is `channel` scaled to `level`. Sampling a
 * texel and darkening it costs three array reads instead of three multiplies
 * and three rounds, which matters at ~100k texels per frame.
 *
 * The curve is slightly gamma-ish so mid distances stay readable instead of
 * washing to flat grey.
 */
const SHADE = (() => {
	const table = new Uint8Array(LIGHT_LEVELS << 8);
	for (let level = 0; level < LIGHT_LEVELS; level++) {
		const t = level / (LIGHT_LEVELS - 1);
		const scale = t * t * 0.35 + t * 0.65;
		for (let c = 0; c < 256; c++) {
			table[(level << 8) | c] = Math.min(255, Math.round(c * scale));
		}
	}
	return table;
})();

/** Darken a packed color to one of `LIGHT_LEVELS` steps. */
export function shade(color: Color, level: number): Color {
	const t = (level < 0 ? 0 : level > 31 ? 31 : level) << 8;
	return (
		(0xff000000 |
			(SHADE[t | ((color >>> 16) & 0xff)] << 16) |
			(SHADE[t | ((color >>> 8) & 0xff)] << 8) |
			SHADE[t | (color & 0xff)]) >>>
		0
	);
}

/** Linear blend between two packed colors. `t` runs 0 (a) .. 1 (b). */
export function mix(a: Color, b: Color, t: number): Color {
	const k = t < 0 ? 0 : t > 1 ? 1 : t;
	return rgb(
		redOf(a) + (redOf(b) - redOf(a)) * k,
		greenOf(a) + (greenOf(b) - greenOf(a)) * k,
		blueOf(a) + (blueOf(b) - blueOf(a)) * k,
	);
}

export class Framebuffer {
	width = 0;
	height = 0;
	pixels!: Uint32Array;

	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private image!: ImageData;

	constructor(canvas: HTMLCanvasElement, width: number, height: number) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx) throw new Error("doom: 2d canvas context unavailable");
		this.ctx = ctx;
		this.ctx.imageSmoothingEnabled = false;
		this.resize(width, height);
	}

	resize(width: number, height: number): void {
		if (this.width === width && this.height === height) return;
		this.width = width;
		this.height = height;
		this.canvas.width = width;
		this.canvas.height = height;
		this.image = this.ctx.createImageData(width, height);
		this.pixels = new Uint32Array(this.image.data.buffer);
		this.ctx.imageSmoothingEnabled = false;
	}

	/** Push the pixel buffer to the canvas. */
	present(): void {
		this.ctx.putImageData(this.image, 0, 0);
	}

	clear(color: Color): void {
		this.pixels.fill(color);
	}

	set(x: number, y: number, color: Color): void {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
		this.pixels[y * this.width + x] = color;
	}

	fillRect(x: number, y: number, w: number, h: number, color: Color): void {
		const x0 = Math.max(0, Math.floor(x));
		const y0 = Math.max(0, Math.floor(y));
		const x1 = Math.min(this.width, Math.floor(x + w));
		const y1 = Math.min(this.height, Math.floor(y + h));
		for (let py = y0; py < y1; py++) {
			this.pixels.fill(color, py * this.width + x0, py * this.width + x1);
		}
	}

	/** Rectangle outline, one pixel thick. */
	strokeRect(x: number, y: number, w: number, h: number, color: Color): void {
		this.fillRect(x, y, w, 1, color);
		this.fillRect(x, y + h - 1, w, 1, color);
		this.fillRect(x, y, 1, h, color);
		this.fillRect(x + w - 1, y, 1, h, color);
	}

	/** Blend a translucent rectangle over what is already there. */
	tintRect(
		x: number,
		y: number,
		w: number,
		h: number,
		color: Color,
		alpha: number,
	): void {
		if (alpha <= 0) return;
		const a = Math.min(1, alpha);
		const tr = redOf(color);
		const tg = greenOf(color);
		const tb = blueOf(color);
		const x0 = Math.max(0, Math.floor(x));
		const y0 = Math.max(0, Math.floor(y));
		const x1 = Math.min(this.width, Math.floor(x + w));
		const y1 = Math.min(this.height, Math.floor(y + h));
		for (let py = y0; py < y1; py++) {
			let i = py * this.width + x0;
			for (let px = x0; px < x1; px++, i++) {
				const c = this.pixels[i];
				this.pixels[i] = rgb(
					redOf(c) + (tr - redOf(c)) * a,
					greenOf(c) + (tg - greenOf(c)) * a,
					blueOf(c) + (tb - blueOf(c)) * a,
				);
			}
		}
	}

	/** Bresenham line — used by the automap. */
	line(x0: number, y0: number, x1: number, y1: number, color: Color): void {
		let px = Math.round(x0);
		let py = Math.round(y0);
		const ex = Math.round(x1);
		const ey = Math.round(y1);
		const dx = Math.abs(ex - px);
		const dy = Math.abs(ey - py);
		const sx = px < ex ? 1 : -1;
		const sy = py < ey ? 1 : -1;
		let err = dx - dy;
		for (let guard = 0; guard < 4096; guard++) {
			this.set(px, py, color);
			if (px === ex && py === ey) return;
			const e2 = err * 2;
			if (e2 > -dy) {
				err -= dy;
				px += sx;
			}
			if (e2 < dx) {
				err += dx;
				py += sy;
			}
		}
	}
}
