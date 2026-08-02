import { Audio } from "../engine/Audio";
import { Input } from "../engine/Input";
import { Loop, type LoopHandlers } from "../engine/Loop";
import { Renderer } from "../render/Renderer";
import {
	drawAutomap,
	drawCrosshair,
	drawDead,
	drawHud,
	drawIntermission,
	drawPaused,
	drawTitle,
	drawVictory,
	HUD_HEIGHT,
} from "../render/hud";
import { LEVELS } from "./levels";
import { World, type PlayerCommand, type PlayerState } from "./World";
import { WEAPON_ORDER, type WeaponId } from "./weapons";

/**
 * Top-level state machine: title → playing (⇄ automap, paused) → intermission →
 * next level, with death looping back into a restart of the current level.
 *
 * Owns the loop, input, audio and renderer; `World` owns the simulation. This
 * split is what lets the renderer be swapped or the world stepped headlessly
 * without dragging the whole game along.
 */

export type GamePhase =
	| "title"
	| "playing"
	| "automap"
	| "paused"
	| "dead"
	| "intermission"
	| "victory";

/** Internal render resolution. Everything upscales from here. */
const VIEW_W = 320;
const VIEW_H = 200;
const MOUSE_SENSITIVITY = 0.0022;
const PITCH_SENSITIVITY = 0.55;

export class DoomGame implements LoopHandlers {
	phase: GamePhase = "title";
	world: World;

	private host: HTMLElement;
	private renderer: Renderer;
	private input: Input;
	private audio = new Audio();
	private loop: Loop;
	private levelIndex = 0;
	/** Drives the blinking prompts on the full-screen cards. */
	private blinkTime = 0;
	private carry: Partial<PlayerState> | undefined;
	private disposed = false;

	constructor(host: HTMLElement, canvas: HTMLCanvasElement) {
		this.host = host;
		this.renderer = new Renderer(canvas, VIEW_W, VIEW_H, HUD_HEIGHT);
		this.input = new Input(host);
		this.world = new World(LEVELS[0], this.audio);
		this.renderer.bindLevel(this.world);
		this.loop = new Loop(this, 60);

		// A click both starts the audio context and grabs the pointer — browsers
		// only allow either from inside a real gesture.
		host.addEventListener("mousedown", this.onHostMouseDown);
	}

	private onHostMouseDown = (): void => {
		this.audio.resume();
		if (this.phase === "playing") this.input.requestPointerLock();
	};

	start(): void {
		this.loop.start();
	}

	/* ── Simulation ─────────────────────────────────────────────────────── */

	fixedUpdate(dt: number): void {
		if (this.disposed) return;
		this.input.beginStep();
		this.blinkTime += dt;

		switch (this.phase) {
			case "title":
				if (this.input.anyKeyPressed() || this.input.firing) this.beginPlay();
				break;

			case "playing":
				this.stepPlaying(dt);
				break;

			case "automap":
				// The world keeps running behind the map — DOOM's did too.
				this.world.update(dt, this.idleCommand());
				if (this.input.justPressed("automap")) this.phase = "playing";
				if (this.input.justPressed("pause")) this.setPaused(true);
				if (this.world.player.dead) this.enterDead();
				break;

			case "paused":
				if (this.input.justPressed("pause")) this.setPaused(false);
				if (this.input.justPressed("automap")) this.audio.setMuted(!this.audio.muted);
				if (this.input.justPressed("use")) this.restartLevel();
				break;

			case "dead":
				this.world.update(dt, this.idleCommand());
				if (this.input.justPressed("confirm") || this.input.justPressed("use")) {
					this.restartLevel();
				}
				break;

			case "intermission":
				if (this.input.justPressed("confirm") || this.input.justPressed("use")) {
					this.advanceLevel();
				}
				break;

			case "victory":
				if (this.input.justPressed("confirm") || this.input.justPressed("use")) {
					this.levelIndex = 0;
					this.carry = undefined;
					this.loadLevel(0);
					this.phase = "playing";
				}
				break;
		}
	}

	private stepPlaying(dt: number): void {
		const input = this.input;

		if (input.justPressed("pause")) {
			this.setPaused(true);
			return;
		}
		if (input.justPressed("automap")) {
			this.phase = "automap";
			return;
		}

		const move = input.getMoveInput();
		const look = input.consumeLook(MOUSE_SENSITIVITY);

		this.world.update(dt, {
			forward: move.forward,
			strafe: move.strafe,
			// Arrow-key turning is frame-rate independent; mouse yaw is a delta.
			turn: move.turn * dt * 2.6 + look.yaw,
			pitch: -look.pitch * PITCH_SENSITIVITY,
			run: move.run,
			fire: input.firing,
			use: input.justPressed("use"),
			selectWeapon: this.requestedWeapon(),
			cycleWeapon: input.justPressed("nextWeapon")
				? 1
				: input.justPressed("prevWeapon")
					? -1
					: 0,
		});

		if (this.world.player.dead) {
			this.enterDead();
			return;
		}
		if (this.world.exited) {
			this.input.releasePointerLock();
			this.phase = "intermission";
			this.blinkTime = 0;
		}
	}

	private requestedWeapon(): WeaponId | null {
		const slots = ["weapon1", "weapon2", "weapon3", "weapon4"] as const;
		for (let i = 0; i < slots.length; i++) {
			if (this.input.justPressed(slots[i])) return WEAPON_ORDER[i];
		}
		return null;
	}

	private idleCommand(): PlayerCommand {
		return {
			forward: 0,
			strafe: 0,
			turn: 0,
			pitch: 0,
			run: false,
			fire: false,
			use: false,
			selectWeapon: null,
			cycleWeapon: 0,
		};
	}

	/* ── Phase transitions ──────────────────────────────────────────────── */

	private beginPlay(): void {
		this.audio.resume();
		this.phase = "playing";
		this.blinkTime = 0;
		this.input.requestPointerLock();
	}

	private setPaused(paused: boolean): void {
		this.phase = paused ? "paused" : "playing";
		if (paused) this.input.releasePointerLock();
		else this.input.requestPointerLock();
	}

	private enterDead(): void {
		if (this.phase === "dead") return;
		this.phase = "dead";
		this.blinkTime = 0;
		this.input.releasePointerLock();
	}

	private restartLevel(): void {
		// A restart re-runs the level from scratch, but you keep the weapons you
		// found — dying shouldn't cost you the shotgun three levels back.
		this.loadLevel(this.levelIndex);
		this.phase = "playing";
		this.input.requestPointerLock();
	}

	private advanceLevel(): void {
		this.carry = this.world.carryState();
		const next = this.levelIndex + 1;
		if (next >= LEVELS.length) {
			this.phase = "victory";
			this.blinkTime = 0;
			return;
		}
		this.levelIndex = next;
		this.loadLevel(next);
		this.phase = "playing";
		this.input.requestPointerLock();
	}

	private loadLevel(index: number): void {
		this.world = new World(LEVELS[index], this.audio, this.carry);
		this.renderer.bindLevel(this.world);
		this.blinkTime = 0;
	}

	/* ── Draw ───────────────────────────────────────────────────────────── */

	render(): void {
		if (this.disposed) return;
		const fb = this.renderer.fb;
		const blink = this.blinkTime % 1 < 0.62;

		switch (this.phase) {
			case "title":
				drawTitle(fb, blink);
				break;

			case "intermission":
				drawIntermission(
					fb,
					this.world,
					this.levelIndex + 1 < LEVELS.length ? LEVELS[this.levelIndex + 1].name : null,
					blink,
				);
				break;

			case "victory":
				drawVictory(fb, this.world, blink);
				break;

			case "automap":
				drawAutomap(fb, this.world);
				drawHud(fb, this.world);
				break;

			default: {
				this.renderer.render(this.world);
				drawHud(fb, this.world);
				if (this.input.locked && this.phase === "playing") {
					drawCrosshair(fb, this.world, this.renderer.horizonFor(this.world));
				}
				if (this.phase === "paused") drawPaused(fb);
				if (this.phase === "dead") drawDead(fb, blink);
				break;
			}
		}

		this.renderer.present();
	}

	/** Height of the 3D view, i.e. the framebuffer minus the status bar. */
	get viewHeight(): number {
		return VIEW_H - HUD_HEIGHT;
	}

	dispose(): void {
		this.disposed = true;
		this.loop.stop();
		this.input.dispose();
		this.audio.dispose();
		this.host.removeEventListener("mousedown", this.onHostMouseDown);
	}
}
