export interface LoopHandlers {
	/** Deterministic simulation step. */
	fixedUpdate(dt: number): void;
	/** Draw. `alpha` is the fraction of the way into the next fixed step. */
	render(alpha: number, frameDt: number): void;
}

/**
 * Fixed-timestep main loop. Simulation advances in exact `1/hz` increments so
 * movement, AI and weapon timing never depend on the display refresh rate;
 * rendering happens once per animation frame with an interpolation factor.
 */
export class Loop {
	readonly fixedDt: number;
	/** Total simulated time in seconds. */
	time = 0;
	/** Fixed steps elapsed — a deterministic frame counter. */
	tick = 0;
	/** Smoothed frames per second, for the debug readout. */
	fps = 0;

	private handlers: LoopHandlers;
	private rafId = 0;
	private lastTime = 0;
	private accumulator = 0;
	private running = false;

	constructor(handlers: LoopHandlers, hz = 60) {
		this.handlers = handlers;
		this.fixedDt = 1 / hz;
	}

	start(): void {
		if (this.running) return;
		this.running = true;
		this.lastTime = performance.now();
		const frame = (now: number) => {
			if (!this.running) return;
			this.rafId = requestAnimationFrame(frame);
			this.step(now);
		};
		this.rafId = requestAnimationFrame(frame);
	}

	stop(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
	}

	private step(now: number): void {
		// Clamp long frames (tab switch, GC pause) so we never run a catch-up
		// spiral of simulation steps.
		const frameDt = Math.min((now - this.lastTime) / 1000, 0.1);
		this.lastTime = now;
		this.accumulator += frameDt;
		if (frameDt > 0) this.fps += (1 / frameDt - this.fps) * 0.1;

		let steps = 0;
		while (this.accumulator >= this.fixedDt && steps < 6) {
			this.handlers.fixedUpdate(this.fixedDt);
			this.time += this.fixedDt;
			this.tick++;
			this.accumulator -= this.fixedDt;
			steps++;
		}

		this.handlers.render(this.accumulator / this.fixedDt, frameDt);
	}
}
