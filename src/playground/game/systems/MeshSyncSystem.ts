import * as THREE from "three";
import type { Engine } from "../../engine/Engine";
import type { System } from "../../engine/ecs/System";
import { RenderTransform, VehicleComponent } from "../components";
import tuning from "../../data/physics/tuning.json";

const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

/**
 * Copies interpolated physics transforms onto vehicle meshes each frame and
 * animates wheels (suspension travel, steering, spin) from wheel state.
 */
export class MeshSyncSystem implements System {
	readonly name = "meshSync";

	update(engine: Engine, _dt: number, alpha: number): void {
		for (const id of engine.world.query(VehicleComponent, RenderTransform)) {
			const vc = engine.world.require(id, VehicleComponent);
			const rt = engine.world.require(id, RenderTransform);

			tmpPos.copy(rt.prevPosition).lerp(rt.position, alpha);
			tmpQuat.copy(rt.prevRotation).slerp(rt.rotation, alpha);
			vc.mesh.root.position.copy(tmpPos);
			vc.mesh.root.quaternion.copy(tmpQuat);

			for (let i = 0; i < vc.mesh.wheels.length; i++) {
				const wheelMesh = vc.mesh.wheels[i];
				const wheel = vc.vehicle.wheels[i];
				const travel = tuning.suspension.restLength * (1 - wheel.compression);
				wheelMesh.position.set(
					wheel.localOffset.x,
					wheel.localOffset.y - travel + tuning.suspension.wheelRadius * 0.4,
					wheel.localOffset.z,
				);
				wheelMesh.rotation.set(wheel.spin % (Math.PI * 2), wheel.steerAngle, 0, "YXZ");
			}
		}
	}
}
