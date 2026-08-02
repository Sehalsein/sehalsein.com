import { mix, rgb, type Color } from "../engine/Framebuffer";
import { Rng } from "../engine/rng";
import { fbm, Raster } from "./raster";

/**
 * Every surface in the game is generated here at boot from a seeded RNG:
 * hallway plating, brick, marble, sliding blast doors, key-locked doors, the
 * exit lever, floors and ceilings. 64x64 each, tiling seamlessly.
 */

export const TEX_SIZE = 64;

export interface Texture {
	readonly size: number;
	readonly data: Uint32Array;
	/** Flat average — the automap and the fog fallback use it. */
	readonly avg: Color;
}

export type TextureName =
	| "techPanel"
	| "techPipe"
	| "brick"
	| "stone"
	| "marble"
	| "metal"
	| "rust"
	| "circuit"
	| "flesh"
	| "door"
	| "doorRed"
	| "doorBlue"
	| "doorYellow"
	| "exitSwitch"
	| "floorTile"
	| "floorGrate"
	| "floorGravel"
	| "floorBlood"
	| "floorLava"
	| "ceilPanel"
	| "ceilLight"
	| "ceilRock";

function finish(r: Raster): Texture {
	let sr = 0;
	let sg = 0;
	let sb = 0;
	for (let i = 0; i < r.data.length; i++) {
		const c = r.data[i];
		sr += c & 0xff;
		sg += (c >>> 8) & 0xff;
		sb += (c >>> 16) & 0xff;
	}
	const n = r.data.length;
	return {
		size: r.w,
		data: r.data,
		avg: rgb(sr / n, sg / n, sb / n),
	};
}

/** Grid of plates with lit/shadowed bevels and rivets in the corners. */
function paintPlates(
	r: Raster,
	rng: Rng,
	cell: number,
	base: Color,
	light: Color,
	dark: Color,
	rivet: Color,
): void {
	for (let y = 0; y < r.h; y += cell) {
		for (let x = 0; x < r.w; x += cell) {
			const jitter = rng.range(-6, 6);
			const fill = mix(base, jitter > 0 ? light : dark, Math.abs(jitter) / 22);
			r.bevel(x, y, cell, cell, fill, light, dark);
			for (const [rx, ry] of [
				[x + 2, y + 2],
				[x + cell - 3, y + 2],
				[x + 2, y + cell - 3],
				[x + cell - 3, y + cell - 3],
			]) {
				r.set(rx, ry, rivet);
				r.set(rx, ry + 1, dark);
			}
		}
	}
}

const PAINTERS: Record<TextureName, (r: Raster, rng: Rng) => void> = {
	techPanel(r, rng) {
		const base = rgb(96, 100, 108);
		paintPlates(r, rng, 32, base, rgb(140, 146, 156), rgb(46, 49, 56), rgb(178, 182, 190));
		// A louvred vent in one plate — asymmetry reads as detail when tiled.
		for (let i = 0; i < 5; i++) {
			r.rect(38, 8 + i * 5, 20, 3, rgb(38, 41, 47));
			r.rect(38, 8 + i * 5 + 3, 20, 1, rgb(126, 132, 142));
		}
		const grime = fbm(rng, [8, 16, 32]);
		for (let y = 0; y < r.h; y++) {
			for (let x = 0; x < r.w; x++) {
				const n = grime(x / r.w, y / r.h);
				if (n > 0.62) r.set(x, y, mix(r.get(x, y), rgb(52, 44, 34), (n - 0.62) * 1.6));
			}
		}
		r.grain(rng, 7);
	},

	techPipe(r, rng) {
		r.rect(0, 0, r.w, r.h, rgb(72, 76, 84));
		// Vertical pipes, lit down the left of each barrel.
		for (let x = 0; x < r.w; x += 16) {
			for (let i = 0; i < 12; i++) {
				const t = i / 11;
				const c = mix(rgb(150, 154, 162), rgb(44, 47, 54), t);
				r.rect(x + 2 + i, 0, 1, r.h, c);
			}
			r.rect(x, 0, 2, r.h, rgb(34, 36, 42));
			// Flange rings.
			for (const y of [10, 42]) {
				r.rect(x + 1, y, 14, 4, rgb(112, 116, 126));
				r.rect(x + 1, y + 4, 14, 1, rgb(38, 40, 46));
			}
		}
		r.grain(rng, 6);
	},

	brick(r, rng) {
		const mortar = rgb(40, 30, 26);
		r.rect(0, 0, r.w, r.h, mortar);
		const rowH = 8;
		for (let row = 0; row < r.h / rowH; row++) {
			const offset = row % 2 === 0 ? 0 : 8;
			for (let bx = -8; bx < r.w; bx += 16) {
				const shade = rng.range(-14, 14);
				const fill = rgb(118 + shade, 54 + shade * 0.6, 42 + shade * 0.4);
				r.rect(bx + offset + 1, row * rowH + 1, 14, rowH - 2, fill);
				r.rect(bx + offset + 1, row * rowH + 1, 14, 1, mix(fill, rgb(255, 200, 170), 0.22));
				r.rect(bx + offset + 1, row * rowH + rowH - 2, 14, 1, mix(fill, mortar, 0.45));
			}
		}
		const wear = fbm(rng, [8, 16, 32]);
		for (let y = 0; y < r.h; y++) {
			for (let x = 0; x < r.w; x++) {
				const n = wear(x / r.w, y / r.h);
				if (n < 0.34) r.set(x, y, mix(r.get(x, y), rgb(30, 22, 20), (0.34 - n) * 2));
			}
		}
		r.grain(rng, 8);
	},

	stone(r, rng) {
		const mortar = rgb(46, 46, 48);
		r.rect(0, 0, r.w, r.h, mortar);
		const rowH = 16;
		for (let row = 0; row < r.h / rowH; row++) {
			const offset = row % 2 === 0 ? 0 : 16;
			for (let bx = -16; bx < r.w; bx += 32) {
				const shade = rng.range(-12, 12);
				const fill = rgb(126 + shade, 126 + shade, 120 + shade);
				r.bevel(
					bx + offset + 1,
					row * rowH + 1,
					30,
					rowH - 2,
					fill,
					mix(fill, rgb(255, 255, 250), 0.2),
					mix(fill, mortar, 0.5),
				);
			}
		}
		// Chips knocked out of the blocks.
		for (let i = 0; i < 60; i++) {
			const x = rng.int(0, r.w - 1);
			const y = rng.int(0, r.h - 1);
			r.rect(x, y, rng.int(1, 3), rng.int(1, 2), rgb(64, 64, 62));
		}
		r.grain(rng, 9);
	},

	marble(r, rng) {
		const veins = fbm(rng, [4, 8, 16, 32]);
		for (let y = 0; y < r.h; y++) {
			for (let x = 0; x < r.w; x++) {
				const n = veins(x / r.w, y / r.h);
				// Ridged noise gives sharp marble veining rather than clouds.
				const ridge = 1 - Math.abs(n - 0.5) * 2;
				const base = mix(rgb(28, 52, 40), rgb(120, 168, 130), ridge ** 3);
				r.set(x, y, base);
			}
		}
		// Grout lines every 32px so the surface still reads as masonry.
		r.rect(0, 31, r.w, 2, rgb(16, 30, 24));
		r.rect(31, 0, 2, r.h, rgb(16, 30, 24));
		r.grain(rng, 6);
	},

	metal(r, rng) {
		paintPlates(r, rng, 16, rgb(64, 66, 72), rgb(104, 108, 116), rgb(30, 32, 38), rgb(132, 136, 144));
		// Hazard chevrons across one band.
		for (let x = -16; x < r.w + 16; x += 8) {
			for (let i = 0; i < 8; i++) {
				r.rect(x + i, 26 + i, 4, 1, rgb(196, 156, 40));
				r.rect(x + i + 4, 26 + i, 4, 1, rgb(28, 28, 30));
			}
		}
		r.rect(0, 24, r.w, 2, rgb(24, 24, 26));
		r.rect(0, 34, r.w, 2, rgb(24, 24, 26));
		r.grain(rng, 5);
	},

	rust(r, rng) {
		// Corrugated sheet: a sine ridge across x, then rust blooms on top.
		for (let x = 0; x < r.w; x++) {
			const ridge = (Math.sin((x / 8) * Math.PI * 2) + 1) / 2;
			const c = mix(rgb(72, 50, 34), rgb(150, 108, 68), ridge);
			r.rect(x, 0, 1, r.h, c);
		}
		const bloom = fbm(rng, [8, 16, 32]);
		for (let y = 0; y < r.h; y++) {
			for (let x = 0; x < r.w; x++) {
				const n = bloom(x / r.w, y / r.h);
				if (n > 0.52) {
					r.set(x, y, mix(r.get(x, y), rgb(122, 58, 26), (n - 0.52) * 2.2));
				}
			}
		}
		for (const y of [15, 47]) r.rect(0, y, r.w, 2, rgb(46, 32, 22));
		r.grain(rng, 8);
	},

	circuit(r, rng) {
		r.rect(0, 0, r.w, r.h, rgb(22, 28, 40));
		paintPlates(r, rng, 32, rgb(30, 38, 52), rgb(54, 66, 86), rgb(14, 18, 26), rgb(70, 84, 108));
		// Glowing traces. Deterministic walk so the pattern is stable.
		const trace = rgb(70, 210, 220);
		for (let i = 0; i < 7; i++) {
			let x = rng.int(0, r.w - 1);
			let y = rng.int(0, r.h - 1);
			for (let step = 0; step < 14; step++) {
				const len = rng.int(3, 9);
				const horizontal = step % 2 === 0;
				for (let k = 0; k < len; k++) {
					r.setWrapped(x, y, trace);
					if (horizontal) x++;
					else y++;
				}
				if (rng.chance(0.35)) r.setWrapped(x, y, rgb(180, 250, 255));
			}
		}
		r.grain(rng, 4);
	},

	flesh(r, rng) {
		const lumps = fbm(rng, [4, 8, 16, 32]);
		for (let y = 0; y < r.h; y++) {
			for (let x = 0; x < r.w; x++) {
				const n = lumps(x / r.w, y / r.h);
				r.set(x, y, mix(rgb(52, 14, 16), rgb(148, 46, 40), n ** 1.4));
			}
		}
		// Sinew running down the surface.
		for (let i = 0; i < 5; i++) {
			let x = rng.int(0, r.w - 1);
			for (let y = 0; y < r.h; y++) {
				x += rng.int(-1, 1);
				r.setWrapped(x, y, rgb(178, 96, 84));
				r.setWrapped(x + 1, y, rgb(96, 30, 28));
			}
		}
		r.grain(rng, 10);
	},

	door(r, rng) {
		r.rect(0, 0, r.w, r.h, rgb(78, 82, 92));
		// Ribbed leaf with a heavy frame.
		for (let y = 4; y < r.h - 4; y += 6) {
			r.rect(4, y, r.w - 8, 4, rgb(96, 100, 112));
			r.rect(4, y + 4, r.w - 8, 2, rgb(46, 48, 56));
		}
		r.outlineRect(2, 2, r.w - 4, r.h - 4, rgb(148, 152, 164));
		r.outlineRect(1, 1, r.w - 2, r.h - 2, rgb(34, 36, 42));
		// Centre window with a lit interior.
		r.bevel(22, 18, 20, 14, rgb(30, 34, 40), rgb(120, 126, 136), rgb(20, 22, 26));
		r.rect(24, 20, 16, 10, rgb(58, 104, 92));
		r.rect(24, 20, 16, 3, rgb(96, 168, 148));
		// Warning chevrons along the bottom.
		for (let x = 0; x < r.w; x += 8) {
			r.rect(x, 56, 4, 6, rgb(188, 152, 40));
			r.rect(x + 4, 56, 4, 6, rgb(30, 30, 32));
		}
		r.grain(rng, 5);
	},

	doorRed(r, rng) {
		PAINTERS.door(r, rng);
		keyDoorTrim(r, rgb(214, 52, 44));
	},

	doorBlue(r, rng) {
		PAINTERS.door(r, rng);
		keyDoorTrim(r, rgb(64, 108, 224));
	},

	doorYellow(r, rng) {
		PAINTERS.door(r, rng);
		keyDoorTrim(r, rgb(220, 190, 56));
	},

	exitSwitch(r, rng) {
		PAINTERS.techPanel(r, rng);
		// Lit EXIT plate.
		r.bevel(8, 8, 48, 20, rgb(20, 60, 30), rgb(120, 220, 140), rgb(10, 30, 16));
		r.rect(12, 12, 40, 12, rgb(58, 190, 96));
		r.rect(12, 12, 40, 3, rgb(150, 255, 180));
		// The lever, thrown up and to the left.
		r.bevel(24, 34, 16, 24, rgb(52, 54, 60), rgb(110, 114, 124), rgb(24, 26, 30));
		r.limb(32, 52, 26, 38, 4, rgb(160, 164, 176));
		r.circle(26, 38, 3, rgb(206, 64, 52));
		r.grain(rng, 4);
	},

	floorTile(r, rng) {
		const grout = rgb(38, 40, 44);
		r.rect(0, 0, r.w, r.h, grout);
		for (let y = 0; y < r.h; y += 16) {
			for (let x = 0; x < r.w; x += 16) {
				const dark = ((x / 16 + y / 16) | 0) % 2 === 0;
				const base = dark ? rgb(74, 76, 82) : rgb(102, 104, 110);
				const shade = rng.range(-8, 8);
				r.rect(x + 1, y + 1, 14, 14, rgb(base & 0xff, (base >>> 8) & 0xff, (base >>> 16) & 0xff));
				r.darken(x + 1, y + 1, 14, 14, 1 + shade / 90);
				r.rect(x + 1, y + 1, 14, 1, mix(base, rgb(255, 255, 255), 0.14));
			}
		}
		r.grain(rng, 7);
	},

	floorGrate(r, rng) {
		r.rect(0, 0, r.w, r.h, rgb(30, 32, 36));
		for (let y = 0; y < r.h; y += 8) {
			for (let x = 0; x < r.w; x += 8) {
				r.bevel(x, y, 8, 8, rgb(70, 74, 82), rgb(118, 122, 132), rgb(28, 30, 34));
				r.rect(x + 3, y + 3, 3, 3, rgb(14, 15, 18));
			}
		}
		r.grain(rng, 6);
	},

	floorGravel(r, rng) {
		const ground = fbm(rng, [8, 16, 32]);
		for (let y = 0; y < r.h; y++) {
			for (let x = 0; x < r.w; x++) {
				const n = ground(x / r.w, y / r.h);
				r.set(x, y, mix(rgb(52, 46, 38), rgb(118, 106, 88), n));
			}
		}
		for (let i = 0; i < 220; i++) {
			const x = rng.int(0, r.w - 1);
			const y = rng.int(0, r.h - 1);
			const light = rng.chance(0.5);
			r.rect(x, y, rng.int(1, 2), 1, light ? rgb(146, 136, 118) : rgb(38, 34, 28));
		}
		r.grain(rng, 8);
	},

	floorBlood(r, rng) {
		const pool = fbm(rng, [4, 8, 16, 32]);
		for (let y = 0; y < r.h; y++) {
			for (let x = 0; x < r.w; x++) {
				const n = pool(x / r.w, y / r.h);
				r.set(x, y, mix(rgb(38, 8, 10), rgb(130, 22, 24), n ** 1.6));
			}
		}
		// A few slick highlights so it looks wet.
		for (let i = 0; i < 30; i++) {
			const x = rng.int(0, r.w - 1);
			const y = rng.int(0, r.h - 1);
			r.rect(x, y, rng.int(2, 5), 1, rgb(176, 64, 58));
		}
		r.grain(rng, 6);
	},

	floorLava(r, rng) {
		const crust = fbm(rng, [4, 8, 16, 32]);
		for (let y = 0; y < r.h; y++) {
			for (let x = 0; x < r.w; x++) {
				const n = crust(x / r.w, y / r.h);
				const hot = n > 0.55 ? (n - 0.55) / 0.45 : 0;
				const base = mix(rgb(52, 20, 12), rgb(24, 12, 10), n);
				r.set(x, y, mix(base, rgb(250, 176, 48), hot ** 0.7));
			}
		}
		r.grain(rng, 5);
	},

	ceilPanel(r, rng) {
		paintPlates(r, rng, 16, rgb(52, 54, 60), rgb(80, 84, 92), rgb(26, 28, 32), rgb(96, 100, 108));
		r.grain(rng, 5);
	},

	ceilLight(r, rng) {
		r.rect(0, 0, r.w, r.h, rgb(46, 48, 54));
		r.bevel(6, 6, 52, 52, rgb(232, 226, 196), rgb(255, 252, 232), rgb(150, 144, 118));
		// Filament bars.
		for (let i = 0; i < 3; i++) r.rect(14, 16 + i * 14, 36, 4, rgb(255, 250, 214));
		r.outlineRect(6, 6, 52, 52, rgb(120, 116, 100));
		r.grain(rng, 3);
	},

	ceilRock(r, rng) {
		const rock = fbm(rng, [4, 8, 16, 32]);
		for (let y = 0; y < r.h; y++) {
			for (let x = 0; x < r.w; x++) {
				const n = rock(x / r.w, y / r.h);
				r.set(x, y, mix(rgb(30, 26, 24), rgb(86, 74, 64), n ** 1.3));
			}
		}
		r.grain(rng, 9);
	},
};

/** Coloured light strip + card slot shared by the three keycard doors. */
function keyDoorTrim(r: Raster, color: Color): void {
	r.rect(0, 0, r.w, 4, color);
	r.rect(0, r.h - 4, r.w, 4, color);
	r.rect(4, 40, 12, 8, rgb(24, 26, 30));
	r.rect(5, 41, 10, 6, color);
	r.rect(48, 40, 12, 8, rgb(24, 26, 30));
	r.rect(49, 41, 10, 6, color);
	// Dim the door window to the key colour so it reads at a glance.
	for (let y = 20; y < 30; y++) {
		for (let x = 24; x < 40; x++) r.set(x, y, mix(r.get(x, y), color, 0.7));
	}
}

let cache: Record<TextureName, Texture> | null = null;

/** Build (once) and return every wall/floor/ceiling texture. */
export function getTextures(): Record<TextureName, Texture> {
	if (cache) return cache;
	const built = {} as Record<TextureName, Texture>;
	let seed = 0x5eed_1337;
	for (const name of Object.keys(PAINTERS) as TextureName[]) {
		const raster = new Raster(TEX_SIZE, TEX_SIZE, rgb(0, 0, 0));
		// Per-texture seed: adding a texture never reshuffles the others.
		PAINTERS[name](raster, new Rng((seed = (seed * 16807 + 1) >>> 0)));
		built[name] = finish(raster);
	}
	cache = built;
	return built;
}
