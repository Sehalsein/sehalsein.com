/**
 * The stand-in face, drawn with Canvas2D.
 *
 * Following the same principle as `src/doom/art/*`: generate the art at boot
 * rather than committing binaries. Nothing here is downloaded and nothing is
 * checked in — the page is complete on a fresh clone.
 *
 * Canvas2D rather than an SVG data-URI because rasterising SVG goes through an
 * async `Image.decode()` whose behaviour differs under SwiftShader in the
 * headless probe. This is synchronous and deterministic, so `window.__me` is
 * steppable the moment it exists. It also doubles as the no-WebGL 2D fallback
 * renderer, so there is only ever one implementation of the artwork.
 *
 * This is a stand-in, not a likeness. It should read as a deliberate flat
 * illustration so the page looks finished; dropping in real Memoji PNGs
 * (see poses.ts) is an upgrade, not a rescue.
 *
 * Colours here are fixed and palette-independent — palette integration happens
 * entirely in the shader's tint/rim uniforms, so switching themes is a uniform
 * write rather than a re-raster.
 */

import * as THREE from "three";
import { POSES, type PoseId, type UV } from "./poses";
import { TAU } from "./math";

export const STANDIN_SIZE = 1024;

const SKIN_TOP = "#f0bd93";
const SKIN_BOTTOM = "#dda072";
const SKIN_SHADE = "#c9885d";
const STUBBLE = "rgba(70, 48, 38, 0.16)";
const HAIR = "#2f2622";
const HAIR_LIT = "#453931";
const INK = "#3a2c24";
const BLUSH = "rgba(214, 116, 94, 0.30)";
const SCLERA = "#fdfdfb";
const SHIRT = "#42525e";
const SHIRT_LIT = "#4e606e";
const MOUTH_DARK = "#7d3a3a";
const TEETH = "#fbf7f2";

/** Head height as a multiple of its half-width — heads are taller than wide. */
const HEAD_ASPECT = 0.335 / 0.3;

/**
 * Superellipse — between an ellipse and a rounded square. This single shape is
 * what gives the face its Memoji-ish rounded-rectangular silhouette; a plain
 * ellipse reads as an egg.
 */
function superellipse(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	a: number,
	b: number,
	n = 2.6,
	steps = 128,
): void {
	ctx.beginPath();
	const e = 2 / n;
	for (let i = 0; i <= steps; i++) {
		const t = (i / steps) * TAU;
		const c = Math.cos(t);
		const s = Math.sin(t);
		const x = cx + a * Math.sign(c) * Math.abs(c) ** e;
		const y = cy + b * Math.sign(s) * Math.abs(s) ** e;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.closePath();
}

function ellipse(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	rot = 0,
): void {
	ctx.beginPath();
	ctx.ellipse(cx, cy, rx, ry, rot, 0, TAU);
}

/**
 * Draws one pose at `size`×`size`.
 *
 * The canvas origin is top-left while calibration UVs are bottom-left, so every
 * y here is `(1 - v) * size`. `uv()` is the only place that conversion happens.
 */
export function drawStandin(
	ctx: CanvasRenderingContext2D,
	pose: PoseId,
	size: number,
	/**
	 * Draw the pupils into the artwork. Off for textures, where the rig supplies
	 * movable pupil quads; on for the no-WebGL fallback, which has no rig and
	 * would otherwise render a blank-eyed face.
	 */
	{ pupils = false }: { pupils?: boolean } = {},
): void {
	const cal = POSES[pose];
	const uv = (p: UV): [number, number] => [p[0] * size, (1 - p[1]) * size];
	const px = (f: number) => f * size;

	// the head box comes from the calibration, so the drawing and the eye quads
	// can never disagree about how big the head is
	const [hx, hy] = uv(cal.headCenter);
	const aw = px(cal.headHalfWidth);
	const ah = aw * HEAD_ASPECT;

	ctx.clearRect(0, 0, size, size);
	ctx.lineJoin = "round";
	ctx.lineCap = "round";

	// ── shoulders ────────────────────────────────────────────────────────────
	// A wedge rising from the bottom edge, drawn first so the head overlaps it.
	const shoulderTop = hy + ah * 0.86;
	const shirt = ctx.createLinearGradient(0, shoulderTop, 0, size);
	shirt.addColorStop(0, SHIRT_LIT);
	shirt.addColorStop(1, SHIRT);
	ctx.fillStyle = shirt;
	ctx.beginPath();
	ctx.moveTo(px(0.16), size);
	ctx.bezierCurveTo(px(0.2), shoulderTop + px(0.04), px(0.34), shoulderTop, hx, shoulderTop);
	ctx.bezierCurveTo(
		hx + aw * 0.9,
		shoulderTop,
		px(0.8),
		shoulderTop + px(0.04),
		px(0.84),
		size,
	);
	ctx.closePath();
	ctx.fill();

	// neck
	ctx.fillStyle = SKIN_SHADE;
	ctx.beginPath();
	ctx.moveTo(hx - aw * 0.3, hy + ah * 0.6);
	ctx.lineTo(hx + aw * 0.3, hy + ah * 0.6);
	ctx.lineTo(hx + aw * 0.26, shoulderTop + px(0.02));
	ctx.lineTo(hx - aw * 0.26, shoulderTop + px(0.02));
	ctx.closePath();
	ctx.fill();

	// ── ears ─────────────────────────────────────────────────────────────────
	ctx.fillStyle = SKIN_BOTTOM;
	ellipse(ctx, hx - aw * 0.99, hy + ah * 0.06, px(0.036), px(0.052));
	ctx.fill();
	ellipse(ctx, hx + aw * 0.99, hy + ah * 0.06, px(0.036), px(0.052));
	ctx.fill();

	// ── head ─────────────────────────────────────────────────────────────────
	const skin = ctx.createLinearGradient(0, hy - ah, 0, hy + ah);
	skin.addColorStop(0, SKIN_TOP);
	skin.addColorStop(1, SKIN_BOTTOM);
	superellipse(ctx, hx, hy, aw, ah);
	ctx.fillStyle = skin;
	ctx.fill();

	// jaw stubble — clipped to the head so it can be a loose blob
	ctx.save();
	superellipse(ctx, hx, hy, aw, ah);
	ctx.clip();
	ctx.fillStyle = STUBBLE;
	ctx.beginPath();
	ctx.moveTo(hx - aw, hy + ah * 0.12);
	ctx.quadraticCurveTo(hx, hy + ah * 0.62, hx + aw, hy + ah * 0.12);
	ctx.lineTo(hx + aw, hy + ah * 1.1);
	ctx.lineTo(hx - aw, hy + ah * 1.1);
	ctx.closePath();
	ctx.fill();
	ctx.restore();

	// ── hair ─────────────────────────────────────────────────────────────────
	ctx.save();
	superellipse(ctx, hx, hy, aw * 1.02, ah * 1.02);
	ctx.clip();
	ctx.fillStyle = HAIR;
	ctx.beginPath();
	// the temple stops above the brow line — drop it lower and the sideburn eats
	// the eyebrow, which costs the face most of its expression
	ctx.moveTo(hx - aw * 1.1, hy - ah * 0.4);
	// left temple up over the crown
	ctx.bezierCurveTo(
		hx - aw * 1.05,
		hy - ah * 0.95,
		hx + aw * 0.2,
		hy - ah * 1.25,
		hx + aw * 1.1,
		hy - ah * 0.62,
	);
	ctx.lineTo(hx + aw * 1.1, hy - ah * 1.2);
	ctx.lineTo(hx - aw * 1.1, hy - ah * 1.2);
	ctx.closePath();
	ctx.fill();
	// Fringe sweeping right across the forehead. It has to clear the brows —
	// drop it much lower and it eats them, and the face loses its expression.
	ctx.beginPath();
	ctx.moveTo(hx - aw * 0.95, hy - ah * 0.46);
	ctx.bezierCurveTo(
		hx - aw * 0.5,
		hy - ah * 0.24,
		hx + aw * 0.42,
		hy - ah * 0.36,
		hx + aw * 1.05,
		hy - ah * 0.72,
	);
	ctx.lineTo(hx + aw * 1.05, hy - ah * 1.0);
	ctx.lineTo(hx - aw * 0.95, hy - ah * 1.0);
	ctx.closePath();
	ctx.fill();
	// a single specular sweep so the hair isn't a flat silhouette
	ctx.strokeStyle = HAIR_LIT;
	ctx.lineWidth = px(0.022);
	ctx.beginPath();
	ctx.moveTo(hx - aw * 0.62, hy - ah * 0.72);
	ctx.quadraticCurveTo(hx - aw * 0.1, hy - ah * 0.9, hx + aw * 0.5, hy - ah * 0.74);
	ctx.stroke();
	ctx.restore();

	// ── blush ────────────────────────────────────────────────────────────────
	for (const s of [-1, 1]) {
		const bx = hx + s * aw * 0.62;
		const by = hy + ah * 0.24;
		const g = ctx.createRadialGradient(bx, by, 0, bx, by, px(0.075));
		g.addColorStop(0, BLUSH);
		g.addColorStop(1, "rgba(214, 116, 94, 0)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(bx, by, px(0.075), 0, TAU);
		ctx.fill();
	}

	// ── brows ────────────────────────────────────────────────────────────────
	// Angle carries most of the expression — raised for surprise, lowered and
	// softened for a smile.
	const browLift = pose === "surprised" ? px(0.05) : pose === "smile" ? px(0.012) : px(0.026);
	const browTilt = pose === "surprised" ? -0.1 : pose === "smile" ? 0.06 : 0.02;
	ctx.strokeStyle = HAIR;
	ctx.lineWidth = px(0.019);
	for (const s of [-1, 1]) {
		const bx = hx + s * aw * 0.5;
		const by = hy - ah * 0.24 - browLift;
		const w = px(0.072);
		ctx.beginPath();
		ctx.moveTo(bx - w, by + s * browTilt * px(0.4));
		ctx.quadraticCurveTo(bx, by - px(0.026), bx + w, by - s * browTilt * px(0.4));
		ctx.stroke();
	}

	// ── eyes ─────────────────────────────────────────────────────────────────
	if (cal.eyes) {
		// Only the sclera. The movable pupil, highlight and eyelid are separate
		// quads placed by rig.ts from this same calibration — that is what lets
		// the stand-in and real Memoji art run through identical code.
		for (const eye of [cal.eyes.left, cal.eyes.right]) {
			const [ex, ey] = uv(eye.center);
			const rx = px(eye.socket[0]);
			const ry = px(eye.socket[1]);
			ellipse(ctx, ex, ey, rx, ry);
			ctx.fillStyle = SCLERA;
			ctx.fill();
			ctx.strokeStyle = "rgba(58, 44, 36, 0.35)";
			ctx.lineWidth = px(0.005);
			ctx.stroke();
			// An upper lid line, clipped to the socket. Without it the whites read
			// as googly eyes stuck onto the face rather than set into it.
			ctx.save();
			ellipse(ctx, ex, ey, rx, ry);
			ctx.clip();
			ctx.strokeStyle = "rgba(58, 44, 36, 0.55)";
			ctx.lineWidth = px(0.011);
			ctx.beginPath();
			ctx.moveTo(ex - rx * 1.1, ey - ry * 0.42);
			ctx.quadraticCurveTo(ex, ey - ry * 1.15, ex + rx * 1.1, ey - ry * 0.42);
			ctx.stroke();
			ctx.restore();

			if (pupils) {
				ctx.fillStyle = cal.irisColor ?? "#2b2622";
				ctx.beginPath();
				ctx.arc(ex, ey, px(eye.pupilRadius), 0, TAU);
				ctx.fill();
				if (eye.highlightRadius > 0) {
					ctx.fillStyle = "rgba(255,255,255,0.9)";
					ctx.beginPath();
					ctx.arc(
						ex - px(eye.pupilTravel[0]) * 0.34,
						ey - px(eye.pupilTravel[1]) * 0.42,
						px(eye.highlightRadius),
						0,
						TAU,
					);
					ctx.fill();
				}
			}
		}
	} else {
		// closed eyes, for the blink/doze pose
		ctx.strokeStyle = INK;
		ctx.lineWidth = px(0.016);
		for (const s of [-1, 1]) {
			const ex = hx + s * aw * 0.3;
			const ey = hy - ah * 0.12;
			ctx.beginPath();
			ctx.moveTo(ex - px(0.05), ey);
			ctx.quadraticCurveTo(ex, ey + px(0.026), ex + px(0.05), ey);
			ctx.stroke();
		}
	}

	// ── nose ─────────────────────────────────────────────────────────────────
	// just the underside — a full outline reads as a scar rather than a nose
	ctx.strokeStyle = "rgba(58, 44, 36, 0.45)";
	ctx.lineWidth = px(0.013);
	ctx.beginPath();
	ctx.moveTo(hx + px(0.004), hy + ah * 0.1);
	ctx.quadraticCurveTo(hx - px(0.024), hy + ah * 0.26, hx + px(0.018), hy + ah * 0.26);
	ctx.stroke();

	// ── mouth ────────────────────────────────────────────────────────────────
	drawMouth(ctx, pose, hx, hy + ah * 0.5, px(1));

	// ── raised hand, for the wave ────────────────────────────────────────────
	if (cal.hand) {
		drawHand(ctx, cal.hand.anchor, uv, px);
	}
}

function drawMouth(
	ctx: CanvasRenderingContext2D,
	pose: PoseId,
	cx: number,
	cy: number,
	u: number,
): void {
	ctx.lineJoin = "round";
	ctx.lineCap = "round";

	if (pose === "surprised") {
		ellipse(ctx, cx, cy + 0.012 * u, 0.042 * u, 0.058 * u);
		ctx.fillStyle = MOUTH_DARK;
		ctx.fill();
		return;
	}

	if (pose === "smile" || pose === "wave") {
		const w = pose === "wave" ? 0.098 * u : 0.088 * u;
		const d = pose === "wave" ? 0.072 * u : 0.058 * u;
		ctx.beginPath();
		ctx.moveTo(cx - w, cy - 0.006 * u);
		ctx.quadraticCurveTo(cx, cy + d, cx + w, cy - 0.006 * u);
		ctx.quadraticCurveTo(cx, cy + 0.012 * u, cx - w, cy - 0.006 * u);
		ctx.closePath();
		ctx.fillStyle = MOUTH_DARK;
		ctx.fill();
		// upper teeth, clipped to the mouth so they never spill past the lip
		ctx.save();
		ctx.clip();
		ctx.fillStyle = TEETH;
		ctx.fillRect(cx - w, cy - 0.02 * u, w * 2, 0.026 * u);
		ctx.restore();
		return;
	}

	// neutral / blink — a soft, faintly upturned line
	ctx.strokeStyle = INK;
	ctx.lineWidth = 0.014 * u;
	ctx.beginPath();
	ctx.moveTo(cx - 0.058 * u, cy);
	ctx.quadraticCurveTo(cx, cy + 0.026 * u, cx + 0.058 * u, cy);
	ctx.stroke();
}

/** A raised open palm, for the wave pose. */
function drawHand(
	ctx: CanvasRenderingContext2D,
	anchor: UV,
	uv: (p: UV) => [number, number],
	px: (f: number) => number,
): void {
	const [ax, ay] = uv(anchor);

	// forearm, running down to the shoulder line
	ctx.strokeStyle = SKIN_BOTTOM;
	ctx.lineWidth = px(0.062);
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(ax - px(0.012), ay + px(0.06));
	ctx.quadraticCurveTo(ax + px(0.02), ay + px(0.2), ax - px(0.01), ay + px(0.3));
	ctx.stroke();

	// palm
	ctx.fillStyle = SKIN_TOP;
	superellipse(ctx, ax, ay, px(0.052), px(0.06), 2.4);
	ctx.fill();

	// four fingers fanned above the palm, plus a thumb off the left edge
	ctx.strokeStyle = SKIN_TOP;
	ctx.lineCap = "round";
	ctx.lineWidth = px(0.026);
	const spread = [-0.34, -0.11, 0.12, 0.35];
	for (let i = 0; i < spread.length; i++) {
		const a = -Math.PI / 2 + spread[i];
		const len = px(0.062) * (i === 3 ? 0.86 : 1);
		ctx.beginPath();
		ctx.moveTo(ax + Math.cos(a) * px(0.02), ay + Math.sin(a) * px(0.02));
		ctx.lineTo(ax + Math.cos(a) * (px(0.02) + len), ay + Math.sin(a) * (px(0.02) + len));
		ctx.stroke();
	}
	ctx.lineWidth = px(0.028);
	ctx.beginPath();
	ctx.moveTo(ax - px(0.03), ay + px(0.01));
	ctx.lineTo(ax - px(0.078), ay - px(0.018));
	ctx.stroke();

	// palm crease
	ctx.strokeStyle = "rgba(180, 120, 88, 0.5)";
	ctx.lineWidth = px(0.009);
	ctx.beginPath();
	ctx.moveTo(ax - px(0.024), ay + px(0.012));
	ctx.quadraticCurveTo(ax, ay + px(0.028), ax + px(0.026), ay + px(0.006));
	ctx.stroke();
}

/** Rasterises one pose into a texture, ready to hand to the face material. */
export function makeStandinTexture(pose: PoseId): THREE.CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = STANDIN_SIZE;
	canvas.height = STANDIN_SIZE;
	const ctx = canvas.getContext("2d");
	if (ctx) drawStandin(ctx, pose, STANDIN_SIZE);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.premultiplyAlpha = true;
	tex.needsUpdate = true;
	return tex;
}
