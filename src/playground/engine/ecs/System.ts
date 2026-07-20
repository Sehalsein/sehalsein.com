import type { Engine } from "../Engine";

/**
 * A system owns one slice of behavior and runs against the ECS world.
 *
 * - `fixedUpdate` runs at the deterministic simulation rate (physics, AI,
 *   race logic). Never read wall-clock time or unseeded randomness here.
 * - `postFixedUpdate` runs after the physics world has stepped — the place to
 *   read back rigid-body transforms and run logic that depends on them.
 * - `update` runs once per rendered frame with `alpha` = interpolation factor
 *   between the last two fixed steps (visuals, cameras, UI).
 */
export interface System {
	readonly name: string;
	init?(engine: Engine): void | Promise<void>;
	fixedUpdate?(engine: Engine, dt: number): void;
	postFixedUpdate?(engine: Engine, dt: number): void;
	update?(engine: Engine, dt: number, alpha: number): void;
	dispose?(engine: Engine): void;
}
