import type { Engine } from "../../engine/Engine";
import type { System } from "../../engine/ecs/System";
import { RenderTransform, VehicleComponent } from "../components";

/**
 * Steps every vehicle's physics from its current DriveInput (set earlier in
 * the fixed step by the player/AI systems), then captures post-physics body
 * transforms for render interpolation.
 */
export class VehicleSystem implements System {
	readonly name = "vehicles";

	fixedUpdate(engine: Engine, dt: number): void {
		for (const id of engine.world.query(VehicleComponent)) {
			const vc = engine.world.require(id, VehicleComponent);
			vc.vehicle.update(engine.physics, vc.input, dt);
		}
	}

	postFixedUpdate(engine: Engine): void {
		for (const id of engine.world.query(VehicleComponent, RenderTransform)) {
			const vc = engine.world.require(id, VehicleComponent);
			const rt = engine.world.require(id, RenderTransform);
			rt.prevPosition.copy(rt.position);
			rt.prevRotation.copy(rt.rotation);
			rt.position.copy(vc.vehicle.position);
			rt.rotation.copy(vc.vehicle.rotation);
		}
	}
}
