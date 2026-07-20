import type { Engine } from "../../engine/Engine";
import type { System } from "../../engine/ecs/System";
import type { EntityId } from "../../engine/ecs/World";
import { mod } from "../../shared/math";
import type { StandingEntry } from "../../shared/gameEvents";
import type { TrackData } from "../../procedural/types";
import { RacerState, RenderTransform, VehicleComponent } from "../components";
import settings from "../../data/race/settings.json";

export type RaceMode = keyof typeof settings.modes;

/** Samples within which a checkpoint counts as crossed (~60m at ds=4). */
const CHECKPOINT_WINDOW = 15;

/**
 * Race state machine + per-racer progress tracking.
 *
 * Progress is measured by each racer's nearest spline sample (searched locally
 * around the previous value, so it's O(1) per racer and can't teleport across
 * the track). Checkpoints/laps key off monotonic sample progress, which makes
 * cutting impossible and wrong-way detection trivial.
 */
export class RaceSystem implements System {
	readonly name = "race";

	phase: "menu" | "countdown" | "racing" | "finished" = "menu";
	mode: RaceMode = "race";
	totalLaps = settings.laps;
	private track: TrackData | null = null;
	private countdownRemaining = 0;
	private lastCountdownWhole = -1;
	private minTrackY = 0;
	private standingsDirty = false;

	get inputsEnabled(): boolean {
		return this.phase === "racing" || (this.phase === "finished" && this.mode === "practice");
	}

	configure(track: TrackData, mode: RaceMode): void {
		this.track = track;
		this.mode = mode;
		this.totalLaps = settings.modes[mode].laps;
		this.minTrackY = Math.min(...track.samples.map((s) => s.y));
		this.phase = "menu";
	}

	startCountdown(engine: Engine): void {
		this.phase = "countdown";
		this.countdownRemaining = settings.countdownSeconds + 0.5;
		this.lastCountdownWhole = -1;
		engine.events.emit("race:phase", { phase: "countdown" });
	}

	fixedUpdate(engine: Engine, dt: number): void {
		if (this.phase !== "countdown") return;
		this.countdownRemaining -= dt;
		const whole = Math.ceil(this.countdownRemaining);
		if (whole !== this.lastCountdownWhole && whole >= 1 && whole <= settings.countdownSeconds) {
			this.lastCountdownWhole = whole;
			engine.events.emit("race:countdown", { value: whole });
		}
		if (this.countdownRemaining <= 0) {
			this.phase = "racing";
			for (const id of engine.world.query(RacerState)) {
				engine.world.require(id, RacerState).lapStartSim = engine.simTime;
			}
			engine.events.emit("race:countdown", { value: 0 });
			engine.events.emit("race:phase", { phase: "racing" });
		}
	}

	postFixedUpdate(engine: Engine, dt: number): void {
		const track = this.track;
		if (!track || this.phase === "menu") return;
		const n = track.samples.length;

		for (const id of engine.world.query(RacerState, VehicleComponent)) {
			const racer = engine.world.require(id, RacerState);
			const vc = engine.world.require(id, VehicleComponent);
			const pos = vc.vehicle.position;

			// --- local nearest-sample search (window ±30 samples ≈ 120m) ---
			let best = racer.nearestSample;
			let bestD2 = Number.POSITIVE_INFINITY;
			for (let o = -30; o <= 30; o++) {
				const i = mod(racer.nearestSample + o, n);
				const dx = track.samples[i].x - pos.x;
				const dz = track.samples[i].z - pos.z;
				const d2 = dx * dx + dz * dz;
				if (d2 < bestD2) {
					bestD2 = d2;
					best = i;
				}
			}
			let delta = best - racer.nearestSample;
			if (delta > n / 2) delta -= n;
			if (delta < -n / 2) delta += n;
			racer.nearestSample = best;
			if (this.phase !== "finished" || !racer.finished) racer.totalProgress += delta;

			// --- fell off the world ---
			if (pos.y < this.minTrackY - 30) {
				this.respawn(engine, id, racer);
				continue;
			}

			// --- wrong-way (sustained backwards progress at speed) ---
			const sample = track.samples[best];
			const vel = vc.vehicle.velocity;
			const along = vel.x * sample.tx + vel.z * sample.tz;
			if (along < -3 && this.phase === "racing") racer.wrongWayTime += dt;
			else racer.wrongWayTime = Math.max(0, racer.wrongWayTime - dt * 2);
			if (racer.isPlayer) {
				const wrongWay = racer.wrongWayTime > settings.wrongWayGraceSeconds;
				engine.events.emit("race:wrongWay", { entity: id, wrongWay });
			}

			// --- checkpoints & laps ---
			if (this.phase === "racing" && !racer.finished) {
				const nextCp = track.checkpoints[racer.nextCheckpoint];
				const distFromCp = mod(best - nextCp.sampleIndex, n);
				if (distFromCp <= CHECKPOINT_WINDOW && bestD2 < (nextCp.halfWidth + 6) ** 2) {
					if (racer.nextCheckpoint === 0) {
						this.onStartLineCrossed(engine, id, racer);
					} else {
						engine.events.emit("race:checkpoint", {
							entity: id,
							checkpoint: racer.nextCheckpoint,
							total: track.checkpoints.length,
						});
					}
					racer.nextCheckpoint = (racer.nextCheckpoint + 1) % track.checkpoints.length;
				}
			}
		}

		this.updateStandings(engine);
	}

	private onStartLineCrossed(engine: Engine, id: EntityId, racer: RacerState): void {
		if (racer.lap === 0) {
			// first crossing arms lap 1 — no time recorded
			racer.lap = 1;
			racer.lapStartSim = engine.simTime;
			return;
		}
		const lapTimeMs = (engine.simTime - racer.lapStartSim) * 1000;
		racer.lapTimesMs.push(lapTimeMs);
		racer.bestLapMs = racer.bestLapMs === null ? lapTimeMs : Math.min(racer.bestLapMs, lapTimeMs);
		racer.lapStartSim = engine.simTime;
		racer.lap++;
		engine.events.emit("race:lap", {
			entity: id,
			lap: racer.lap,
			lapTimeMs,
			bestLapMs: racer.bestLapMs,
			isPlayer: racer.isPlayer,
		});

		const lapsCompleted = racer.lap - 1;
		if (this.totalLaps > 0 && lapsCompleted >= this.totalLaps) {
			racer.finished = true;
			racer.finishSimTime = engine.simTime;
			this.standingsDirty = true;
			if (racer.isPlayer) {
				this.phase = "finished";
				engine.events.emit("race:phase", { phase: "finished" });
				engine.events.emit("race:finished", { standings: this.computeStandings(engine) });
			}
		}
	}

	private updateStandings(engine: Engine): void {
		// cheap cadence: every 15 fixed steps (or immediately when someone finishes)
		if (!this.standingsDirty && engine.simTick % 15 !== 0) return;
		this.standingsDirty = false;
		engine.events.emit("race:standings", { standings: this.computeStandings(engine) });
	}

	computeStandings(engine: Engine): StandingEntry[] {
		const entries: { id: EntityId; racer: RacerState }[] = [];
		for (const id of engine.world.query(RacerState)) {
			entries.push({ id, racer: engine.world.require(id, RacerState) });
		}
		entries.sort((a, b) => {
			if (a.racer.finished && b.racer.finished) {
				return (a.racer.finishSimTime ?? 0) - (b.racer.finishSimTime ?? 0);
			}
			if (a.racer.finished !== b.racer.finished) return a.racer.finished ? -1 : 1;
			return b.racer.totalProgress - a.racer.totalProgress;
		});
		return entries.map(({ id, racer }, index) => {
			racer.position = index + 1;
			return {
				entity: id,
				name: racer.displayName,
				isPlayer: racer.isPlayer,
				position: index + 1,
				lapsCompleted: Math.max(0, racer.lap - 1),
				bestLapMs: racer.bestLapMs,
				totalMs: racer.finishSimTime !== null ? racer.finishSimTime * 1000 : null,
				finished: racer.finished,
			};
		});
	}

	/** Place a racer back on the racing line at their current progress. */
	respawn(engine: Engine, id: EntityId, racer: RacerState): void {
		const track = this.track;
		if (!track) return;
		const vc = engine.world.require(id, VehicleComponent);
		const i = racer.nearestSample;
		const point = track.racingLine[i];
		const sample = track.samples[i];
		const yaw = Math.atan2(sample.tx, sample.tz);
		// slight lift so the suspension settles cleanly
		vc.vehicle.teleport({ x: point.x, y: point.y + 1.2, z: point.z }, yaw);
		const rt = engine.world.get(id, RenderTransform);
		rt?.snapTo(vc.vehicle.position, vc.vehicle.rotation);
		racer.wrongWayTime = 0;
	}
}
