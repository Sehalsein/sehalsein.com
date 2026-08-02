import type { EntityId } from "../engine/ecs/World";

/**
 * Global event map carried by the engine's EventBus. Payloads use primitives
 * and entity ids only, so any module can subscribe without importing another
 * module's internals.
 */

export type RacePhase = "menu" | "countdown" | "racing" | "finished";

export interface StandingEntry {
	entity: EntityId;
	name: string;
	isPlayer: boolean;
	position: number;
	lapsCompleted: number;
	bestLapMs: number | null;
	totalMs: number | null;
	finished: boolean;
	/** Distance covered along the track, in meters — the gap metric. */
	progressM: number;
	/** Body colour, so the HUD can dot-match the standings to the cars. */
	color: string;
}

export interface GameEvents {
	"race:phase": { phase: RacePhase };
	"race:countdown": { value: number };
	"race:checkpoint": { entity: EntityId; checkpoint: number; total: number };
	"race:lap": { entity: EntityId; lap: number; lapTimeMs: number; bestLapMs: number; isPlayer: boolean };
	"race:wrongWay": { entity: EntityId; wrongWay: boolean };
	"race:standings": { standings: StandingEntry[] };
	"race:finished": { standings: StandingEntry[] };
	"track:generated": { seed: string; biome: string; lengthM: number; name: string };
	"vehicle:boost": { entity: EntityId; charge: number; active: boolean };
	"debug:toggle": { panel: boolean };
}
