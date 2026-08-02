import type { Engine } from "../../engine/Engine";
import type { System } from "../../engine/ecs/System";
import { neutralDriveInput } from "../../engine/input/Input";
import { PlayerControlled, RacerState, VehicleComponent } from "../components";
import type { RaceSystem } from "./RaceSystem";

/**
 * Feeds keyboard/gamepad state into the player vehicle each fixed step.
 * Inputs are frozen (brakes held) while the race hasn't started.
 */
export class PlayerInputSystem implements System {
	readonly name = "playerInput";

	constructor(private race: RaceSystem) {}

	fixedUpdate(engine: Engine): void {
		for (const id of engine.world.query(PlayerControlled, VehicleComponent)) {
			const vc = engine.world.require(id, VehicleComponent);
			if (!this.race.inputsEnabled) {
				// parking hold on the grid — brake would engage reverse at standstill
				vc.input = { ...neutralDriveInput(), handbrake: true };
				continue;
			}
			vc.input = engine.input.getDriveInput();

			if (engine.input.justPressed("reset")) {
				const racer = engine.world.get(id, RacerState);
				if (racer) this.race.respawn(engine, id, racer);
			}
		}
	}
}
