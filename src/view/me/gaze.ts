/**
 * Turns "where is the user's attention" into head rotation and pupil offsets.
 *
 * Two ideas do most of the work here:
 *
 *  1. Everything normalises against the *canvas* rect, not the viewport. That
 *     way hovering a link in the sidebar and pointing the cursor at it produce
 *     the same answer, and the character looks at the same place either way.
 *
 *  2. The pupils carry the *residual* of the head's rotation, not the absolute
 *     target. Because they damp ~3× faster, a cursor jump snaps the eyes first;
 *     as the slower head catches up the residual decays and the pupils drift
 *     back toward centre on their own. That is what real eyes do, and it is the
 *     single detail separating "alive" from "creepy doll".
 */

import { Behavior, TUNING } from "./behavior";
import { clamp, damp, sign } from "./math";
import type { GazeSource } from "./types";

export interface GazeContext {
	dt: number;
	time: number;
	reducedMotion: boolean;
	touch: boolean;
	/** Page scroll, -1..1. The only ambient input a touch visitor has. */
	scroll: number;
}

interface Point {
	x: number;
	y: number;
}

export class Gaze {
	gazeX = 0;
	gazeY = 0;
	source: GazeSource = "none";

	yaw = 0;
	pitch = 0;
	roll = 0;
	pupilX = 0;
	pupilY = 0;

	/** Cached — reading it per pointermove forces layout on every mouse move. */
	private rect: DOMRect | null = null;

	private pointer: Point | null = null;
	/**
	 * Zero, not -Infinity: "the pointer has never moved" should read as "no
	 * pointer activity since the page loaded", so the doze timer counts up from
	 * load instead of firing on the first frame.
	 */
	private pointerAt = 0;
	private pointerRaw: Point | null = null;
	private pointerSpeed = 0;

	private element: Point | null = null;
	private elementUntil = -Infinity;

	/** Zero so a visitor who never moves a pointer still gets look-aways. */
	private wanderAt = 0;
	private wanderUntil = -Infinity;
	private wanderTarget: Point = { x: 0, y: 0 };

	private saccade: Point = { x: 0, y: 0 };
	private saccadeAt = 0;

	constructor(private behavior: Behavior) {}

	setRect(rect: DOMRect | null): void {
		this.rect = rect;
	}

	/** Returns the pointer speed in px/s, so the stage can decide to be startled. */
	setPointer(clientX: number, clientY: number, time: number, touch: boolean): number {
		if (this.pointerRaw) {
			const elapsed = Math.max(1e-3, time - this.pointerAt);
			const dist = Math.hypot(clientX - this.pointerRaw.x, clientY - this.pointerRaw.y);
			this.pointerSpeed = dist / elapsed;
			// any real movement cancels a look-away mid-hold — the character must
			// never feel like it's ignoring you
			if (dist > TUNING.WANDER_CANCEL_PX) this.wanderUntil = -Infinity;
		}
		this.pointerRaw = { x: clientX, y: clientY };
		this.pointer = { x: clientX, y: clientY };
		this.pointerAt = time;
		this.holdWander(time, touch);
		return this.pointerSpeed;
	}

	/** A `[data-me-glance]` element was hovered; look at its centre. */
	setElement(rect: DOMRect | null, time: number): void {
		if (!rect) {
			this.elementUntil = -Infinity;
			this.element = null;
			return;
		}
		this.element = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
		this.elementUntil = time + TUNING.ELEMENT_HOLD;
	}

	private holdWander(time: number, touch: boolean): void {
		this.wanderAt = time + this.behavior.wanderDelay(touch);
	}

	/** Client point → normalized -1..1 against the canvas, +Y up. */
	private normalize(p: Point): Point {
		const rect = this.rect;
		if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
		const gx = (p.x - (rect.left + rect.width / 2)) / (rect.width / 2);
		const gy = (rect.top + rect.height / 2 - p.y) / (rect.height / 2);
		return { x: this.shape(gx), y: this.shape(gy) };
	}

	/**
	 * The cursor has to travel GAZE_RANGE half-widths for a full turn — without
	 * that, simply crossing the canvas pins the head at its limit and the
	 * tracking stops reading as tracking. Then ease out, so it stays responsive
	 * near the centre and settles gently at the extremes.
	 */
	private shape(g: number): number {
		const n = clamp(g / TUNING.GAZE_RANGE, -1, 1);
		return sign(n) * (1 - (1 - Math.abs(n)) ** 2);
	}

	update(ctx: GazeContext): void {
		const { dt, time, reducedMotion, touch } = ctx;
		const hold = touch ? TUNING.POINTER_HOLD_TOUCH : TUNING.POINTER_HOLD;

		// A look-away is only scheduled once the pointer has gone quiet, and it
		// *interrupts* rather than replaces the pointer: the cursor is still where
		// it is, so between look-aways the character goes back to watching it.
		// Dropping the pointer on a timeout instead made a parked cursor get
		// abandoned after a second and a half, which read as losing interest.
		const idle = time - this.pointerAt > hold;
		if (!reducedMotion && idle && time >= this.wanderUntil && time >= this.wanderAt) {
			this.wanderTarget = this.behavior.wanderTarget();
			this.wanderUntil = time + this.behavior.wanderHold(touch);
			this.wanderAt = this.wanderUntil + this.behavior.wanderDelay(touch);
		}

		let target: Point;
		if (this.element && time < this.elementUntil) {
			this.source = "element";
			target = this.normalize(this.element);
		} else if (!reducedMotion && time < this.wanderUntil) {
			this.source = "wander";
			target = this.wanderTarget;
		} else if (this.pointer) {
			this.source = "pointer";
			target = this.normalize(this.pointer);
		} else {
			this.source = "none";
			target = { x: 0, y: 0 };
		}

		// scroll nudges the pitch, so a touch visitor scrolling the page still
		// gets the head following them down
		let ty = target.y + (touch ? ctx.scroll * TUNING.SCROLL_PITCH : 0);
		let tx = target.x;

		// micro-saccades — eyes that are perfectly still are dead eyes
		if (!reducedMotion) {
			if (time >= this.saccadeAt) {
				const s = this.behavior.saccade();
				this.saccade = { x: s.x, y: s.y };
				this.saccadeAt = time + s.next;
			}
			tx += this.saccade.x;
			ty += this.saccade.y;
		}

		this.gazeX = clamp(tx, -1, 1);
		this.gazeY = clamp(ty, -1, 1);

		// reduced motion keeps gaze — it's a direct 1:1 response to the user's own
		// pointer, the same category as a hover state — but halves the range and
		// slows it right down
		const limit = reducedMotion ? 0.5 : 1;
		const headDamp = reducedMotion ? TUNING.HEAD_DAMP_REDUCED : TUNING.HEAD_DAMP;

		const targetYaw = TUNING.YAW_MAX * limit * this.gazeX;
		const targetPitch = TUNING.PITCH_MAX * limit * this.gazeY;
		const targetRoll = -targetYaw * TUNING.ROLL_RATIO;

		this.yaw = damp(this.yaw, targetYaw, headDamp, dt);
		this.pitch = damp(this.pitch, targetPitch, headDamp, dt);
		this.roll = damp(this.roll, targetRoll, 0.05, dt);

		const residualX = clamp(
			(this.gazeX - this.yaw / (TUNING.YAW_MAX * limit)) * TUNING.PUPIL_RESIDUAL_GAIN,
			-1,
			1,
		);
		const residualY = clamp(
			(this.gazeY - this.pitch / (TUNING.PITCH_MAX * limit)) * TUNING.PUPIL_RESIDUAL_GAIN,
			-1,
			1,
		);
		this.pupilX = damp(this.pupilX, residualX, TUNING.PUPIL_DAMP, dt);
		this.pupilY = damp(this.pupilY, residualY, TUNING.PUPIL_DAMP, dt);
	}

	/** Seconds since the pointer last moved. */
	sincePointer(time: number): number {
		return time - this.pointerAt;
	}
}
