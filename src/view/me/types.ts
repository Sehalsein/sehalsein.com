import type { PoseId } from "./poses";
import type { TUNING } from "./behavior";

/** Gesture states, in priority order (see PRIORITY in behavior.ts). */
export type MeState = "boot" | "idle" | "waving" | "smiling" | "surprised" | "dozing";

/** What is currently steering the gaze. */
export type GazeSource = "pointer" | "element" | "wander" | "none";

/** How each pose's texture was resolved — the probe asserts on this. */
export type TextureSource = "png" | "fallback" | "standin";

/** Palette colours pulled off the document's CSS custom properties. */
export interface MePalette {
	bg: string;
	bg2: string;
	ink: string;
	dim: string;
	rule: string;
	accent: string;
	alt: string;
}

/**
 * Everything the headless probe needs to assert on, without reading pixels.
 * Angles are radians; normalized values are -1..1.
 */
export interface MeSnapshot {
	time: number;
	frames: number;

	state: MeState;
	stateTimer: number;

	gazeSource: GazeSource;
	gazeX: number;
	gazeY: number;

	headYaw: number;
	/** Positive is looking UP (the rig applies it as a negative rotation.x). */
	headPitch: number;
	headRoll: number;

	pupilL: [number, number];
	pupilR: [number, number];

	/** 0 = eyes open, 1 = fully closed. */
	lid: number;
	breath: number;
	rock: number;
	scale: number;

	pose: { a: PoseId; b: PoseId; mix: number };
	sources: Record<PoseId, TextureSource>;

	palette: { ink: string; accent: string; rimStrength: number };

	reducedMotion: boolean;
	touch: boolean;

	tuning: typeof TUNING;
}

/**
 * The `window.__me` contract. Mirrors `window.__rg`, but makes manual stepping a
 * first-class API rather than something the probe has to reach into — game loops
 * are throttled to a standstill inside the in-app browser pane, so every
 * verification path drives the stage by hand.
 */
export interface MeHandle {
	start(): void;
	stop(): void;
	step(dtMs?: number): void;
	steps(n: number, dtMs?: number): void;
	snapshot(): MeSnapshot;
	setPointer(clientX: number, clientY: number): void;
	trigger(state: "wave" | "smile" | "surprised"): void;
	setSeed(seed: number): void;
}

declare global {
	interface Window {
		__me?: MeHandle;
	}
}
