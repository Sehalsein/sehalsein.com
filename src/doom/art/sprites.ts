import { mix, rgb, type Color } from "../engine/Framebuffer";
import { Rng } from "../engine/rng";
import { Raster } from "./raster";

/**
 * Sprite atlas — monsters, pickups, props, projectiles and the first-person
 * weapons. Each frame is drawn parametrically (torso, limbs, muzzle flash) so
 * animation cycles come out of the pose arguments rather than hand-placed
 * pixels, and the whole atlas costs no download at all.
 *
 * Pixels with alpha 0 are transparent; the renderer skips them.
 */

export interface Sprite {
	readonly w: number;
	readonly h: number;
	readonly data: Uint32Array;
}

const OUTLINE = rgb(10, 9, 12);

function toSprite(r: Raster, outline = true): Sprite {
	if (outline) r.outline(OUTLINE);
	return { w: r.w, h: r.h, data: r.data };
}

/* ── Humanoids: the husk trooper and the heavier brute ──────────────── */

interface Humanoid {
	armor: Color;
	armorDark: Color;
	armorLight: Color;
	skin: Color;
	visor: Color;
	gun: Color;
	scale: number;
}

const TROOPER: Humanoid = {
	armor: rgb(88, 104, 62),
	armorDark: rgb(48, 60, 34),
	armorLight: rgb(126, 146, 92),
	skin: rgb(158, 156, 132),
	visor: rgb(206, 62, 48),
	gun: rgb(58, 60, 66),
	scale: 1,
};

const BRUTE: Humanoid = {
	armor: rgb(124, 74, 46),
	armorDark: rgb(70, 40, 24),
	armorLight: rgb(172, 112, 70),
	skin: rgb(178, 148, 116),
	visor: rgb(232, 176, 52),
	gun: rgb(74, 66, 58),
	scale: 1.25,
};

interface Pose {
	/** -1 .. 1 — left leg forward through right leg forward. */
	stride: number;
	/** 0 = arms down, 1 = weapon levelled at the player. */
	aim: number;
	/** Vertical body offset in pixels; walk bob and flinches use it. */
	bob: number;
	/** Backward head/torso tilt, for pain frames. */
	flinch: number;
}

function drawHumanoid(h: Humanoid, pose: Pose): Raster {
	const w = Math.round(40 * h.scale);
	const ht = Math.round(56 * h.scale);
	const r = new Raster(w, ht);
	const s = h.scale;
	const cx = w / 2;
	const ground = ht - 1;
	const bob = pose.bob * s;
	const lean = pose.flinch * s;

	// Legs — the stride swings the feet apart and drops the hips slightly.
	const hipY = ground - 20 * s + bob;
	const swing = pose.stride * 6 * s;
	r.limb(cx - 4 * s, hipY, cx - 5 * s - swing, ground - 2 * s, 6 * s, h.armorDark);
	r.limb(cx + 4 * s, hipY, cx + 5 * s + swing, ground - 2 * s, 6 * s, h.armorDark);
	r.rect(cx - 9 * s - swing, ground - 3 * s, 8 * s, 3 * s, rgb(32, 30, 32));
	r.rect(cx + 1 * s + swing, ground - 3 * s, 8 * s, 3 * s, rgb(32, 30, 32));

	// Torso.
	const torsoY = ground - 30 * s + bob;
	r.ellipse(cx + lean * 0.3, torsoY, 9 * s, 11 * s, h.armor);
	r.ellipse(cx - 3 * s + lean * 0.3, torsoY, 4 * s, 9 * s, h.armorLight);
	r.rect(cx - 9 * s, torsoY + 6 * s, 18 * s, 2 * s, h.armorDark);
	// Shoulder pads.
	r.ellipse(cx - 10 * s, torsoY - 7 * s, 5 * s, 4 * s, h.armorLight);
	r.ellipse(cx + 10 * s, torsoY - 7 * s, 5 * s, 4 * s, h.armorLight);

	// Head: helmet shell over a glowing visor band.
	const headY = ground - 46 * s + bob - lean * 0.6;
	r.ellipse(cx + lean, headY, 7 * s, 7 * s, h.skin);
	r.ellipse(cx + lean, headY - 2 * s, 7.5 * s, 5 * s, h.armor);
	r.rect(cx - 6 * s + lean, headY, 12 * s, 3 * s, rgb(26, 24, 26));
	r.rect(cx - 5 * s + lean, headY, 4 * s, 2 * s, h.visor);
	r.rect(cx + 2 * s + lean, headY, 4 * s, 2 * s, h.visor);
	if (h === BRUTE) {
		// Horns.
		r.limb(cx - 7 * s, headY - 5 * s, cx - 11 * s, headY - 11 * s, 3 * s, rgb(214, 200, 168));
		r.limb(cx + 7 * s, headY - 5 * s, cx + 11 * s, headY - 11 * s, 3 * s, rgb(214, 200, 168));
	}

	// Arms and weapon. At aim = 1 the gun points straight at the camera.
	const shoulderY = torsoY - 5 * s;
	const handY = shoulderY + (1 - pose.aim) * 12 * s;
	const handX = cx + 12 * s - pose.aim * 4 * s;
	r.limb(cx - 9 * s, shoulderY, cx - 12 * s, handY + 2 * s, 5 * s, h.armor);
	r.limb(cx + 9 * s, shoulderY, handX, handY, 5 * s, h.armor);
	if (pose.aim > 0.4) {
		// Rifle, foreshortened: a short body plus the muzzle ring facing us.
		r.rect(cx - 13 * s, handY - 2 * s, 26 * s, 4 * s, h.gun);
		r.rect(cx - 4 * s, handY - 4 * s, 9 * s, 3 * s, rgb(40, 42, 48));
		r.circle(cx + 13 * s, handY, 2.5 * s, rgb(24, 24, 28));
	} else {
		r.rect(cx + 8 * s, handY - 2 * s, 12 * s, 4 * s, h.gun);
	}

	return r;
}

function drawHumanoidDeath(h: Humanoid, stage: number): Raster {
	const w = Math.round(40 * h.scale);
	const ht = Math.round(56 * h.scale);
	const r = new Raster(w, ht);
	const s = h.scale;
	const cx = w / 2;
	const ground = ht - 1;
	// 0 = still upright and reeling, 1 = flat on the floor.
	const t = stage / 4;
	const bodyY = ground - (30 - 26 * t) * s;
	const spread = 1 + t * 1.9;
	const squash = 1 - t * 0.72;

	if (t < 0.95) {
		r.limb(cx - 4 * s, bodyY + 8 * s * squash, cx - (6 + 10 * t) * s, ground - 2 * s, 6 * s, h.armorDark);
		r.limb(cx + 4 * s, bodyY + 8 * s * squash, cx + (6 + 10 * t) * s, ground - 2 * s, 6 * s, h.armorDark);
	} else {
		r.limb(cx - 12 * s, ground - 3 * s, cx - 2 * s, ground - 2 * s, 5 * s, h.armorDark);
		r.limb(cx + 12 * s, ground - 3 * s, cx + 2 * s, ground - 2 * s, 5 * s, h.armorDark);
	}

	r.ellipse(cx, bodyY, 9 * s * spread * 0.8, 11 * s * squash, h.armor);
	r.ellipse(cx - 2 * s, bodyY, 4 * s, 8 * s * squash, h.armorLight);
	// Arms flung outward as the body drops.
	r.limb(cx - 8 * s, bodyY - 3 * s * squash, cx - (12 + 8 * t) * s, bodyY + 4 * s * t, 4 * s, h.armor);
	r.limb(cx + 8 * s, bodyY - 3 * s * squash, cx + (12 + 8 * t) * s, bodyY + 4 * s * t, 4 * s, h.armor);

	const headY = bodyY - (14 - 12 * t) * s;
	r.ellipse(cx + t * 8 * s, headY, 7 * s, 7 * s * (1 - t * 0.25), h.skin);
	r.ellipse(cx + t * 8 * s, headY - 2 * s, 7.5 * s, 4 * s, h.armor);

	// Blood spreads under the corpse in the last two frames.
	if (stage >= 3) {
		const blood = rgb(120, 20, 22);
		r.ellipse(cx, ground - 1 * s, (14 + stage * 3) * s, 3 * s, blood);
		r.ellipse(cx - 8 * s, ground - 2 * s, 5 * s, 2 * s, rgb(150, 30, 30));
	}
	return r;
}

/* ── Hound: the quadruped that closes distance and bites ────────────── */

function drawHound(pose: { stride: number; bite: number; bob: number }): Raster {
	const r = new Raster(46, 34);
	const fur = rgb(102, 54, 40);
	const furDark = rgb(56, 28, 22);
	const furLight = rgb(142, 84, 62);
	const ground = r.h - 1;
	const bodyY = ground - 14 + pose.bob;
	const swing = pose.stride * 5;

	// Legs, front pair counter-swinging the back pair.
	r.limb(15, bodyY + 4, 13 - swing, ground - 1, 5, furDark);
	r.limb(31, bodyY + 4, 33 + swing, ground - 1, 5, furDark);
	r.limb(19, bodyY + 4, 21 + swing, ground - 1, 4, fur);
	r.limb(27, bodyY + 4, 25 - swing, ground - 1, 4, fur);

	// Barrel body and spine ridge.
	r.ellipse(24, bodyY, 13, 8, fur);
	r.ellipse(24, bodyY - 4, 11, 3, furLight);
	for (let i = 0; i < 5; i++) r.rect(18 + i * 3, bodyY - 9 + (i % 2), 2, 4, rgb(210, 198, 170));

	// Tail.
	r.limb(36, bodyY - 2, 44, bodyY - 8 - pose.stride * 3, 3, furDark);

	// Head, lower and jaws open when biting.
	const headX = 12 - pose.bite * 2;
	const headY = bodyY - 2 + pose.bite * 2;
	r.ellipse(headX, headY, 8, 6, fur);
	r.ellipse(headX - 4, headY + 1, 5, 4, furLight);
	// Eyes.
	r.rect(headX - 1, headY - 3, 2, 2, rgb(248, 196, 68));
	r.rect(headX + 3, headY - 3, 2, 2, rgb(248, 196, 68));
	// Jaws.
	const gape = 1 + pose.bite * 5;
	r.ellipse(headX - 6, headY + 2, 5, 2 + gape * 0.4, rgb(120, 24, 26));
	for (let i = 0; i < 4; i++) {
		r.rect(headX - 9 + i * 2, headY + 1 - gape * 0.5, 1, 3, rgb(232, 226, 206));
		r.rect(headX - 9 + i * 2, headY + 3 + gape * 0.5, 1, 3, rgb(232, 226, 206));
	}
	return r;
}

function drawHoundDeath(stage: number): Raster {
	const r = new Raster(46, 34);
	const fur = rgb(102, 54, 40);
	const furDark = rgb(56, 28, 22);
	const ground = r.h - 1;
	const t = stage / 3;
	const bodyY = ground - (14 - 11 * t);
	r.limb(16, bodyY, 10 - t * 6, ground - 1 - t * 4, 4, furDark);
	r.limb(30, bodyY, 36 + t * 6, ground - 1 - t * 4, 4, furDark);
	r.ellipse(24, bodyY, 13 + t * 4, 8 - t * 5, fur);
	r.ellipse(12 - t * 4, bodyY + t * 2, 8 - t, 6 - t * 3, fur);
	if (stage >= 2) {
		r.ellipse(24, ground - 1, 18 + stage * 3, 3, rgb(120, 20, 22));
	}
	return r;
}

/* ── Imp: hovers, lobs fireballs ────────────────────────────────────── */

function drawImp(pose: { bob: number; throwT: number }): Raster {
	const r = new Raster(38, 50);
	const hide = rgb(128, 76, 54);
	const hideDark = rgb(72, 40, 28);
	const hideLight = rgb(168, 108, 74);
	const cx = r.w / 2;
	const bodyY = 30 + pose.bob;

	// Hunched torso with a ribbed belly.
	r.ellipse(cx, bodyY, 11, 12, hide);
	r.ellipse(cx, bodyY + 3, 7, 8, hideLight);
	for (let i = 0; i < 4; i++) r.rect(cx - 6, bodyY - 2 + i * 4, 12, 1, hideDark);

	// Dangling legs — it never touches the floor.
	r.limb(cx - 5, bodyY + 9, cx - 7, bodyY + 18, 4, hideDark);
	r.limb(cx + 5, bodyY + 9, cx + 8, bodyY + 17, 4, hideDark);
	r.rect(cx - 10, bodyY + 17, 5, 2, rgb(226, 214, 186));
	r.rect(cx + 6, bodyY + 16, 5, 2, rgb(226, 214, 186));

	// Head: brow ridge, horns, glowing eyes.
	const headY = bodyY - 16;
	r.ellipse(cx, headY, 8, 7, hide);
	r.ellipse(cx, headY - 3, 8, 3, hideDark);
	r.limb(cx - 6, headY - 4, cx - 10, headY - 11, 3, rgb(222, 208, 176));
	r.limb(cx + 6, headY - 4, cx + 10, headY - 11, 3, rgb(222, 208, 176));
	r.rect(cx - 5, headY - 1, 3, 2, rgb(255, 238, 170));
	r.rect(cx + 2, headY - 1, 3, 2, rgb(255, 238, 170));
	// Mouth.
	r.rect(cx - 4, headY + 3, 8, 2, rgb(96, 20, 22));
	for (let i = 0; i < 4; i++) r.rect(cx - 4 + i * 2, headY + 3, 1, 2, rgb(238, 230, 210));

	// Arms: the throwing arm winds back then comes forward with a flame.
	const t = pose.throwT;
	const handX = cx + 12 + t * 4;
	const handY = bodyY - 6 - (1 - t) * 8;
	r.limb(cx - 9, bodyY - 4, cx - 15, bodyY + 4, 4, hide);
	r.limb(cx + 9, bodyY - 4, handX, handY, 4, hide);
	if (t > 0.15) {
		const flame = 3 + t * 4;
		r.circle(handX + 2, handY, flame, rgb(250, 176, 56));
		r.circle(handX + 2, handY, flame * 0.55, rgb(255, 240, 190));
	}
	return r;
}

function drawImpDeath(stage: number): Raster {
	const r = new Raster(38, 50);
	const hide = rgb(128, 76, 54);
	const hideDark = rgb(72, 40, 28);
	const cx = r.w / 2;
	const t = stage / 3;
	// It falls out of the air as it dies.
	const bodyY = 30 + t * 14;
	r.ellipse(cx, bodyY, 11 + t * 5, 12 - t * 8, hide);
	r.limb(cx - 9, bodyY, cx - 15 - t * 4, bodyY + 4 + t * 3, 4, hideDark);
	r.limb(cx + 9, bodyY, cx + 15 + t * 4, bodyY + 4 + t * 3, 4, hideDark);
	const headY = bodyY - (16 - t * 14);
	r.ellipse(cx + t * 6, headY, 8 - t * 2, 7 - t * 3, hide);
	if (stage >= 2) r.ellipse(cx, 48, 14 + stage * 3, 3, rgb(120, 20, 22));
	return r;
}

/* ── Pickups and props ──────────────────────────────────────────────── */

function drawMedkit(): Raster {
	const r = new Raster(24, 20);
	r.bevel(2, 4, 20, 15, rgb(228, 226, 218), rgb(255, 255, 250), rgb(150, 148, 142));
	r.rect(2, 4, 20, 3, rgb(196, 194, 186));
	r.rect(10, 8, 4, 8, rgb(206, 42, 38));
	r.rect(7, 10, 10, 4, rgb(206, 42, 38));
	r.rect(9, 2, 6, 3, rgb(120, 118, 112));
	return r;
}

function drawStimpack(): Raster {
	const r = new Raster(16, 16);
	r.bevel(4, 4, 8, 11, rgb(206, 216, 232), rgb(246, 250, 255), rgb(130, 140, 156));
	r.rect(5, 6, 6, 7, rgb(88, 176, 220));
	r.rect(6, 1, 4, 4, rgb(180, 186, 198));
	r.rect(7, 0, 2, 2, rgb(230, 234, 244));
	return r;
}

function drawArmor(): Raster {
	const r = new Raster(24, 22);
	const green = rgb(58, 156, 76);
	r.ellipse(12, 12, 9, 9, green);
	r.rect(3, 4, 18, 9, green);
	r.rect(3, 4, 18, 2, rgb(120, 220, 140));
	r.rect(10, 4, 4, 16, rgb(24, 96, 44));
	// Chest lamp.
	r.rect(9, 9, 6, 4, rgb(180, 250, 200));
	r.rect(10, 10, 4, 2, rgb(255, 255, 255));
	return r;
}

function drawClip(): Raster {
	const r = new Raster(16, 12);
	r.bevel(2, 4, 12, 7, rgb(150, 118, 54), rgb(206, 174, 96), rgb(88, 66, 28));
	for (let i = 0; i < 4; i++) r.rect(3 + i * 3, 2, 2, 3, rgb(214, 186, 110));
	return r;
}

function drawShellBox(): Raster {
	const r = new Raster(20, 14);
	r.bevel(1, 3, 18, 10, rgb(120, 46, 40), rgb(170, 74, 62), rgb(70, 24, 22));
	for (let i = 0; i < 5; i++) {
		r.rect(3 + i * 3, 1, 2, 4, rgb(196, 60, 48));
		r.rect(3 + i * 3, 1, 2, 1, rgb(220, 190, 96));
	}
	return r;
}

function drawShotgunPickup(): Raster {
	const r = new Raster(34, 14);
	r.rect(3, 6, 26, 3, rgb(64, 66, 72));
	r.rect(3, 4, 20, 2, rgb(96, 100, 108));
	r.rect(22, 7, 10, 4, rgb(112, 76, 44));
	r.rect(8, 9, 12, 3, rgb(132, 90, 52));
	r.rect(1, 5, 3, 5, rgb(38, 40, 44));
	return r;
}

function drawChaingunPickup(): Raster {
	const r = new Raster(34, 18);
	r.rect(4, 7, 22, 6, rgb(72, 74, 80));
	for (let i = 0; i < 4; i++) r.rect(0, 6 + i * 2, 8, 1, rgb(120, 124, 132));
	r.circle(6, 10, 4, rgb(48, 50, 56));
	r.rect(24, 5, 8, 10, rgb(58, 60, 66));
	r.rect(26, 13, 4, 5, rgb(112, 76, 44));
	r.rect(10, 3, 10, 4, rgb(90, 94, 102));
	return r;
}

function drawKeycard(color: Color): Raster {
	const r = new Raster(14, 18);
	r.bevel(2, 2, 10, 14, color, mix(color, rgb(255, 255, 255), 0.4), mix(color, rgb(0, 0, 0), 0.45));
	r.rect(4, 5, 6, 3, rgb(240, 240, 240));
	r.rect(4, 10, 6, 1, mix(color, rgb(0, 0, 0), 0.5));
	r.rect(4, 12, 4, 1, mix(color, rgb(0, 0, 0), 0.5));
	return r;
}

function drawBarrel(rng: Rng): Raster {
	const r = new Raster(24, 34);
	const green = rgb(96, 122, 52);
	r.rect(3, 4, 18, 29, green);
	r.ellipse(12, 4, 9, 3, rgb(128, 156, 74));
	r.rect(3, 4, 3, 29, rgb(132, 160, 78));
	r.rect(18, 4, 3, 29, rgb(56, 74, 30));
	for (const y of [11, 24]) {
		r.rect(3, y, 18, 3, rgb(72, 92, 40));
		r.rect(3, y, 18, 1, rgb(140, 168, 84));
	}
	// Hazard trefoil, roughly.
	r.circle(12, 18, 3, rgb(226, 200, 60));
	for (let i = 0; i < 3; i++) {
		const a = (i / 3) * Math.PI * 2;
		r.ellipse(12 + Math.cos(a) * 5, 18 + Math.sin(a) * 5, 2.5, 2.5, rgb(226, 200, 60));
	}
	r.grain(rng, 6);
	return r;
}

function drawColumn(rng: Rng): Raster {
	const r = new Raster(26, 56);
	r.rect(4, 2, 18, 52, rgb(112, 110, 104));
	r.rect(4, 2, 5, 52, rgb(146, 144, 136));
	r.rect(18, 2, 4, 52, rgb(70, 68, 64));
	r.rect(1, 0, 24, 5, rgb(128, 126, 118));
	r.rect(1, 50, 24, 6, rgb(128, 126, 118));
	for (let y = 8; y < 48; y += 6) r.rect(6, y, 14, 1, rgb(86, 84, 80));
	r.grain(rng, 7);
	return r;
}

function drawLamp(): Raster {
	const r = new Raster(18, 44);
	r.rect(6, 14, 6, 28, rgb(78, 80, 86));
	r.rect(3, 40, 12, 4, rgb(58, 60, 66));
	r.ellipse(9, 10, 7, 9, rgb(250, 232, 150));
	r.ellipse(9, 10, 4, 6, rgb(255, 254, 226));
	r.rect(2, 8, 14, 2, rgb(255, 250, 200));
	return r;
}

function drawGorePile(rng: Rng): Raster {
	const r = new Raster(28, 14);
	r.ellipse(14, 11, 13, 3, rgb(112, 20, 22));
	r.ellipse(10, 8, 6, 4, rgb(146, 40, 36));
	r.ellipse(19, 9, 5, 3, rgb(126, 28, 28));
	r.ellipse(9, 6, 3, 3, rgb(216, 208, 186));
	r.grain(rng, 8);
	return r;
}

/* ── Projectiles and effects ────────────────────────────────────────── */

function drawFireball(frame: number): Raster {
	const r = new Raster(20, 20);
	const pulse = 1 + Math.sin((frame / 3) * Math.PI * 2) * 0.15;
	r.circle(10, 10, 8 * pulse, rgb(190, 60, 20));
	r.circle(10, 10, 6 * pulse, rgb(250, 150, 40));
	r.circle(10, 10, 3.5 * pulse, rgb(255, 244, 200));
	// Trailing licks of flame, rotated per frame.
	for (let i = 0; i < 5; i++) {
		const a = (i / 5) * Math.PI * 2 + frame * 0.7;
		r.circle(10 + Math.cos(a) * 8, 10 + Math.sin(a) * 8, 1.6, rgb(248, 176, 60));
	}
	return r;
}

function drawExplosion(frame: number, rng: Rng): Raster {
	const r = new Raster(56, 56);
	const t = frame / 4;
	const radius = 6 + t * 24;
	const fade = 1 - t;
	r.circle(28, 28, radius, mix(rgb(60, 40, 36), rgb(230, 120, 30), fade));
	r.circle(28, 28, radius * 0.7, mix(rgb(120, 60, 30), rgb(255, 200, 90), fade));
	if (frame < 3) r.circle(28, 28, radius * 0.35, rgb(255, 250, 220));
	// Debris flung outward.
	for (let i = 0; i < 14; i++) {
		const a = rng.next() * Math.PI * 2;
		const d = radius * (0.8 + rng.next() * 0.5);
		r.rect(28 + Math.cos(a) * d, 28 + Math.sin(a) * d, 2, 2, rgb(60, 50, 46));
	}
	return r;
}

function drawBloodPuff(frame: number, rng: Rng): Raster {
	const r = new Raster(24, 24);
	const t = frame / 2;
	const spread = 4 + t * 7;
	for (let i = 0; i < 10; i++) {
		const a = rng.next() * Math.PI * 2;
		const d = rng.next() * spread;
		r.circle(12 + Math.cos(a) * d, 12 + Math.sin(a) * d - t * 3, 2.6 - t, rgb(158, 24, 26));
	}
	return r;
}

function drawSparkPuff(frame: number, rng: Rng): Raster {
	const r = new Raster(18, 18);
	const t = frame / 2;
	for (let i = 0; i < 8; i++) {
		const a = rng.next() * Math.PI * 2;
		const d = rng.next() * (3 + t * 6);
		const grey = 150 - t * 60;
		r.circle(9 + Math.cos(a) * d, 9 + Math.sin(a) * d, 2.2 - t, rgb(grey, grey, grey + 10));
	}
	if (frame === 0) r.circle(9, 9, 3, rgb(255, 236, 180));
	return r;
}

/* ── First-person weapon frames ─────────────────────────────────────── */

const VIEW_W = 132;
const VIEW_H = 92;

function muzzleFlash(r: Raster, x: number, y: number, size: number): void {
	r.circle(x, y, size, rgb(250, 190, 60));
	r.circle(x, y, size * 0.6, rgb(255, 244, 200));
	for (let i = 0; i < 6; i++) {
		const a = (i / 6) * Math.PI * 2 + 0.4;
		r.limb(x, y, x + Math.cos(a) * size * 1.8, y + Math.sin(a) * size * 1.8, 3, rgb(252, 214, 120));
	}
}

function drawFist(punch: number): Raster {
	const r = new Raster(VIEW_W, VIEW_H);
	const skin = rgb(206, 162, 124);
	const skinDark = rgb(146, 104, 76);
	const x = 84 - punch * 26;
	const y = 62 - punch * 30;
	r.limb(120, VIEW_H - 2, x + 10, y + 14, 18, skinDark);
	r.ellipse(x, y, 15, 13, skin);
	r.ellipse(x - 3, y - 3, 11, 7, rgb(226, 186, 148));
	for (let i = 0; i < 4; i++) r.rect(x - 13 + i * 7, y - 5, 5, 6, skinDark);
	// A glove strap across the knuckles.
	r.rect(x - 14, y + 4, 28, 4, rgb(78, 62, 52));
	return r;
}

function drawPistol(state: "idle" | "fire" | "recoil"): Raster {
	const r = new Raster(VIEW_W, VIEW_H);
	const metal = rgb(72, 74, 82);
	const metalDark = rgb(40, 42, 48);
	const metalLight = rgb(122, 126, 136);
	const drop = state === "recoil" ? 8 : state === "fire" ? -4 : 0;
	const cx = 66;
	const top = 30 + drop;

	// Slide, frame, grip.
	r.bevel(cx - 9, top, 18, 34, metal, metalLight, metalDark);
	r.bevel(cx - 6, top - 12, 12, 14, metalDark, metal, rgb(24, 26, 30));
	r.rect(cx - 3, top - 16, 6, 5, metalLight);
	r.bevel(cx - 12, top + 30, 24, 26, rgb(58, 46, 38), rgb(96, 76, 60), rgb(34, 26, 22));
	// Hands wrapped round the grip.
	const skin = rgb(206, 162, 124);
	r.ellipse(cx - 13, top + 42, 10, 11, skin);
	r.ellipse(cx + 13, top + 44, 9, 10, rgb(186, 144, 108));
	r.rect(cx - 20, top + 50, 42, 8, rgb(196, 152, 116));
	if (state === "fire") muzzleFlash(r, cx, top - 18, 13);
	return r;
}

function drawShotgun(state: "idle" | "fire" | "pump" | "pump2"): Raster {
	const r = new Raster(VIEW_W, VIEW_H);
	const metal = rgb(64, 66, 72);
	const metalLight = rgb(110, 114, 124);
	const wood = rgb(112, 74, 44);
	const woodDark = rgb(74, 48, 28);
	const drop = state === "fire" ? -6 : state === "pump" ? 12 : state === "pump2" ? 6 : 0;
	const cx = 62;
	const top = 26 + drop;

	// Twin barrels.
	r.bevel(cx - 11, top, 9, 42, metal, metalLight, rgb(34, 36, 40));
	r.bevel(cx + 2, top, 9, 42, metal, metalLight, rgb(34, 36, 40));
	r.circle(cx - 6, top + 1, 4, rgb(20, 20, 24));
	r.circle(cx + 7, top + 1, 4, rgb(20, 20, 24));
	// Receiver and pump grip; the pump slides back on the reload frames.
	r.bevel(cx - 14, top + 40, 28, 16, metal, metalLight, rgb(30, 32, 36));
	const pumpY = top + 20 + (state === "pump" ? 14 : state === "pump2" ? 6 : 0);
	r.bevel(cx - 13, pumpY, 26, 12, wood, rgb(150, 104, 62), woodDark);
	// Stock and hands.
	r.bevel(cx - 6, top + 54, 34, 20, wood, rgb(150, 104, 62), woodDark);
	r.ellipse(cx - 12, pumpY + 8, 11, 10, rgb(200, 156, 120));
	r.ellipse(cx + 20, top + 62, 10, 10, rgb(186, 144, 108));
	if (state === "fire") {
		muzzleFlash(r, cx - 6, top - 6, 15);
		muzzleFlash(r, cx + 7, top - 4, 13);
	}
	return r;
}

function drawChaingun(state: "idle" | "fireA" | "fireB"): Raster {
	const r = new Raster(VIEW_W, VIEW_H);
	const metal = rgb(70, 72, 80);
	const metalLight = rgb(118, 122, 132);
	const cx = 64;
	const top = 22 + (state === "idle" ? 0 : -3);
	const spin = state === "fireB" ? 3 : 0;

	// Barrel cluster — the offset shifts between the two firing frames so the
	// assembly reads as spinning.
	for (let i = 0; i < 5; i++) {
		const x = cx - 20 + ((i * 9 + spin) % 45);
		r.bevel(x, top, 7, 34, metal, metalLight, rgb(34, 36, 40));
		r.circle(x + 3, top + 1, 3, rgb(18, 18, 22));
	}
	r.bevel(cx - 24, top + 32, 50, 18, rgb(56, 58, 64), metalLight, rgb(28, 30, 34));
	r.bevel(cx - 10, top + 48, 22, 26, rgb(48, 50, 56), rgb(88, 92, 100), rgb(26, 28, 32));
	// Ammo belt.
	for (let i = 0; i < 6; i++) {
		r.rect(cx + 24, top + 36 + i * 8, 8, 5, rgb(158, 128, 60));
		r.rect(cx + 24, top + 36 + i * 8, 8, 2, rgb(206, 176, 96));
	}
	r.ellipse(cx - 16, top + 58, 11, 10, rgb(200, 156, 120));
	r.ellipse(cx + 14, top + 62, 10, 10, rgb(186, 144, 108));
	if (state !== "idle") {
		const x = cx - 20 + ((spin + 18) % 45) + 3;
		muzzleFlash(r, x, top - 8, 16);
	}
	return r;
}

/* ── Registry ───────────────────────────────────────────────────────── */

export type SpriteSet = Record<string, Sprite[]>;

let cache: SpriteSet | null = null;

/** Build (once) every animation strip in the game. */
export function getSprites(): SpriteSet {
	if (cache) return cache;
	const rng = new Rng(0xd00d_5eed >>> 0);
	const set: SpriteSet = {};

	for (const [key, def] of [
		["grunt", TROOPER],
		["brute", BRUTE],
	] as const) {
		set[`${key}.walk`] = [
			toSprite(drawHumanoid(def, { stride: 0, aim: 0.2, bob: 0, flinch: 0 })),
			toSprite(drawHumanoid(def, { stride: 1, aim: 0.2, bob: -1, flinch: 0 })),
			toSprite(drawHumanoid(def, { stride: 0, aim: 0.2, bob: 0, flinch: 0 })),
			toSprite(drawHumanoid(def, { stride: -1, aim: 0.2, bob: -1, flinch: 0 })),
		];
		set[`${key}.aim`] = [
			toSprite(drawHumanoid(def, { stride: 0, aim: 1, bob: 0, flinch: 0 })),
		];
		set[`${key}.fire`] = [
			toSprite(drawHumanoid(def, { stride: 0, aim: 1, bob: -1, flinch: -1 })),
		];
		const pain = drawHumanoid(def, { stride: 0, aim: 0.3, bob: 1, flinch: -3 });
		pain.tint(rgb(255, 90, 80), 0.35);
		set[`${key}.pain`] = [toSprite(pain)];
		set[`${key}.die`] = [0, 1, 2, 3, 4].map((s) =>
			toSprite(drawHumanoidDeath(def, s)),
		);
	}

	set["hound.walk"] = [
		toSprite(drawHound({ stride: 0, bite: 0, bob: 0 })),
		toSprite(drawHound({ stride: 1, bite: 0, bob: -1 })),
		toSprite(drawHound({ stride: 0, bite: 0, bob: 0 })),
		toSprite(drawHound({ stride: -1, bite: 0, bob: -1 })),
	];
	set["hound.bite"] = [
		toSprite(drawHound({ stride: 0.5, bite: 0.5, bob: -2 })),
		toSprite(drawHound({ stride: 0, bite: 1, bob: -1 })),
	];
	const houndPain = drawHound({ stride: 0, bite: 0.3, bob: 1 });
	houndPain.tint(rgb(255, 90, 80), 0.35);
	set["hound.pain"] = [toSprite(houndPain)];
	set["hound.die"] = [0, 1, 2, 3].map((s) => toSprite(drawHoundDeath(s)));

	set["imp.float"] = [
		toSprite(drawImp({ bob: 0, throwT: 0 })),
		toSprite(drawImp({ bob: -2, throwT: 0 })),
		toSprite(drawImp({ bob: 0, throwT: 0 })),
		toSprite(drawImp({ bob: 2, throwT: 0 })),
	];
	set["imp.throw"] = [
		toSprite(drawImp({ bob: -1, throwT: 0.35 })),
		toSprite(drawImp({ bob: 0, throwT: 1 })),
	];
	const impPain = drawImp({ bob: 2, throwT: 0 });
	impPain.tint(rgb(255, 90, 80), 0.35);
	set["imp.pain"] = [toSprite(impPain)];
	set["imp.die"] = [0, 1, 2, 3].map((s) => toSprite(drawImpDeath(s)));

	set["item.medkit"] = [toSprite(drawMedkit())];
	set["item.stimpack"] = [toSprite(drawStimpack())];
	set["item.armor"] = [toSprite(drawArmor())];
	set["item.clip"] = [toSprite(drawClip())];
	set["item.shells"] = [toSprite(drawShellBox())];
	set["item.shotgun"] = [toSprite(drawShotgunPickup())];
	set["item.chaingun"] = [toSprite(drawChaingunPickup())];
	set["item.keyRed"] = [toSprite(drawKeycard(rgb(214, 52, 44)))];
	set["item.keyBlue"] = [toSprite(drawKeycard(rgb(74, 118, 232)))];
	set["item.keyYellow"] = [toSprite(drawKeycard(rgb(224, 194, 60)))];

	set["prop.barrel"] = [toSprite(drawBarrel(rng))];
	set["prop.column"] = [toSprite(drawColumn(rng))];
	set["prop.lamp"] = [toSprite(drawLamp())];
	set["prop.gore"] = [toSprite(drawGorePile(rng))];

	// Effects skip the outline pass: a hard black edge round fire looks wrong.
	set["fx.fireball"] = [0, 1, 2, 3].map((f) => toSprite(drawFireball(f), false));
	set["fx.explosion"] = [0, 1, 2, 3, 4].map((f) =>
		toSprite(drawExplosion(f, rng), false),
	);
	set["fx.blood"] = [0, 1, 2].map((f) => toSprite(drawBloodPuff(f, rng), false));
	set["fx.spark"] = [0, 1, 2].map((f) => toSprite(drawSparkPuff(f, rng), false));

	set["view.fist"] = [
		toSprite(drawFist(0), false),
		toSprite(drawFist(1), false),
	];
	set["view.pistol"] = [
		toSprite(drawPistol("idle"), false),
		toSprite(drawPistol("fire"), false),
		toSprite(drawPistol("recoil"), false),
	];
	set["view.shotgun"] = [
		toSprite(drawShotgun("idle"), false),
		toSprite(drawShotgun("fire"), false),
		toSprite(drawShotgun("pump"), false),
		toSprite(drawShotgun("pump2"), false),
	];
	set["view.chaingun"] = [
		toSprite(drawChaingun("idle"), false),
		toSprite(drawChaingun("fireA"), false),
		toSprite(drawChaingun("fireB"), false),
	];

	cache = set;
	return set;
}
