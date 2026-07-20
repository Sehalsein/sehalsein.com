import type { Engine } from "../../engine/Engine";
import type { System } from "../../engine/ecs/System";
import { PlayerControlled, RenderTransform, VehicleComponent } from "../components";

/**
 * Points the isometric rig at the player (interpolated render position),
 * handles rotate/zoom input, and keeps the sun/shadow frustum tracking.
 */
export class CameraSystem implements System {
	readonly name = "camera";
	private detachFreeControls: (() => void) | null = null;

	init(engine: Engine): void {
		engine.camera.setAspect(engine.renderer.aspect);
		engine.renderer.onResize(() => engine.camera.setAspect(engine.renderer.aspect));
		this.detachFreeControls = engine.camera.attachFreeControls(engine.host);
	}

	fixedUpdate(engine: Engine): void {
		if (engine.input.justPressed("cameraRotateLeft")) engine.camera.rotate(1);
		if (engine.input.justPressed("cameraRotateRight")) engine.camera.rotate(-1);
	}

	update(engine: Engine, dt: number, alpha: number): void {
		if (engine.input.wheelDelta !== 0) engine.camera.zoomBy(engine.input.wheelDelta);

		for (const id of engine.world.query(PlayerControlled, RenderTransform)) {
			const rt = engine.world.require(id, RenderTransform);
			engine.camera.target.copy(rt.prevPosition).lerp(rt.position, alpha);
			const vc = engine.world.get(id, VehicleComponent);
			if (vc) {
				const speed = vc.vehicle.speed;
				engine.camera.setFollowSpeed(speed);
				// lead the camera along the velocity so the road ahead opens up —
				// a large part of perceived speed in a fixed isometric view
				if (speed > 2) {
					const v = vc.vehicle.body.linvel();
					const lead = Math.min(speed * 0.42, 14) / Math.max(speed, 0.001);
					engine.camera.target.x += v.x * lead;
					engine.camera.target.z += v.z * lead;
				}
			}
		}
		engine.camera.update(dt);
		engine.renderer.updateSunTarget(engine.camera.target);
	}

	dispose(): void {
		this.detachFreeControls?.();
	}
}
