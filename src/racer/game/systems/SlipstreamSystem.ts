import type { Engine } from "../../engine/Engine";
import type { System } from "../../engine/ecs/System";
import { clamp01 } from "../../shared/math";
import { VehicleComponent } from "../components";
import tuning from "../../data/physics/tuning.json";

/**
 * Slipstream detection. A car tucked into the corridor behind another car
 * (within `maxDistance` along the leader's heading, `maxLateral` off its
 * axis, both at speed) gets a 0..1 draft factor: distance-faded and
 * lateral-faded. The vehicle model turns that into faster boost regen plus
 * a gentle tow. Runs before VehicleSystem so the factor is fresh each step.
 */
export class SlipstreamSystem implements System {
	readonly name = "slipstream";

	fixedUpdate(engine: Engine): void {
		const cfg = tuning.slipstream;
		const ids = engine.world.query(VehicleComponent);
		const vehicles = ids.map((id) => engine.world.require(id, VehicleComponent).vehicle);

		for (const vehicle of vehicles) vehicle.slipstream = 0;

		for (let f = 0; f < vehicles.length; f++) {
			const follower = vehicles[f];
			if (follower.speed < cfg.minLeaderSpeed * 0.7) continue;
			const fp = follower.body.translation();
			let best = 0;

			for (let l = 0; l < vehicles.length; l++) {
				if (l === f) continue;
				const leader = vehicles[l];
				if (leader.speed < cfg.minLeaderSpeed) continue;

				// leader's horizontal forward from its quaternion
				const r = leader.body.rotation();
				let fx = 2 * (r.x * r.z + r.w * r.y);
				let fz = 1 - 2 * (r.x * r.x + r.y * r.y);
				const fLen = Math.hypot(fx, fz) || 1;
				fx /= fLen;
				fz /= fLen;

				const lp = leader.body.translation();
				const dx = fp.x - lp.x;
				const dz = fp.z - lp.z;
				// how far the follower sits behind the leader along its heading
				const behind = -(dx * fx + dz * fz);
				if (behind < 2 || behind > cfg.maxDistance) continue;
				const latX = dx + fx * behind;
				const latZ = dz + fz * behind;
				const lateral = Math.hypot(latX, latZ);
				if (lateral > cfg.maxLateral) continue;

				const factor =
					clamp01(1 - (behind - 2) / (cfg.maxDistance - 2)) * clamp01(1 - lateral / cfg.maxLateral);
				if (factor > best) best = factor;
			}
			follower.slipstream = best;
		}
	}
}
