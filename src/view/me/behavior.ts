/**
 * The gesture state machine and the autonomic schedulers (blink, breath).
 *
 * IMPORTANT: nothing in this file may call `performance.now()` or `Date.now()`.
 * All time comes from the stage's own accumulator, because the headless probe
 * drives the stage by hand — a scheduler reading the wall clock would look fine
 * in a browser and silently hang every autonomic assertion under `steps(600)`.
 *
 * For the same reason every schedule draws from a seeded PRNG, not `Math.random`.
 */

import { clamp01, mulberry32, smoothstep, TAU } from "./math";
import type { PoseId } from "./poses";
import type { MeState } from "./types";

export const TUNING = {
	// gaze
	YAW_MAX: 0.34,
	PITCH_MAX: 0.22,
	ROLL_RATIO: 0.18,
	/** Half-widths of cursor travel needed for a full turn. */
	GAZE_RANGE: 1.6,
	HEAD_DAMP: 0.02,
	HEAD_DAMP_REDUCED: 0.12,
	PUPIL_DAMP: 0.0015,
	PUPIL_RESIDUAL_GAIN: 1.15,
	SACCADE: 0.02,
	SACCADE_MIN: 0.4,
	SACCADE_MAX: 0.9,

	// gaze sources
	POINTER_HOLD: 1.5,
	POINTER_HOLD_TOUCH: 2.5,
	ELEMENT_HOLD: 1.2,
	WANDER_MIN: 6,
	WANDER_MAX: 13,
	WANDER_HOLD_MIN: 0.7,
	WANDER_HOLD_MAX: 1.4,
	WANDER_MIN_TOUCH: 3,
	WANDER_MAX_TOUCH: 7,
	WANDER_HOLD_MIN_TOUCH: 1.2,
	WANDER_HOLD_MAX_TOUCH: 2.2,
	/** Pointer movement that cancels a look-away mid-hold. */
	WANDER_CANCEL_PX: 6,
	SCROLL_PITCH: 0.4,

	// blink
	BLINK_MIN: 2.4,
	BLINK_MAX: 6,
	BLINK_CLOSE: 0.06,
	BLINK_OPEN: 0.1,
	DOUBLE_BLINK_CHANCE: 0.12,
	DOUBLE_BLINK_GAP: 0.18,

	// breath
	BREATH_PERIOD: 4,
	BREATH_BOB: 0.012,
	BREATH_SCALE: 0.004,
	BREATH_PITCH: 0.006,

	// gestures
	CROSSFADE: 0.12,
	BOOT: 0.35,
	WAVE: 1.75,
	SMILE: 1.1,
	SURPRISE: 0.7,
	WAVE_COOLDOWN: 8,
	DOZE_AFTER: 25,
	WAVE_ROCK: 0.09,
	WAVE_BOB: 0.028,
	WAVE_POP: 0.03,
	WAVE_OSC: 2.6,
	WAVE_BOB_OSC: 5.2,
	/** Fraction of the wave after which it eases out into a smile. */
	WAVE_EXIT: 0.82,
	WAVE_SMILE_HOLD: 0.35,
	/**
	 * Cursor speed, px/s, that startles the character. High on purpose: an
	 * ordinary flick across a wide screen clears 2500px/s easily, and a
	 * character that is permanently startled isn't reacting to anything.
	 */
	SURPRISE_SPEED: 5200,
	/** Entrance: the rig scales up from this. */
	BOOT_SCALE: 0.86,
} as const;

/**
 * A higher-priority gesture may cut a running one short; an equal or lower one
 * may not. That is what stops a stray click from chopping the intro wave in
 * half while still letting a palette change interrupt anything.
 */
const PRIORITY: Record<MeState, number> = {
	boot: 5,
	surprised: 4,
	waving: 3,
	smiling: 1,
	idle: 0,
	dozing: 0,
};

const DURATION: Record<MeState, number> = {
	boot: TUNING.BOOT,
	waving: TUNING.WAVE,
	smiling: TUNING.SMILE,
	surprised: TUNING.SURPRISE,
	idle: 0,
	dozing: 0,
};

export interface BehaviorContext {
	dt: number;
	time: number;
	reducedMotion: boolean;
	/** Seconds since the pointer last moved, or Infinity if it never has. */
	sincePointer: number;
}

export class Behavior {
	state: MeState = "boot";
	stateTimer = DURATION.boot;
	stateElapsed = 0;

	/** 0 = eyes open, 1 = fully closed. */
	lid = 0;
	breath = 0;
	/** Wave oscillation, roughly -1..1 scaled by TUNING.WAVE_ROCK. */
	rock = 0;
	bob = 0;
	scale: number = TUNING.BOOT_SCALE;
	opacity = 0;

	private rng = mulberry32(0x5e4a1);
	private breathPhase = 0;
	private nextBlinkAt = 0;
	private blinkT = -1;
	private queuedBlinkAt = -1;
	private lastWaveAt = -Infinity;

	constructor(seed = 0x5e4a1) {
		this.setSeed(seed);
	}

	setSeed(seed: number): void {
		this.rng = mulberry32(seed);
		this.nextBlinkAt = this.range(TUNING.BLINK_MIN, TUNING.BLINK_MAX);
	}

	private range(min: number, max: number): number {
		return min + this.rng() * (max - min);
	}

	/** Roll a fresh look-away delay. Owned here so it shares the seeded stream. */
	wanderDelay(touch: boolean): number {
		return touch
			? this.range(TUNING.WANDER_MIN_TOUCH, TUNING.WANDER_MAX_TOUCH)
			: this.range(TUNING.WANDER_MIN, TUNING.WANDER_MAX);
	}

	wanderHold(touch: boolean): number {
		return touch
			? this.range(TUNING.WANDER_HOLD_MIN_TOUCH, TUNING.WANDER_HOLD_MAX_TOUCH)
			: this.range(TUNING.WANDER_HOLD_MIN, TUNING.WANDER_HOLD_MAX);
	}

	wanderTarget(): { x: number; y: number } {
		const angle = this.rng() * TAU;
		const radius = this.range(0.6, 1);
		return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.7 };
	}

	saccade(): { x: number; y: number; next: number } {
		return {
			x: (this.rng() * 2 - 1) * TUNING.SACCADE,
			y: (this.rng() * 2 - 1) * TUNING.SACCADE,
			next: this.range(TUNING.SACCADE_MIN, TUNING.SACCADE_MAX),
		};
	}

	canWave(time: number): boolean {
		return time - this.lastWaveAt > TUNING.WAVE_COOLDOWN;
	}

	/**
	 * `force` is for gestures the visitor performed deliberately — a click, a
	 * tap. Those always land: being told "you clicked me but I was busy being
	 * startled" is exactly the kind of unresponsiveness the priority system is
	 * meant to prevent, not cause.
	 */
	enter(next: MeState, time: number, force = false): boolean {
		if (!force && this.stateTimer > 0 && PRIORITY[next] <= PRIORITY[this.state]) return false;
		this.state = next;
		this.stateTimer = DURATION[next];
		this.stateElapsed = 0;
		if (next === "waving") this.lastWaveAt = time;
		return true;
	}

	update(ctx: BehaviorContext): void {
		const { dt, time, reducedMotion, sincePointer } = ctx;

		// ── gesture timers ───────────────────────────────────────────────────
		this.stateElapsed += dt;
		if (this.stateTimer > 0) {
			this.stateTimer = Math.max(0, this.stateTimer - dt);
			if (this.stateTimer === 0) {
				// The entrance runs straight into the hello — the wave is the payoff
				// for arriving, so it isn't gated on hovering anything.
				if (this.state === "boot" && !reducedMotion) {
					this.state = "waving";
					this.stateTimer = DURATION.waving;
					this.lastWaveAt = time;
				} else {
					this.state = "idle";
				}
				this.stateElapsed = 0;
			}
		} else if (
			this.state === "idle" &&
			!reducedMotion &&
			sincePointer > TUNING.DOZE_AFTER
		) {
			this.state = "dozing";
			this.stateElapsed = 0;
		} else if (this.state === "dozing" && sincePointer < 0.2) {
			this.state = "idle";
			this.stateElapsed = 0;
		}

		// ── entrance ─────────────────────────────────────────────────────────
		if (this.state === "boot") {
			const t = smoothstep(0, TUNING.BOOT, this.stateElapsed);
			this.opacity = t;
			this.scale = TUNING.BOOT_SCALE + (1 - TUNING.BOOT_SCALE) * t;
		} else {
			this.opacity = 1;
			this.scale = 1;
		}

		// ── the wave ─────────────────────────────────────────────────────────
		// The sticker's arm is a fixed image, so what actually reads as waving is
		// the whole head rocking about the neck. Composited on top of the gaze,
		// never replacing it — it keeps watching you while it waves.
		if (this.state === "waving") {
			const t = clamp01(this.stateElapsed / TUNING.WAVE);
			const env = Math.sin(Math.PI * t) ** 0.8;
			this.rock = TUNING.WAVE_ROCK * env * Math.sin(TAU * TUNING.WAVE_OSC * t);
			this.bob = TUNING.WAVE_BOB * env * Math.sin(TAU * TUNING.WAVE_BOB_OSC * t);
			this.scale = 1 + TUNING.WAVE_POP * env;
		} else {
			this.rock *= Math.pow(0.001, dt);
			this.bob *= Math.pow(0.001, dt);
		}

		// ── breath ───────────────────────────────────────────────────────────
		// Deliberately just above the perception threshold: invisible if you look
		// for it, unmistakable if it's missing.
		if (reducedMotion) {
			this.breath = 0;
		} else {
			this.breathPhase = (this.breathPhase + dt / TUNING.BREATH_PERIOD) % 1;
			this.breath = Math.sin(TAU * this.breathPhase);
		}

		// ── blink ────────────────────────────────────────────────────────────
		// A lid animation, never a pose swap: a 120ms texture cross-fade cannot
		// represent a blink, and it would fight the gesture track.
		this.updateBlink(dt, time, reducedMotion);
	}

	private updateBlink(dt: number, time: number, reducedMotion: boolean): void {
		if (this.state === "dozing") {
			// a slow, heavy blink that stays mostly shut
			this.lid = 0.82 + 0.12 * Math.sin(TAU * this.stateElapsed * 0.25);
			return;
		}
		if (reducedMotion || this.state === "surprised") {
			this.lid = 0;
			this.blinkT = -1;
			return;
		}

		if (this.blinkT < 0 && time >= this.nextBlinkAt) {
			this.blinkT = 0;
			this.nextBlinkAt = time + this.range(TUNING.BLINK_MIN, TUNING.BLINK_MAX);
			if (this.rng() < TUNING.DOUBLE_BLINK_CHANCE) {
				this.queuedBlinkAt =
					time + TUNING.BLINK_CLOSE + TUNING.BLINK_OPEN + TUNING.DOUBLE_BLINK_GAP;
			}
		} else if (this.blinkT < 0 && this.queuedBlinkAt >= 0 && time >= this.queuedBlinkAt) {
			this.blinkT = 0;
			this.queuedBlinkAt = -1;
		}

		if (this.blinkT >= 0) {
			this.blinkT += dt;
			// real blinks close faster than they open
			if (this.blinkT < TUNING.BLINK_CLOSE) {
				this.lid = clamp01(this.blinkT / TUNING.BLINK_CLOSE);
			} else if (this.blinkT < TUNING.BLINK_CLOSE + TUNING.BLINK_OPEN) {
				this.lid = 1 - clamp01((this.blinkT - TUNING.BLINK_CLOSE) / TUNING.BLINK_OPEN);
			} else {
				this.lid = 0;
				this.blinkT = -1;
			}
		} else {
			this.lid = 0;
		}
	}

	/** Which pose the artwork should be showing right now. */
	pose(): PoseId {
		switch (this.state) {
			case "waving":
				// ending on a smile is what makes the gesture feel concluded
				return this.stateElapsed >= TUNING.WAVE * TUNING.WAVE_EXIT ? "smile" : "wave";
			case "smiling":
				return "smile";
			case "surprised":
				return "surprised";
			case "dozing":
				return "blink";
			default:
				return "neutral";
		}
	}
}
