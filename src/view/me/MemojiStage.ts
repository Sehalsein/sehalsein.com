/**
 * The /me stage: renderer, camera, input wiring and the frame loop.
 *
 * Time is owned here (`this.time += dt`) and handed to everything else. Nothing
 * downstream reads the wall clock, which is what makes `step()` a complete
 * substitute for rAF — necessary because game loops are throttled to a
 * standstill inside the in-app browser pane, so every verification path drives
 * the stage by hand.
 */

import * as THREE from "three";
import { Behavior, TUNING } from "./behavior";
import { HEAD_H, HEAD_W } from "./domeGeometry";
import { Gaze } from "./gaze";
import { clamp } from "./math";
import { readPalette, watchPalette } from "./palette";
import { MemojiRig } from "./rig";
import type { PoseId } from "./poses";
import { createPoseTextures, type PoseTextures } from "./textures";
import type { MePalette, MeSnapshot } from "./types";

const FOV = 26;
/** Fraction of the frame the head fills, vertically and horizontally. */
const FIT_H = 0.78;
const FIT_W = 0.7;

const STATUS_INTERVAL = 1 / 6;

export interface StageOptions {
	host: HTMLElement;
	canvas: HTMLCanvasElement;
	availablePoses: readonly PoseId[];
}

export class MemojiStage {
	readonly behavior = new Behavior();
	readonly gaze = new Gaze(this.behavior);

	private gl: THREE.WebGLRenderer;
	private scene = new THREE.Scene();
	private camera: THREE.PerspectiveCamera;
	private rig!: MemojiRig;
	private textures!: PoseTextures;

	private host: HTMLElement;
	private canvas: HTMLCanvasElement;

	time = 0;
	frames = 0;

	private raf = 0;
	private lastFrame = 0;
	private statusAt = 0;

	private palette: MePalette = {
		bg: "#0a0b09",
		bg2: "#0f110e",
		ink: "#d6d3c4",
		dim: "#9aa0a8",
		rule: "#2a2f36",
		accent: "#9ece6a",
		alt: "#7aa2f7",
	};

	private motionQuery: MediaQueryList | null = null;
	private motionOverride: boolean | null = null;
	private touchQuery: MediaQueryList | null = null;
	private scroll = 0;

	private resizeObserver: ResizeObserver | null = null;
	private cleanups: (() => void)[] = [];
	private disposed = false;

	constructor(opts: StageOptions) {
		this.host = opts.host;
		this.canvas = opts.canvas;

		this.gl = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
			alpha: true,
			powerPreference: "high-performance",
		});
		this.gl.setClearAlpha(0);
		// The page's own bg-term-bg shows through, so the backdrop is
		// palette-correct with zero JS.
		this.gl.outputColorSpace = THREE.SRGBColorSpace;
		// Deliberately NOT the racer's ACESFilmic: tone mapping turns flat,
		// saturated sticker art to mud, and it reads as "the art is bad".
		this.gl.toneMapping = THREE.NoToneMapping;
		this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

		this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
		this.scene.add(this.camera);
	}

	async init(availablePoses: readonly PoseId[]): Promise<void> {
		this.textures = await createPoseTextures(
			availablePoses,
			this.gl.capabilities.getMaxAnisotropy(),
		);
		if (this.disposed) {
			this.textures.dispose();
			return;
		}

		this.rig = new MemojiRig(this.textures);
		this.scene.add(this.rig.root);

		this.palette = readPalette();
		this.rig.setPalette(this.palette);

		this.bindMedia();
		this.bindInput();
		this.bindResize();

		this.cleanups.push(
			watchPalette((palette) => {
				this.palette = palette;
				this.rig.setPalette(palette);
				this.rig.flashRim();
				// make the recolour felt, not merely correct
				this.behavior.enter("surprised", this.time);
			}),
		);

		this.resize();
		// The load wave. Not gated on hover, so it plays on touch too.
		this.behavior.enter("boot", this.time);
	}

	// ── wiring ───────────────────────────────────────────────────────────────

	private bindMedia(): void {
		this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		this.touchQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
		const onMotion = () => this.applyMotion();
		this.motionQuery.addEventListener("change", onMotion);
		this.cleanups.push(() => this.motionQuery?.removeEventListener("change", onMotion));

		// The page's own motion toggle — the media query is a poor proxy for
		// "stop this specific thing", so a visible switch overrides it.
		const onOverride = (e: Event) => {
			const detail = (e as CustomEvent<{ enabled: boolean | null }>).detail;
			this.motionOverride = detail?.enabled ?? null;
			this.applyMotion();
		};
		window.addEventListener("me:motion", onOverride);
		this.cleanups.push(() => window.removeEventListener("me:motion", onOverride));
	}

	private applyMotion(): void {
		if (this.reducedMotion) this.behavior.enter("idle", this.time);
	}

	private bindInput(): void {
		// Listen on the window, not the host: the head should follow the cursor
		// anywhere on the page, which is the entire point.
		const onMove = (e: PointerEvent) => {
			const speed = this.gaze.setPointer(
				e.clientX,
				e.clientY,
				this.time,
				e.pointerType === "touch",
			);
			if (!this.reducedMotion && speed > TUNING.SURPRISE_SPEED) {
				this.behavior.enter("surprised", this.time);
			}
		};
		window.addEventListener("pointermove", onMove, { passive: true });
		this.cleanups.push(() => window.removeEventListener("pointermove", onMove));

		// pointerover bubbles for every element entered, so moving off a glance
		// target onto plain page chrome clears it without a matching pointerout.
		const onOver = (e: PointerEvent) => {
			const el = (e.target as Element | null)?.closest?.("[data-me-glance]");
			this.gaze.setElement(el ? el.getBoundingClientRect() : null, this.time);
		};
		document.addEventListener("pointerover", onOver, { passive: true });
		this.cleanups.push(() => document.removeEventListener("pointerover", onOver));

		const onDown = (e: PointerEvent) => {
			// On touch the wave IS the interaction, and it's the payoff.
			if (e.pointerType === "touch" && this.behavior.canWave(this.time)) {
				this.behavior.enter("waving", this.time, true);
			} else {
				this.behavior.enter("smiling", this.time, true);
			}
		};
		this.host.addEventListener("pointerdown", onDown);
		this.cleanups.push(() => this.host.removeEventListener("pointerdown", onDown));

		const onEnter = () => {
			if (this.reducedMotion) return;
			if (this.behavior.canWave(this.time)) this.behavior.enter("waving", this.time);
		};
		this.host.addEventListener("pointerenter", onEnter);
		this.cleanups.push(() => this.host.removeEventListener("pointerenter", onEnter));

		const onGlanceDown = (e: PointerEvent) => {
			if ((e.target as Element | null)?.closest?.("[data-me-glance]")) {
				this.behavior.enter("smiling", this.time, true);
			}
		};
		document.addEventListener("pointerdown", onGlanceDown, { passive: true });
		this.cleanups.push(() => document.removeEventListener("pointerdown", onGlanceDown));

		const onScroll = () => {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			this.scroll = max > 0 ? clamp((window.scrollY / max) * 2 - 1, -1, 1) : 0;
			// the cached rect moves with the page
			this.gaze.setRect(this.canvas.getBoundingClientRect());
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		this.cleanups.push(() => window.removeEventListener("scroll", onScroll));

		const onLost = (e: Event) => {
			e.preventDefault();
			this.host.classList.add("is-fallback");
		};
		this.canvas.addEventListener("webglcontextlost", onLost);
		this.cleanups.push(() => this.canvas.removeEventListener("webglcontextlost", onLost));
	}

	private bindResize(): void {
		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(this.host);
	}

	private resize(): void {
		const w = Math.max(1, this.host.clientWidth);
		const h = Math.max(1, this.host.clientHeight);
		const aspect = w / h;

		this.gl.setSize(w, h, false);
		this.camera.aspect = aspect;

		// Pull the camera back until the head fills a fixed fraction of the frame,
		// in whichever axis is tighter. Narrow FOV plus distance is what gives
		// real foreshortening on a turn without fisheyeing the resting pose.
		const t = Math.tan((FOV * Math.PI) / 360);
		const dh = HEAD_H / (2 * FIT_H * t);
		const dw = HEAD_W / (2 * FIT_W * t * aspect);
		const d = Math.max(dh, dw);

		this.camera.position.set(0, 0, d);
		this.camera.near = Math.max(0.1, d - 2);
		this.camera.far = d + 4;
		this.camera.updateProjectionMatrix();

		this.gaze.setRect(this.canvas.getBoundingClientRect());
	}

	// ── loop ─────────────────────────────────────────────────────────────────

	get reducedMotion(): boolean {
		if (this.motionOverride !== null) return !this.motionOverride;
		return this.motionQuery?.matches ?? false;
	}

	get touch(): boolean {
		return !(this.touchQuery?.matches ?? true);
	}

	private frame = (now: number): void => {
		this.raf = requestAnimationFrame(this.frame);
		if (!this.lastFrame) this.lastFrame = now;
		const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
		this.lastFrame = now;
		this.advance(dt);
	};

	start(): void {
		if (this.raf || this.disposed) return;
		this.lastFrame = 0;
		this.raf = requestAnimationFrame(this.frame);
	}

	stop(): void {
		if (!this.raf) return;
		cancelAnimationFrame(this.raf);
		this.raf = 0;
	}

	step(dtMs = 16.667): void {
		this.advance(dtMs / 1000);
	}

	steps(n: number, dtMs = 16.667): void {
		for (let i = 0; i < n; i++) this.advance(dtMs / 1000);
	}

	private advance(dt: number): void {
		if (this.disposed || !this.rig) return;
		this.time += dt;
		this.frames++;

		const reducedMotion = this.reducedMotion;
		const touch = this.touch;

		this.behavior.update({
			dt,
			time: this.time,
			reducedMotion,
			sincePointer: this.gaze.sincePointer(this.time),
		});
		this.gaze.update({ dt, time: this.time, reducedMotion, touch, scroll: this.scroll });

		this.rig.setPose(this.behavior.pose());
		this.rig.setGaze(
			this.gaze.yaw,
			this.gaze.pitch + (reducedMotion ? 0 : TUNING.BREATH_PITCH * this.behavior.breath),
			this.gaze.roll,
			this.behavior.rock,
		);
		this.rig.setPupils(this.gaze.pupilX, this.gaze.pupilY);
		this.rig.setBlink(this.behavior.lid);
		this.rig.setBody(
			TUNING.BREATH_BOB * this.behavior.breath + this.behavior.bob,
			this.behavior.scale * (1 + TUNING.BREATH_SCALE * this.behavior.breath),
			this.behavior.opacity,
		);
		this.rig.update(dt);

		this.gl.render(this.scene, this.camera);
		this.writeStatus();
	}

	/**
	 * The live read-out under the canvas. Throttled and written straight to the
	 * DOM rather than through React, so nothing re-renders per frame.
	 */
	private writeStatus(): void {
		if (this.time - this.statusAt < STATUS_INTERVAL) return;
		this.statusAt = this.time;
		const el = document.querySelector('[data-el="me-status"]');
		if (!el) return;
		const g = this.gaze;
		el.textContent = `state: ${this.behavior.state} · gaze ${g.gazeX.toFixed(2)}, ${g.gazeY.toFixed(2)} · ${g.source}`;
	}

	// ── probe surface ────────────────────────────────────────────────────────

	setPointer(clientX: number, clientY: number): void {
		this.gaze.setPointer(clientX, clientY, this.time, this.touch);
	}

	trigger(state: "wave" | "smile" | "surprised"): void {
		const map = { wave: "waving", smile: "smiling", surprised: "surprised" } as const;
		this.behavior.enter(map[state], this.time);
	}

	setSeed(seed: number): void {
		this.behavior.setSeed(seed);
	}

	snapshot(): MeSnapshot {
		const b = this.behavior;
		const g = this.gaze;
		return {
			time: this.time,
			frames: this.frames,
			state: b.state,
			stateTimer: b.stateTimer,
			gazeSource: g.source,
			gazeX: g.gazeX,
			gazeY: g.gazeY,
			headYaw: g.yaw,
			headPitch: g.pitch,
			headRoll: g.roll,
			pupilL: [g.pupilX, g.pupilY],
			pupilR: [g.pupilX, g.pupilY],
			lid: b.lid,
			breath: b.breath,
			rock: b.rock,
			scale: b.scale,
			pose: { a: this.rig.current, b: this.rig.pending, mix: this.rig.mix },
			sources: this.textures.sources,
			palette: {
				ink: this.palette.ink,
				accent: this.palette.accent,
				rimStrength: this.rig.rimStrength,
			},
			reducedMotion: this.reducedMotion,
			touch: this.touch,
			tuning: TUNING,
		};
	}

	// ── teardown ─────────────────────────────────────────────────────────────

	dispose(): void {
		this.disposed = true;
		this.stop();
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		for (const off of this.cleanups) off();
		this.cleanups = [];
		this.rig?.dispose();
		this.textures?.dispose();
		this.scene.clear();
		this.gl.dispose();
		this.canvas.remove();
	}
}
