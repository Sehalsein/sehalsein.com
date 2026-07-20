import { EventBus } from "../shared/events";
import type { GameEvents } from "../shared/gameEvents";
import { World } from "./ecs/World";
import type { System } from "./ecs/System";
import { Renderer } from "./renderer/Renderer";
import { CameraRig } from "./renderer/CameraRig";
import { Input } from "./input/Input";
import { PhysicsWorld } from "./physics/PhysicsWorld";
import { AudioManager } from "./audio/AudioManager";
import { AssetManager } from "./assets/AssetManager";

export interface EngineOptions {
	host: HTMLElement;
	canvas: HTMLCanvasElement;
	/** Simulation rate in Hz. Fixed for determinism. */
	fixedHz?: number;
}

/**
 * Composition root for all engine services plus the main loop.
 *
 * The loop uses a fixed-timestep accumulator: physics/AI/race logic advance in
 * deterministic `fixedDt` increments while rendering interpolates between the
 * last two simulation states (`alpha`), so visuals stay smooth at any display
 * refresh rate without affecting the simulation.
 */
export class Engine {
	readonly host: HTMLElement;
	readonly world = new World();
	readonly events = new EventBus<GameEvents>();
	readonly input: Input;
	readonly renderer: Renderer;
	readonly camera: CameraRig;
	readonly physics: PhysicsWorld;
	readonly audio: AudioManager;
	readonly assets: AssetManager;

	readonly fixedDt: number;
	/** Total simulated time in seconds (advances only during fixed steps). */
	simTime = 0;
	/** Total simulated fixed steps — use as a deterministic frame counter. */
	simTick = 0;

	private systems: System[] = [];
	private rafId = 0;
	private lastTime = 0;
	private accumulator = 0;
	private running = false;
	private disposed = false;

	constructor(options: EngineOptions) {
		this.host = options.host;
		this.fixedDt = 1 / (options.fixedHz ?? 60);
		this.input = new Input(options.host);
		this.renderer = new Renderer(options.canvas);
		this.camera = new CameraRig();
		this.physics = new PhysicsWorld();
		this.audio = new AudioManager();
		this.assets = new AssetManager();
	}

	/** Async because the Rapier WASM module must initialize first. */
	async init(): Promise<void> {
		await this.physics.init();
		for (const system of this.systems) await system.init?.(this);
	}

	addSystem(system: System): this {
		this.systems.push(system);
		return this;
	}

	getSystem<T extends System>(name: string): T | undefined {
		return this.systems.find((s) => s.name === name) as T | undefined;
	}

	start(): void {
		if (this.running || this.disposed) return;
		this.running = true;
		this.lastTime = performance.now();
		const frame = (now: number) => {
			if (!this.running) return;
			this.rafId = requestAnimationFrame(frame);
			this.tick(now);
		};
		this.rafId = requestAnimationFrame(frame);
	}

	stop(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
	}

	private tick(now: number): void {
		// clamp huge deltas (tab switches, GC pauses) so a slow frame never
		// triggers a catch-up spiral of extra physics steps
		const frameDt = Math.min((now - this.lastTime) / 1000, 0.05);
		this.lastTime = now;
		this.accumulator += frameDt;

		while (this.accumulator >= this.fixedDt) {
			this.input.beginFixedStep();
			for (const system of this.systems) system.fixedUpdate?.(this, this.fixedDt);
			this.physics.step(this.fixedDt);
			for (const system of this.systems) system.postFixedUpdate?.(this, this.fixedDt);
			this.simTime += this.fixedDt;
			this.simTick++;
			this.accumulator -= this.fixedDt;
		}

		const alpha = this.accumulator / this.fixedDt;
		for (const system of this.systems) system.update?.(this, frameDt, alpha);
		this.input.endFrame();

		this.renderer.render(this.camera.active);
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.stop();
		for (const system of this.systems) system.dispose?.(this);
		this.systems = [];
		this.events.clear();
		this.input.dispose();
		this.audio.dispose();
		this.physics.dispose();
		this.renderer.dispose();
		this.world.clear();
	}
}
