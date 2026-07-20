import type { Engine } from "../../engine/Engine";
import type { System } from "../../engine/ecs/System";
import { clamp01 } from "../../shared/math";
import { PlayerControlled, VehicleComponent } from "../components";

/**
 * Bridges game state to the synth audio: player engine note, skid noise,
 * collision impacts (detected from unexplained velocity spikes) and countdown
 * beeps. The AudioContext starts on the first user gesture.
 */
export class AudioSystem implements System {
	readonly name = "audio";
	private prevSpeed = 0;
	private unsubscribe: (() => void)[] = [];

	init(engine: Engine): void {
		const startAudio = () => engine.audio.start();
		window.addEventListener("pointerdown", startAudio, { once: true });
		window.addEventListener("keydown", startAudio, { once: true });
		this.unsubscribe.push(
			() => window.removeEventListener("pointerdown", startAudio),
			() => window.removeEventListener("keydown", startAudio),
			engine.events.on("race:countdown", ({ value }) => {
				engine.audio.playBeep(value === 0 ? 880 : 440, value === 0 ? 0.35 : 0.12, 0.22);
			}),
			engine.events.on("race:lap", ({ isPlayer }) => {
				if (isPlayer) engine.audio.playBeep(660, 0.1, 0.18);
			}),
		);
	}

	fixedUpdate(engine: Engine, dt: number): void {
		if (engine.input.justPressed("toggleMute")) engine.audio.toggleMute();

		for (const id of engine.world.query(PlayerControlled, VehicleComponent)) {
			const vc = engine.world.require(id, VehicleComponent);
			const vehicle = vc.vehicle;
			const speed = vehicle.speed;

			// collision heuristic: speed dropped far faster than brakes allow
			const decel = (this.prevSpeed - speed) / dt;
			if (decel > 55 && this.prevSpeed > 6) {
				engine.audio.playImpact(clamp01(decel / 160));
			}
			this.prevSpeed = speed;

			const rpm = clamp01(speed / 40) * 0.85 + vc.input.throttle * 0.15;
			engine.audio.updateVehicleSound(rpm, vehicle.driftAmount, vehicle.boosting);
		}
	}

	dispose(): void {
		for (const fn of this.unsubscribe) fn();
	}
}
