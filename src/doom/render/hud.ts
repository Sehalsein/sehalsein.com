import { drawText, drawTextCentered, drawTextRight, GLYPH_W } from "../art/font";
import { rgb, type Color, type Framebuffer } from "../engine/Framebuffer";
import type { World } from "../game/World";
import { WEAPONS, WEAPON_ORDER } from "../game/weapons";

/**
 * Status bar, automap and the between-level screens. All of it is drawn into
 * the same pixel buffer as the world, so the HUD sits on the game's pixel grid
 * rather than floating above it as crisp DOM text.
 */

const INK = rgb(226, 222, 210);
const DIM = rgb(128, 124, 118);
const SHADOW = rgb(12, 10, 12);
const BAR_BG = rgb(26, 24, 28);
const BAR_EDGE = rgb(62, 58, 62);
const RED = rgb(206, 54, 44);
const GREEN = rgb(96, 190, 88);
const GOLD = rgb(224, 194, 60);
const BLUE = rgb(74, 118, 232);

const KEY_COLORS = { red: RED, blue: BLUE, yellow: GOLD } as const;

export const HUD_HEIGHT = 30;

/**
 * Truncate text to a pixel budget. Messages come from level briefings and
 * pickup lines, and the framebuffer is only 320px wide — clipping here means a
 * long line degrades to an ellipsis instead of running off the screen.
 */
function clipToWidth(text: string, maxPixels: number): string {
	const perChar = GLYPH_W + 1;
	const max = Math.floor(maxPixels / perChar);
	if (text.length <= max) return text;
	return `${text.slice(0, Math.max(0, max - 3))}...`;
}

/** Health and armor drain from green to red as they fall. */
function vitalColor(value: number): Color {
	if (value > 60) return GREEN;
	if (value > 25) return GOLD;
	return RED;
}

export function drawHud(fb: Framebuffer, world: World): void {
	const p = world.player;
	const top = fb.height - HUD_HEIGHT;

	fb.fillRect(0, top, fb.width, HUD_HEIGHT, BAR_BG);
	fb.fillRect(0, top, fb.width, 1, BAR_EDGE);

	// Labels sit on their own row above the big numbers; a 30px bar fits a
	// 7px label and a 14px scale-2 value with a little air between them.
	const labelY = top + 5;
	const valueY = top + 14;

	drawText(fb, "health", 8, labelY, DIM, { shadow: SHADOW });
	drawText(fb, `${p.health}%`, 8, valueY, vitalColor(p.health), { scale: 2, shadow: SHADOW });

	drawText(fb, "armor", 74, labelY, DIM, { shadow: SHADOW });
	drawText(fb, `${p.armor}%`, 74, valueY, vitalColor(p.armor), { scale: 2, shadow: SHADOW });

	const def = WEAPONS[p.weapon];
	const ammoText = def.ammo ? `${p[def.ammo]}` : "--";
	drawText(fb, "ammo", 140, labelY, DIM, { shadow: SHADOW });
	drawText(fb, ammoText, 140, valueY, INK, { scale: 2, shadow: SHADOW });

	// Weapon slots — owned ones light up, the active one is underlined.
	let slotX = 196;
	for (let i = 0; i < WEAPON_ORDER.length; i++) {
		const id = WEAPON_ORDER[i];
		const owned = p.owned.has(id);
		const active = p.weapon === id;
		const color = active ? GOLD : owned ? INK : rgb(64, 60, 62);
		drawText(fb, `${i + 1}`, slotX, valueY, color, { shadow: SHADOW });
		if (active) fb.fillRect(slotX - 1, valueY + 9, 7, 1, GOLD);
		slotX += 12;
	}

	// Kill/secret tally on the label row, keycards on the value row, so the
	// two never collide however many keys are held.
	drawTextRight(
		fb,
		`k ${world.stats.kills}/${world.stats.killsTotal}  s ${world.stats.secrets}/${world.stats.secretsTotal}`,
		fb.width - 8,
		labelY,
		DIM,
		{ shadow: SHADOW },
	);

	let keyX = fb.width - 8;
	for (const key of ["red", "blue", "yellow"] as const) {
		if (!p.keys.has(key)) continue;
		fb.fillRect(keyX - 6, valueY, 6, 11, KEY_COLORS[key]);
		fb.strokeRect(keyX - 6, valueY, 6, 11, SHADOW);
		keyX -= 10;
	}

	if (world.messageTimer > 0 && world.message) {
		// Fade the last half-second so lines don't pop out of existence.
		const color = world.messageTimer > 0.5 ? INK : DIM;
		drawText(fb, clipToWidth(world.message, fb.width - 16), 8, 8, color, { shadow: SHADOW });
	}
}

/**
 * A small crosshair, only while the pointer is locked. `horizon` comes from the
 * renderer so the reticle tracks pitch and bob — it has to sit exactly where a
 * shot along the view angle lands, or aiming lies to the player.
 */
export function drawCrosshair(fb: Framebuffer, world: World, horizon: number): void {
	if (world.player.dead) return;
	const cx = fb.width >> 1;
	const cy = horizon;
	const c = rgb(180, 210, 170);
	fb.fillRect(cx - 4, cy, 3, 1, c);
	fb.fillRect(cx + 2, cy, 3, 1, c);
	fb.fillRect(cx, cy - 4, 1, 3, c);
	fb.fillRect(cx, cy + 2, 1, 3, c);
}

/**
 * Overhead automap of everything the player has seen. Drawn as lines rather
 * than filled cells, the way DOOM's was, so the layout reads at a glance.
 */
export function drawAutomap(fb: Framebuffer, world: World): void {
	const map = world.map;
	const p = world.player;
	const viewH = fb.height - HUD_HEIGHT;

	fb.fillRect(0, 0, fb.width, viewH, rgb(8, 8, 10));

	// Fit the whole level in view, then centre it.
	const scale = Math.min((fb.width - 20) / map.width, (viewH - 20) / map.height);
	const offX = (fb.width - map.width * scale) / 2;
	const offY = (viewH - map.height * scale) / 2;
	const sx = (cx: number) => offX + cx * scale;
	const sy = (cy: number) => offY + cy * scale;

	const WALL = rgb(150, 60, 48);
	const DOOR = rgb(196, 170, 70);
	const FLOOR = rgb(40, 40, 48);

	for (let cy = 0; cy < map.height; cy++) {
		for (let cx = 0; cx < map.width; cx++) {
			const i = map.index(cx, cy);
			if (!map.seen[i]) continue;
			if (!map.solid[i]) {
				fb.fillRect(sx(cx), sy(cy), Math.ceil(scale), Math.ceil(scale), FLOOR);
				continue;
			}
			const isDoor = map.doorIndex[i] >= 0;
			const color = isDoor ? DOOR : WALL;
			// Only draw the faces that border something the player has seen —
			// interior wall blocks would otherwise fill in as solid mush.
			if (cy > 0 && !map.solid[map.index(cx, cy - 1)]) {
				fb.line(sx(cx), sy(cy), sx(cx + 1), sy(cy), color);
			}
			if (cy < map.height - 1 && !map.solid[map.index(cx, cy + 1)]) {
				fb.line(sx(cx), sy(cy + 1), sx(cx + 1), sy(cy + 1), color);
			}
			if (cx > 0 && !map.solid[map.index(cx - 1, cy)]) {
				fb.line(sx(cx), sy(cy), sx(cx), sy(cy + 1), color);
			}
			if (cx < map.width - 1 && !map.solid[map.index(cx + 1, cy)]) {
				fb.line(sx(cx + 1), sy(cy), sx(cx + 1), sy(cy + 1), color);
			}
		}
	}

	// Keycards still on the floor, so you know what you're missing.
	for (const e of world.entities) {
		if (e.removed || e.type !== "item") continue;
		const key = e.kind === "keyRed" ? RED : e.kind === "keyBlue" ? BLUE : e.kind === "keyYellow" ? GOLD : null;
		if (!key) continue;
		if (!map.seen[map.index(Math.floor(e.x), Math.floor(e.y))]) continue;
		fb.fillRect(sx(e.x) - 1, sy(e.y) - 1, 3, 3, key);
	}

	// Player arrow
	const px = sx(p.x);
	const py = sy(p.y);
	const nose = 5;
	const ARROW = rgb(120, 230, 120);
	fb.line(
		px + Math.cos(p.angle) * nose,
		py + Math.sin(p.angle) * nose,
		px + Math.cos(p.angle + 2.5) * nose,
		py + Math.sin(p.angle + 2.5) * nose,
		ARROW,
	);
	fb.line(
		px + Math.cos(p.angle) * nose,
		py + Math.sin(p.angle) * nose,
		px + Math.cos(p.angle - 2.5) * nose,
		py + Math.sin(p.angle - 2.5) * nose,
		ARROW,
	);
	fb.line(
		px + Math.cos(p.angle + 2.5) * nose,
		py + Math.sin(p.angle + 2.5) * nose,
		px + Math.cos(p.angle - 2.5) * nose,
		py + Math.sin(p.angle - 2.5) * nose,
		ARROW,
	);

	drawText(fb, map.def.name, 8, 8, DIM, { shadow: SHADOW });
	drawTextRight(fb, "tab to close", fb.width - 8, 8, DIM, { shadow: SHADOW });
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function drawTitle(fb: Framebuffer, blink: boolean): void {
	fb.clear(rgb(14, 12, 16));
	const cx = fb.width >> 1;
	// The 5x7 font has no em dash and the buffer is only 320 wide, so every
	// line here is kept inside 52 characters and to plain ASCII.
	drawTextCentered(fb, "browser doom", cx, 26, RED, { scale: 3, shadow: SHADOW });
	drawTextCentered(fb, "a software renderer, written from scratch", cx, 56, DIM);
	drawTextCentered(fb, "every texture, sound and sprite made at boot", cx, 68, DIM);

	const lines = [
		"wasd / arrows  move",
		"mouse          look (click to lock)",
		"ctrl / click   fire",
		"space          open, use",
		"1-4 / [ ]      weapons",
		"tab            automap",
		"esc            pause",
	];
	let y = 90;
	for (const line of lines) {
		drawTextCentered(fb, line, cx, y, INK);
		y += 10;
	}

	if (blink) {
		drawTextCentered(fb, "press any key to begin", cx, 172, GOLD, { scale: 2, shadow: SHADOW });
	}
}

export function drawPaused(fb: Framebuffer): void {
	fb.tintRect(0, 0, fb.width, fb.height, rgb(0, 0, 0), 0.6);
	const cx = fb.width >> 1;
	drawTextCentered(fb, "paused", cx, fb.height / 2 - 20, INK, { scale: 3, shadow: SHADOW });
	drawTextCentered(fb, "esc to resume", cx, fb.height / 2 + 12, DIM);
	drawTextCentered(fb, "m to mute   r to restart level", cx, fb.height / 2 + 26, DIM);
}

export function drawDead(fb: Framebuffer, blink: boolean): void {
	const cx = fb.width >> 1;
	drawTextCentered(fb, "you died", cx, fb.height / 2 - 24, RED, { scale: 3, shadow: SHADOW });
	if (blink) {
		drawTextCentered(fb, "press enter to try again", cx, fb.height / 2 + 16, INK, { shadow: SHADOW });
	}
}

/** Between-level tally, in the spirit of DOOM's intermission screen. */
export function drawIntermission(
	fb: Framebuffer,
	world: World,
	nextName: string | null,
	blink: boolean,
): void {
	fb.clear(rgb(14, 12, 16));
	const cx = fb.width >> 1;
	const s = world.stats;

	drawTextCentered(fb, world.map.def.name, cx, 30, INK, { scale: 2, shadow: SHADOW });
	drawTextCentered(fb, "level complete", cx, 54, GOLD);

	const rows: [string, string][] = [
		["kills", `${s.killsTotal ? Math.round((s.kills / s.killsTotal) * 100) : 100}%`],
		["items", `${s.itemsTotal ? Math.round((s.items / s.itemsTotal) * 100) : 100}%`],
		["secrets", `${s.secretsTotal ? Math.round((s.secrets / s.secretsTotal) * 100) : 100}%`],
		["time", formatTime(s.time)],
		["par", formatTime(world.map.def.par)],
		["score", `${s.score}`],
	];

	let y = 84;
	const labelX = cx - 60;
	const valueX = cx + 60;
	for (const [label, value] of rows) {
		drawText(fb, label, labelX, y, DIM, { shadow: SHADOW });
		drawTextRight(fb, value, valueX, y, INK, { shadow: SHADOW });
		y += 14;
	}

	if (blink) {
		const prompt = nextName ? `press enter for ${nextName}` : "press enter";
		drawTextCentered(fb, prompt, cx, fb.height - 34, GOLD, { shadow: SHADOW });
	}
}

export function drawVictory(fb: Framebuffer, world: World, blink: boolean): void {
	fb.clear(rgb(12, 10, 14));
	const cx = fb.width >> 1;
	drawTextCentered(fb, "you made it out", cx, 46, GOLD, { scale: 3, shadow: SHADOW });
	drawTextCentered(fb, "three levels, one framebuffer, zero assets.", cx, 82, DIM);
	drawTextCentered(fb, `final score ${world.stats.score}`, cx, 104, INK, { scale: 2, shadow: SHADOW });
	if (blink) {
		drawTextCentered(fb, "press enter to play again", cx, fb.height - 40, INK, { shadow: SHADOW });
	}
}

/** Loading card shown while a level's geometry is being built. */
export function drawLoading(fb: Framebuffer, name: string, briefing: string): void {
	fb.clear(rgb(10, 9, 12));
	const cx = fb.width >> 1;
	drawTextCentered(fb, name, cx, fb.height / 2 - 16, INK, { scale: 2, shadow: SHADOW });
	drawTextCentered(fb, briefing, cx, fb.height / 2 + 12, DIM);
}
