import type { Engine } from "../../engine/Engine";
import type { System } from "../../engine/ecs/System";
import { clamp, clamp01, lerp, mod, wrapAngle } from "../../shared/math";
import type { TrackData } from "../../procedural/types";
import { AIControlled, RacerState, VehicleComponent } from "../components";
import { neutralDriveInput } from "../../engine/input/Input";
import type { RaceSystem } from "./RaceSystem";

/**
 * AI drivers follow the generated racing line with pure-pursuit steering and
 * the line's speed profile for throttle/brake. Personality comes entirely
 * from data (data/ai/profiles.json):
 *
 * - reactionTime  → first-order lag on steering/throttle
 * - consistency   → noise amplitude on the target speed
 * - cornering     → how much of the line's cornering speed they dare carry
 * - braking       → how early they brake for the next slow section
 * - mistakeChance → occasional off-line excursions with lifted throttle
 * - aggression    → boost usage + how close they'll run to rivals
 *
 * All randomness is drawn from per-driver seeded streams: same seed, same race.
 */
export class AISystem implements System {
	readonly name = "ai";
	private track: TrackData | null = null;
	private stuckTimers = new Map<number, number>();

	constructor(private race: RaceSystem) {}

	setTrack(track: TrackData): void {
		this.track = track;
		this.stuckTimers.clear();
	}

	fixedUpdate(engine: Engine, dt: number): void {
		const track = this.track;
		if (!track) return;
		const n = track.samples.length;

		const vehicles = engine.world.query(VehicleComponent, RacerState);

		for (const id of engine.world.query(AIControlled, VehicleComponent, RacerState)) {
			const ai = engine.world.require(id, AIControlled);
			const vc = engine.world.require(id, VehicleComponent);
			const racer = engine.world.require(id, RacerState);
			const vehicle = vc.vehicle;

			if (!this.race.inputsEnabled) {
				vc.input = { ...neutralDriveInput(), handbrake: true };
				continue;
			}

			const profile = ai.profile;
			const speed = vehicle.speed;
			const pos = vehicle.position;

			// --- mistakes: occasionally drift off-line and lift ---
			if (ai.mistakeTimer > 0) {
				ai.mistakeTimer -= dt;
			} else if (ai.rng.chance(profile.mistakeChance * dt * 0.12)) {
				ai.mistakeTimer = ai.rng.range(0.8, 1.8);
				ai.mistakeOffset = ai.rng.range(-3.5, 3.5);
			}

			// --- pure pursuit target on the racing line ---
			const lookahead = clamp(speed * 0.55 + 6, 8, 42);
			const targetIndex = mod(racer.nearestSample + Math.round(lookahead / track.ds), n);
			const target = track.racingLine[targetIndex];
			let targetX = target.x;
			let targetZ = target.z;

			if (ai.mistakeTimer > 0) {
				const s = track.samples[targetIndex];
				targetX += s.tz * ai.mistakeOffset;
				targetZ += -s.tx * ai.mistakeOffset;
			}

			// --- collision avoidance / overtaking bias ---
			const avoidRadius = lerp(7, 4.5, profile.aggression);
			for (const otherId of vehicles) {
				if (otherId === id) continue;
				const other = engine.world.require(otherId, VehicleComponent).vehicle;
				const dx = other.position.x - pos.x;
				const dz = other.position.z - pos.z;
				const dist = Math.hypot(dx, dz);
				if (dist > avoidRadius || dist < 0.01) continue;
				// push the target away from the rival, harder when closer
				const push = (avoidRadius - dist) * 1.6;
				targetX -= (dx / dist) * push;
				targetZ -= (dz / dist) * push;
			}

			// --- steering: heading error → steer, with reaction-time lag ---
			const rot = vehicle.rotation;
			// yaw from the world-space forward vector (robust under pitch/roll)
			const fx = 2 * (rot.x * rot.z + rot.w * rot.y);
			const fz = 1 - 2 * (rot.x * rot.x + rot.y * rot.y);
			const yaw = Math.atan2(fx, fz);
			const desiredYaw = Math.atan2(targetX - pos.x, targetZ - pos.z);
			const headingError = wrapAngle(desiredYaw - yaw);
			const rawSteer = clamp(headingError * 1.6, -1, 1);
			const lagFactor = clamp01(dt / Math.max(profile.reactionTime, dt));
			ai.smoothedSteer += (rawSteer - ai.smoothedSteer) * lagFactor;

			// --- speed control from the line's speed profile ---
			// look for the slowest point we must be ready for, weighted by braking skill
			const brakeLookaheadM = speed * lerp(2.4, 1.5, profile.braking) + 10;
			const brakeSamples = Math.round(brakeLookaheadM / track.ds);
			let minAhead = Number.POSITIVE_INFINITY;
			for (let o = 0; o <= brakeSamples; o += 2) {
				const lineSpeed = track.racingLine[mod(racer.nearestSample + o, n)].speed;
				if (lineSpeed < minAhead) minAhead = lineSpeed;
			}
			const skill = lerp(0.72, 1.0, profile.cornering) * lerp(0.85, 1.0, profile.difficulty);
			const noise = 1 + ai.rng.gaussian() * 0.06 * (1 - profile.consistency);
			const targetSpeed = minAhead * skill * noise * (ai.mistakeTimer > 0 ? 0.8 : 1);

			let rawThrottle = 0;
			let brake = 0;
			if (speed < targetSpeed - 0.5) rawThrottle = 1;
			else if (speed > targetSpeed + 1.5) brake = clamp01((speed - targetSpeed) / 6);
			ai.smoothedThrottle += (rawThrottle - ai.smoothedThrottle) * lagFactor;

			// --- boost on straights when charged and feeling brave ---
			const currentK = Math.abs(track.samples[racer.nearestSample].curvature);
			const boost =
				vehicle.boostCharge > 0.85 &&
				currentK < 1 / 220 &&
				minAhead > speed + 6 &&
				ai.rng.chance(profile.aggression * 0.1);

			vc.input = {
				steer: ai.smoothedSteer,
				throttle: ai.smoothedThrottle,
				brake,
				handbrake: false,
				boost,
			};

			// --- stuck recovery ---
			const stuck = (this.stuckTimers.get(id) ?? 0) + (speed < 1.5 ? dt : -dt * 2);
			this.stuckTimers.set(id, Math.max(0, stuck));
			if (stuck > 3) {
				this.race.respawn(engine, id, racer);
				this.stuckTimers.set(id, 0);
			}
		}
	}
}
