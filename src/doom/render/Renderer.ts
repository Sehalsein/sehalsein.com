import { getSprites, type Sprite, type SpriteSet } from "../art/sprites";
import { getTextures, TEX_SIZE, type Texture } from "../art/textures";
import { Framebuffer, rgb, shade, type Color } from "../engine/Framebuffer";
import type { Entity, World } from "../game/World";
import { WEAPONS } from "../game/weapons";

/**
 * The raycaster.
 *
 * One DDA walk per screen column gives a wall distance and texture coordinate;
 * floors and ceilings are cast per scanline from the same camera; sprites are
 * billboarded afterwards and clipped against the per-column depth buffer that
 * the wall pass wrote. This is the 1993 pipeline, with the arithmetic kept in
 * flat typed arrays so a frame stays inside a couple of milliseconds.
 */

/** Camera plane half-width. 0.66 is the classic ~66° horizontal field. */
const PLANE = 0.66;
/** Eye height, in cells, where the ceiling is at 1. */
const EYE = 0.5;
/** Nothing is drawn past this; the fog table bottoms out well before it. */
const MAX_DEPTH = 34;

export class Renderer {
	readonly fb: Framebuffer;

	private textures: Record<string, Texture>;
	private sprites: SpriteSet;
	/** Wall textures indexed the way `GameMap.wallTex` stores them. */
	private levelTextures: Texture[] = [];
	/** Per-column wall distance, for clipping sprites. */
	private depth: Float32Array;
	/** Scratch list so sprite sorting doesn't allocate every frame. */
	private visible: { e: Entity; dist: number }[] = [];

	/**
	 * Height of the 3D viewport. The status bar covers the rows below it, so
	 * the world is projected into this height only — that keeps the horizon at
	 * the centre of what the player actually sees (and therefore under the
	 * crosshair), and skips shading 30 rows that get painted over anyway.
	 */
	private viewH: number;

	constructor(canvas: HTMLCanvasElement, width: number, height: number, hudHeight: number) {
		this.fb = new Framebuffer(canvas, width, height);
		this.textures = getTextures();
		this.sprites = getSprites();
		this.depth = new Float32Array(width);
		this.viewH = height - hudHeight;
	}

	resize(width: number, height: number, hudHeight: number): void {
		this.fb.resize(width, height);
		if (this.depth.length !== width) this.depth = new Float32Array(width);
		this.viewH = height - hudHeight;
	}

	/** Screen row the horizon sits on, given the player's pitch and bob. */
	horizonFor(world: World): number {
		const p = world.player;
		return Math.round(this.viewH / 2 + p.pitch + Math.sin(p.bob * 2) * 2.4 + p.kick * 0.5);
	}

	/** Cache the level's texture list in map-index order. */
	bindLevel(world: World): void {
		this.levelTextures = world.map.textureNames.map((name) => this.textures[name]);
	}

	render(world: World): void {
		const p = world.player;
		const dirX = Math.cos(p.angle);
		const dirY = Math.sin(p.angle);
		const planeX = -dirY * PLANE;
		const planeY = dirX * PLANE;

		// View bob and weapon kick move the horizon, not the geometry, so the
		// world stays a clean grid while the camera breathes.
		const horizon = this.horizonFor(world);

		this.drawFloorAndCeiling(world, dirX, dirY, planeX, planeY, horizon);
		this.drawWalls(world, dirX, dirY, planeX, planeY, horizon);
		this.drawSprites(world, dirX, dirY, planeX, planeY, horizon);
		this.drawViewWeapon(world);
		this.drawTints(world);
	}

	/* ── Walls ──────────────────────────────────────────────────────────── */

	private drawWalls(
		world: World,
		dirX: number,
		dirY: number,
		planeX: number,
		planeY: number,
		horizon: number,
	): void {
		const fb = this.fb;
		const map = world.map;
		const px = world.player.x;
		const py = world.player.y;
		const w = fb.width;
		const h = this.viewH;
		const flash = world.player.muzzleFlash;

		for (let x = 0; x < w; x++) {
			const camX = (2 * x) / w - 1;
			const rayX = dirX + planeX * camX;
			const rayY = dirY + planeY * camX;

			let mapX = Math.floor(px);
			let mapY = Math.floor(py);
			const deltaX = rayX === 0 ? Infinity : Math.abs(1 / rayX);
			const deltaY = rayY === 0 ? Infinity : Math.abs(1 / rayY);
			const stepX = rayX < 0 ? -1 : 1;
			const stepY = rayY < 0 ? -1 : 1;
			let sideX = rayX < 0 ? (px - mapX) * deltaX : (mapX + 1 - px) * deltaX;
			let sideY = rayY < 0 ? (py - mapY) * deltaY : (mapY + 1 - py) * deltaY;

			let side = 0;
			let perp = MAX_DEPTH;
			let texIndex = -1;
			let wallX = 0;
			let doorSlide = 0;

			for (let guard = 0; guard < 256; guard++) {
				if (sideX < sideY) {
					perp = sideX;
					sideX += deltaX;
					mapX += stepX;
					side = 0;
				} else {
					perp = sideY;
					sideY += deltaY;
					mapY += stepY;
					side = 1;
				}
				if (perp > MAX_DEPTH || !map.inBounds(mapX, mapY)) {
					perp = MAX_DEPTH;
					break;
				}
				const i = map.index(mapX, mapY);
				if (!map.solid[i]) continue;

				// Where along the cell face did we land? Needed both for the
				// texture coordinate and to know if a sliding door has cleared it.
				wallX = side === 0 ? py + perp * rayY : px + perp * rayX;
				wallX -= Math.floor(wallX);

				const doorIdx = map.doorIndex[i];
				if (doorIdx >= 0) {
					const openness = map.doors[doorIdx].openness;
					// The leaf slides sideways; past its trailing edge the column
					// is see-through and the ray simply carries on.
					if (wallX > 1 - openness) continue;
					doorSlide = openness;
				} else {
					doorSlide = 0;
				}

				texIndex = map.wallTex[i];
				break;
			}

			this.depth[x] = perp;
			if (texIndex < 0 || perp >= MAX_DEPTH) {
				// Open sky/void: leave the floor-and-ceiling pass showing through.
				continue;
			}

			const tex = this.levelTextures[texIndex];
			const lineH = Math.floor(h / perp);
			let top = horizon - (lineH >> 1);
			let bottom = top + lineH;
			const drawTop = Math.max(0, top);
			const drawBottom = Math.min(h, bottom);
			if (drawBottom <= drawTop) continue;

			let texX = Math.floor((wallX + doorSlide) * TEX_SIZE) % TEX_SIZE;
			// Mirror on the two faces that would otherwise show the texture
			// reversed, so lettering and rivets line up around a corner.
			if ((side === 0 && rayX > 0) || (side === 1 && rayY < 0)) {
				texX = TEX_SIZE - 1 - texX;
			}

			const cellLight = map.light[map.index(mapX, mapY)];
			const level = this.lightFor(cellLight, perp, side, flash);
			const step = TEX_SIZE / lineH;
			let texPos = (drawTop - horizon + (lineH >> 1)) * step;
			const data = tex.data;
			const pixels = fb.pixels;

			for (let y = drawTop; y < drawBottom; y++) {
				// Textures are stored row-major; step down the column.
				const texY = texPos & (TEX_SIZE - 1);
				texPos += step;
				pixels[y * w + x] = shade(data[(texY << 6) | texX], level);
			}
		}
	}

	/**
	 * Distance fog plus the cell's own light level, quantised to the 32 shade
	 * steps the framebuffer's table provides. Side-facing walls get one step
	 * darker, which is the cheapest possible directional lighting and reads as
	 * corners having edges.
	 */
	private lightFor(cellLight: number, dist: number, side: number, flash: number): number {
		const base = (cellLight / 15) * 31;
		const fog = 1 / (1 + dist * dist * 0.012);
		let level = base * fog;
		if (side === 1) level -= 2.5;
		if (flash > 0) level += flash * 16 * Math.max(0, 1 - dist / 9);
		return level < 0 ? 0 : level > 31 ? 31 : level | 0;
	}

	/* ── Floors and ceilings ────────────────────────────────────────────── */

	private drawFloorAndCeiling(
		world: World,
		dirX: number,
		dirY: number,
		planeX: number,
		planeY: number,
		horizon: number,
	): void {
		const fb = this.fb;
		const map = world.map;
		const px = world.player.x;
		const py = world.player.y;
		const w = fb.width;
		const h = this.viewH;
		const pixels = fb.pixels;
		const flash = world.player.muzzleFlash;

		// Leftmost and rightmost rays; every row interpolates between them.
		const rayX0 = dirX - planeX;
		const rayY0 = dirY - planeY;
		const rayX1 = dirX + planeX;
		const rayY1 = dirY + planeY;

		for (let y = 0; y < h; y++) {
			const isFloor = y > horizon;
			// Rows exactly on the horizon project to infinity — skip them.
			const rowOffset = isFloor ? y - horizon : horizon - y;
			if (rowOffset <= 0) {
				pixels.fill(rgb(0, 0, 0), y * w, y * w + w);
				continue;
			}

			// Distance to the floor/ceiling strip this scanline lands on.
			const rowDist = (EYE * h) / rowOffset;
			if (rowDist > MAX_DEPTH) {
				pixels.fill(rgb(0, 0, 0), y * w, y * w + w);
				continue;
			}

			const stepX = (rowDist * (rayX1 - rayX0)) / w;
			const stepY = (rowDist * (rayY1 - rayY0)) / w;
			let fx = px + rowDist * rayX0;
			let fy = py + rowDist * rayY0;

			const row = y * w;
			for (let x = 0; x < w; x++) {
				const cx = Math.floor(fx);
				const cy = Math.floor(fy);
				let color: Color;
				let cellLight: number;

				if (map.inBounds(cx, cy)) {
					const i = map.index(cx, cy);
					const tex = this.levelTextures[isFloor ? map.floorTex[i] : map.ceilTex[i]];
					const tx = ((fx - cx) * TEX_SIZE) & (TEX_SIZE - 1);
					const ty = ((fy - cy) * TEX_SIZE) & (TEX_SIZE - 1);
					color = tex.data[(ty << 6) | tx];
					cellLight = map.light[i];
				} else {
					color = rgb(0, 0, 0);
					cellLight = 0;
				}

				const level = this.lightFor(cellLight, rowDist, 0, flash);
				pixels[row + x] = shade(color, level);
				fx += stepX;
				fy += stepY;
			}
		}
	}

	/* ── Sprites ────────────────────────────────────────────────────────── */

	private drawSprites(
		world: World,
		dirX: number,
		dirY: number,
		planeX: number,
		planeY: number,
		horizon: number,
	): void {
		const fb = this.fb;
		const p = world.player;
		const w = fb.width;
		const h = this.viewH;

		this.visible.length = 0;
		for (const e of world.entities) {
			if (e.removed) continue;
			const dx = e.x - p.x;
			const dy = e.y - p.y;
			const d = dx * dx + dy * dy;
			if (d > MAX_DEPTH * MAX_DEPTH) continue;
			this.visible.push({ e, dist: d });
		}
		// Painter's algorithm: far to near, so nearer sprites overwrite.
		this.visible.sort((a, b) => b.dist - a.dist);

		// Inverse of the [plane, dir] camera matrix, computed once.
		const invDet = 1 / (planeX * dirY - dirX * planeY);

		for (const { e } of this.visible) {
			const sprite = this.frameFor(e);
			if (!sprite) continue;

			const relX = e.x - p.x;
			const relY = e.y - p.y;
			const transX = invDet * (dirY * relX - dirX * relY);
			const transY = invDet * (-planeY * relX + planeX * relY);
			if (transY < 0.12) continue;

			const screenX = Math.round((w / 2) * (1 + transX / transY));
			// A world height of 1 spans `h / dist` pixels; the sprite's base sits
			// at its own z, so both edges come from the same projection.
			const bottom = horizon + (h * (EYE - e.z)) / transY;
			const top = horizon + (h * (EYE - e.z - e.height)) / transY;
			const spriteH = bottom - top;
			if (spriteH < 0.5) continue;
			const spriteW = spriteH * (sprite.w / sprite.h);

			const x0 = Math.round(screenX - spriteW / 2);
			const x1 = Math.round(screenX + spriteW / 2);
			const y0 = Math.round(top);
			const y1 = Math.round(bottom);
			if (x1 <= 0 || x0 >= w || y1 <= 0 || y0 >= h) continue;

			const cellLight = world.map.lightAt(e.x, e.y);
			// Effects are self-lit — an explosion shouldn't be dimmed by the room.
			const level =
				e.type === "effect" || e.type === "projectile"
					? 31
					: this.lightFor(cellLight, transY, 0, p.muzzleFlash);

			const drawX0 = Math.max(0, x0);
			const drawX1 = Math.min(w, x1);
			const drawY0 = Math.max(0, y0);
			const drawY1 = Math.min(h, y1);
			const invW = sprite.w / (x1 - x0);
			const invH = sprite.h / (y1 - y0);
			const pixels = fb.pixels;

			for (let x = drawX0; x < drawX1; x++) {
				// Behind a wall in this column? Then the whole strip is hidden.
				if (transY >= this.depth[x]) continue;
				const texX = ((x - x0) * invW) | 0;
				if (texX < 0 || texX >= sprite.w) continue;
				for (let y = drawY0; y < drawY1; y++) {
					const texY = ((y - y0) * invH) | 0;
					const c = sprite.data[texY * sprite.w + texX];
					// Alpha is all-or-nothing in these sprites.
					if ((c & 0xff000000) === 0) continue;
					pixels[y * w + x] = level === 31 ? c : shade(c, level);
				}
			}
		}
	}

	/** Current frame of an entity's animation strip. */
	private frameFor(e: Entity): Sprite | null {
		const strip = this.sprites[e.anim];
		if (!strip || strip.length === 0) return null;
		if (e.animFps <= 0) return strip[0];
		const raw = Math.floor(e.animTime * e.animFps);
		const index = e.animLoop
			? raw % strip.length
			: Math.min(strip.length - 1, raw);
		return strip[index];
	}

	/* ── First-person weapon ────────────────────────────────────────────── */

	private drawViewWeapon(world: World): void {
		const fb = this.fb;
		const p = world.player;
		if (p.dead) return;

		const def = WEAPONS[p.weapon];
		const strip = this.sprites[def.sprite];
		if (!strip) return;

		let frame = world.weapon.frame;
		// The chaingun alternates its two lit frames so the barrels appear to spin.
		if (p.weapon === "chaingun" && world.weapon.phase !== "idle") {
			frame = world.weapon.toggle ? 1 : 2;
		}
		const sprite = strip[Math.min(strip.length - 1, Math.max(0, frame))];
		if (!sprite) return;

		// Scale the view sprite to the framebuffer so it stays the same size on
		// screen whatever internal resolution we picked.
		const scale = fb.width / 320;
		const drawW = Math.round(sprite.w * scale);
		const drawH = Math.round(sprite.h * scale);
		const swayX = Math.sin(p.bob) * 3 * scale;
		const swayY = Math.abs(Math.cos(p.bob)) * 2.5 * scale;

		const x0 = Math.round((fb.width - drawW) / 2 + swayX);
		// The weapon rests on top of the status bar, not behind it.
		let y0 = Math.round(this.viewH - drawH + swayY + p.kick * scale);
		// Lowering/raising slides the weapon off the bottom of the screen.
		if (world.weapon.phase === "lowering") {
			y0 += Math.round(drawH * (1 - world.weapon.timer / 0.12));
		} else if (world.weapon.phase === "raising") {
			y0 += Math.round(drawH * (world.weapon.timer / 0.12));
		}

		const pixels = fb.pixels;
		const invW = sprite.w / drawW;
		const invH = sprite.h / drawH;
		const drawX0 = Math.max(0, x0);
		const drawX1 = Math.min(fb.width, x0 + drawW);
		const drawY0 = Math.max(0, y0);
		const drawY1 = Math.min(this.viewH, y0 + drawH);

		for (let y = drawY0; y < drawY1; y++) {
			const texY = ((y - y0) * invH) | 0;
			for (let x = drawX0; x < drawX1; x++) {
				const texX = ((x - x0) * invW) | 0;
				const c = sprite.data[texY * sprite.w + texX];
				if ((c & 0xff000000) === 0) continue;
				pixels[y * fb.width + x] = c;
			}
		}
	}

	/* ── Full-screen tints ──────────────────────────────────────────────── */

	private drawTints(world: World): void {
		const p = world.player;
		if (p.painFlash > 0.01) {
			this.fb.tintRect(0, 0, this.fb.width, this.viewH, rgb(190, 24, 18), p.painFlash * 0.45);
		}
		if (p.pickupFlash > 0.01) {
			this.fb.tintRect(0, 0, this.fb.width, this.viewH, rgb(220, 190, 90), p.pickupFlash * 0.18);
		}
		if (p.dead) {
			this.fb.tintRect(0, 0, this.fb.width, this.viewH, rgb(120, 0, 0), 0.35);
		}
	}

	present(): void {
		this.fb.present();
	}
}
