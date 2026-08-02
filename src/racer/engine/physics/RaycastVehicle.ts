import * as THREE from "three";
import { clamp, clamp01, lerp } from "../../shared/math";
import type { DriveInput } from "../input/Input";
import { GROUP_GROUND, GROUP_BARRIER, GROUP_VEHICLE, RAPIER, type PhysicsWorld, type SurfaceType } from "./PhysicsWorld";
import tuning from "../../data/physics/tuning.json";

/** Normalized 0..1 stats straight from a vehicle's JSON definition. */
export interface VehicleStats {
	acceleration: number;
	maxSpeed: number;
	handling: number;
	grip: number;
	weight: number;
	drift: number;
	boost: number;
}

export interface WheelState {
	/** Chassis-local anchor of the suspension top. */
	localOffset: THREE.Vector3;
	steered: boolean;
	powered: boolean;
	grounded: boolean;
	surface: SurfaceType;
	compression: number;
	/** World position of the wheel center — consumed by the render mesh. */
	worldCenter: THREE.Vector3;
	steerAngle: number;
	/** Accumulated spin for wheel mesh rotation. */
	spin: number;
	/** 0..1 lateral slip — drives skid audio/marks. */
	slip: number;
}

/**
 * Arcade raycast vehicle on a single Rapier dynamic body.
 *
 * Four rays replace real wheel colliders: each grounded ray applies a spring/
 * damper suspension impulse plus tire impulses (longitudinal drive/brake,
 * lateral grip with a friction-circle clamp). Handbrake cuts rear grip for
 * drifting. Everything scales off normalized data-driven stats, so vehicle
 * feel is defined entirely in JSON.
 */
export class RaycastVehicle {
	readonly body: RAPIER.RigidBody;
	readonly wheels: WheelState[];
	readonly mass: number;
	readonly stats: VehicleStats;

	// derived physical parameters (resolved once from stats + tuning)
	private readonly engineAccel: number;
	private readonly topSpeed: number;
	private readonly maxSteer: number;
	private readonly gripCoeff: number;
	private readonly driftGripScale: number;
	private readonly boostPower: number;
	private readonly angularDamping: number;

	/** 0..1 boost charge. */
	boostCharge = 1;
	boosting = false;
	/** 0..1 slipstream strength, set by the SlipstreamSystem each fixed step. */
	slipstream = 0;
	/** Smoothed steering state. */
	private steer = 0;
	/** 0..1 how sideways the car currently travels — for audio/FX. */
	driftAmount = 0;
	/** Boost charge earned this step by drifting — 0 unless sliding. */
	driftCharge = 0;
	/** Dominant surface under the wheels this step. */
	surface: SurfaceType = "road";

	// scratch vectors (no per-frame allocation)
	private static tmp = {
		up: new THREE.Vector3(),
		forward: new THREE.Vector3(),
		right: new THREE.Vector3(),
		anchor: new THREE.Vector3(),
		vel: new THREE.Vector3(),
		wheelForward: new THREE.Vector3(),
		wheelRight: new THREE.Vector3(),
		impulse: new THREE.Vector3(),
		point: new THREE.Vector3(),
		quat: new THREE.Quaternion(),
	};

	constructor(physics: PhysicsWorld, stats: VehicleStats, position: THREE.Vector3, yaw: number) {
		this.stats = stats;
		const s = tuning.stats;
		this.mass = lerp(s.massMin, s.massMax, stats.weight);
		this.engineAccel = lerp(s.engineAccelMin, s.engineAccelMax, stats.acceleration);
		this.topSpeed = lerp(s.topSpeedMin, s.topSpeedMax, stats.maxSpeed);
		this.maxSteer = lerp(s.steerMinRad, s.steerMaxRad, stats.handling);
		this.gripCoeff = lerp(s.gripMin, s.gripMax, stats.grip);
		this.driftGripScale = lerp(s.driftGripScaleMin, s.driftGripScaleMax, stats.drift);
		this.boostPower = lerp(s.boostPowerMin, s.boostPowerMax, stats.boost);

		const c = tuning.chassis;
		const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
		this.angularDamping = tuning.aero.angularDamping;
		const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(position.x, position.y, position.z)
			.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })
			.setLinearDamping(tuning.aero.linearDamping)
			.setAngularDamping(this.angularDamping)
			.setCanSleep(false);
		this.body = physics.world.createRigidBody(bodyDesc);

		// chassis box, shifted down so the center of mass sits low (stability)
		const colliderDesc = RAPIER.ColliderDesc.cuboid(c.halfWidth, c.halfHeight, c.halfLength)
			.setTranslation(0, -c.comDrop * 0.5, 0)
			.setMass(this.mass)
			.setFriction(0.35)
			.setRestitution(0.1)
			.setCollisionGroups(((GROUP_VEHICLE << 16) | (GROUP_GROUND | GROUP_BARRIER | GROUP_VEHICLE)) >>> 0);
		physics.world.createCollider(colliderDesc, this.body);

		const w = tuning.wheels;
		const mkWheel = (x: number, z: number, steered: boolean, powered: boolean): WheelState => ({
			localOffset: new THREE.Vector3(x, w.offsetY, z),
			steered,
			powered,
			grounded: false,
			surface: "road",
			compression: 0,
			worldCenter: new THREE.Vector3(),
			steerAngle: 0,
			spin: 0,
			slip: 0,
		});
		this.wheels = [
			mkWheel(-w.offsetX, w.offsetZFront, true, false),
			mkWheel(w.offsetX, w.offsetZFront, true, false),
			mkWheel(-w.offsetX, w.offsetZRear, false, true),
			mkWheel(w.offsetX, w.offsetZRear, false, true),
		];
	}

	get position(): THREE.Vector3 {
		const t = this.body.translation();
		return new THREE.Vector3(t.x, t.y, t.z);
	}

	get rotation(): THREE.Quaternion {
		const r = this.body.rotation();
		return new THREE.Quaternion(r.x, r.y, r.z, r.w);
	}

	get velocity(): THREE.Vector3 {
		const v = this.body.linvel();
		return new THREE.Vector3(v.x, v.y, v.z);
	}

	get speed(): number {
		const v = this.body.linvel();
		return Math.hypot(v.x, v.y, v.z);
	}

	/** Compass heading of the chassis nose (radians), independent of travel. */
	get headingY(): number {
		const f = RaycastVehicle.tmp.forward.set(0, 0, 1).applyQuaternion(this.rotation);
		return Math.atan2(f.x, f.z);
	}

	/** Signed speed along the chassis forward axis (m/s). */
	get forwardSpeed(): number {
		const v = this.body.linvel();
		const f = RaycastVehicle.tmp.forward.set(0, 0, 1).applyQuaternion(this.rotation);
		return v.x * f.x + v.y * f.y + v.z * f.z;
	}

	get groundedWheels(): number {
		return this.wheels.filter((w) => w.grounded).length;
	}

	/** Hard reset (respawn / unstuck). */
	teleport(position: { x: number; y: number; z: number }, yaw: number): void {
		const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
		this.body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
		this.body.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w }, true);
		this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
		this.steer = 0;
	}

	update(physics: PhysicsWorld, input: DriveInput, dt: number): void {
		const tmp = RaycastVehicle.tmp;
		const rot = this.rotation;
		const pos = this.position;
		const up = tmp.up.set(0, 1, 0).applyQuaternion(rot);
		const forward = tmp.forward.set(0, 0, 1).applyQuaternion(rot);
		const right = tmp.right.set(1, 0, 0).applyQuaternion(rot);

		const susp = tuning.suspension;
		const rayLength = susp.restLength + susp.wheelRadius;
		const massShare = this.mass / this.wheels.length;
		const forwardSpeed = this.forwardSpeed;
		const speed = this.speed;

		// --- steering (speed-sensitive, smoothed; returns to center faster) ---
		const steerLimit = this.maxSteer / (1 + Math.abs(forwardSpeed) * tuning.stats.steerSpeedFalloff);
		const steerTarget = clamp(input.steer, -1, 1) * steerLimit;
		const returning = Math.abs(steerTarget) < Math.abs(this.steer) || steerTarget * this.steer < 0;
		const steerRate = (returning ? 16 : 9) * dt;
		this.steer += clamp(steerTarget - this.steer, -steerRate, steerRate);

		// --- boost management (slipstreaming and drifting both feed regen) ---
		// driftAmount is from the previous step; using it here keeps the reward
		// one frame behind the slide, which is imperceptible and avoids
		// recomputing the drift metric before the tire impulses have run.
		const driftReward =
			this.driftAmount > tuning.stats.driftRegenMinAmount ? tuning.stats.driftRegenPerSec * this.driftAmount : 0;
		this.boosting = input.boost && this.boostCharge > 0.02;
		if (this.boosting) {
			this.boostCharge = clamp01(this.boostCharge - tuning.stats.boostDrainPerSec * dt);
			this.driftCharge = 0;
		} else {
			const regen =
				tuning.stats.boostRegenPerSec * (1 + this.slipstream * tuning.slipstream.regenMultiplier) + driftReward;
			this.boostCharge = clamp01(this.boostCharge + regen * dt);
			this.driftCharge = driftReward;
		}

		// the chassis is heavily yaw-damped for stability; ease that off while
		// the handbrake is down so the car can actually rotate into a slide
		this.body.setAngularDamping(
			input.handbrake ? this.angularDamping * tuning.stats.handbrakeYawDamping : this.angularDamping,
		);

		let groundedCount = 0;
		const surfaceVotes: Record<string, number> = {};

		for (const wheel of this.wheels) {
			wheel.steerAngle = wheel.steered ? this.steer : 0;

			// world-space suspension anchor
			const anchor = tmp.anchor.copy(wheel.localOffset).applyQuaternion(rot).add(pos);
			const ray = new RAPIER.Ray(
				{ x: anchor.x, y: anchor.y, z: anchor.z },
				{ x: -up.x, y: -up.y, z: -up.z },
			);
			const hit = physics.world.castRay(ray, rayLength, true, undefined, undefined, undefined, this.body);

			if (!hit) {
				wheel.grounded = false;
				wheel.compression = 0;
				wheel.slip = 0;
				wheel.worldCenter.copy(anchor).addScaledVector(up, -susp.restLength);
				continue;
			}

			wheel.grounded = true;
			groundedCount++;
			const hitDist = hit.timeOfImpact;
			wheel.compression = clamp01(1 - (hitDist - susp.wheelRadius) / susp.restLength);
			wheel.worldCenter.copy(anchor).addScaledVector(up, -(hitDist - susp.wheelRadius));
			wheel.surface = physics.surfaceOf(hit.collider);
			surfaceVotes[wheel.surface] = (surfaceVotes[wheel.surface] ?? 0) + 1;
			const surfaceCfg = tuning.surfaces[wheel.surface];

			// velocity of the chassis at the wheel anchor
			const linvel = this.body.linvel();
			const angvel = this.body.angvel();
			const rel = tmp.point.copy(anchor).sub(pos);
			const vel = tmp.vel.set(
				linvel.x + angvel.y * rel.z - angvel.z * rel.y,
				linvel.y + angvel.z * rel.x - angvel.x * rel.z,
				linvel.z + angvel.x * rel.y - angvel.y * rel.x,
			);

			// --- suspension spring + damper (impulse along chassis up) ---
			const springForce = susp.stiffness * wheel.compression;
			const damperForce = susp.damping * -vel.dot(up);
			const suspForce = Math.max(0, (springForce + damperForce) * massShare * 0.5);
			tmp.impulse.copy(up).multiplyScalar(suspForce * dt);
			this.body.applyImpulseAtPoint(
				{ x: tmp.impulse.x, y: tmp.impulse.y, z: tmp.impulse.z },
				{ x: anchor.x, y: anchor.y, z: anchor.z },
				true,
			);

			// --- tire frame (steered around chassis up) ---
			const wheelForward = tmp.wheelForward
				.copy(forward)
				.applyAxisAngle(up, wheel.steerAngle)
				.projectOnPlane(up)
				.normalize();
			const wheelRight = tmp.wheelRight.crossVectors(up, wheelForward).normalize();

			const lateralSpeed = vel.dot(wheelRight);
			const forwardWheelSpeed = vel.dot(wheelForward);
			wheel.spin += (forwardWheelSpeed / susp.wheelRadius) * dt;

			// --- lateral grip (friction-circle clamped, drift-scaled) ---
			let grip = this.gripCoeff * surfaceCfg.gripScale;
			// the handbrake locks the rears outright — a much harder cut than the
			// stat-driven scale that keeps a car loose once it's already sliding
			if (!wheel.steered && input.handbrake) grip *= tuning.stats.handbrakeGripScale;
			else if (!wheel.steered && this.driftAmount > 0.55) grip *= this.driftGripScale;
			const maxLateralImpulse = grip * massShare * dt * 9.81;
			const lateralImpulse = clamp(-lateralSpeed * massShare * 0.9, -maxLateralImpulse, maxLateralImpulse);
			wheel.slip = clamp01(Math.abs(lateralSpeed) / 8);

			// --- longitudinal drive / brake ---
			let longitudinalImpulse = 0;
			const effectiveTop = this.topSpeed * (this.boosting ? 1.18 : 1);
			if (wheel.powered && input.throttle > 0) {
				// cubic taper keeps strong pull through the midrange
				const speedRatio = clamp01(forwardSpeed / effectiveTop);
				let accel = this.engineAccel * input.throttle * (1 - speedRatio * speedRatio * speedRatio);
				if (this.boosting) accel *= this.boostPower;
				longitudinalImpulse += accel * massShare * dt;
			}
			if (input.brake > 0) {
				if (forwardSpeed > 0.5) {
					// braking
					longitudinalImpulse -= tuning.stats.brakeDecel * input.brake * massShare * dt;
				} else if (!input.handbrake) {
					// reversing (handbrake held = parking hold, never reverse)
					const reverseTop = this.topSpeed * tuning.stats.reverseSpeedFraction;
					longitudinalImpulse -=
						this.engineAccel * 0.7 * input.brake * clamp01(1 + forwardSpeed / reverseTop) * massShare * dt;
				}
			}
			if (input.handbrake) {
				if (Math.abs(forwardSpeed) <= 1.5) {
					// parking hold: kill creep in either direction (all wheels)
					longitudinalImpulse -= forwardWheelSpeed * massShare * tuning.stats.parkingHoldScrub;
				} else if (wheel.powered) {
					// locked rears scrub some speed, but the point of the handbrake
					// is breaking traction — scrub hard enough to stop a slide and
					// the car just parks itself mid-corner instead of drifting
					longitudinalImpulse -= forwardWheelSpeed * massShare * tuning.stats.handbrakeScrub;
				}
			}
			// rolling resistance / surface drag
			longitudinalImpulse -= forwardWheelSpeed * massShare * 0.005 * surfaceCfg.dragScale;

			// apply tire impulse slightly above contact to reduce body roll
			const applyPoint = tmp.point
				.copy(anchor)
				.addScaledVector(up, -susp.restLength + tuning.suspension.forceApplyHeight);
			tmp.impulse
				.copy(wheelRight)
				.multiplyScalar(lateralImpulse)
				.addScaledVector(wheelForward, longitudinalImpulse);
			this.body.applyImpulseAtPoint(
				{ x: tmp.impulse.x, y: tmp.impulse.y, z: tmp.impulse.z },
				{ x: applyPoint.x, y: applyPoint.y, z: applyPoint.z },
				true,
			);
		}

		// dominant surface (defaults to road when airborne)
		let bestSurface: SurfaceType = "road";
		let bestVotes = 0;
		for (const [name, votes] of Object.entries(surfaceVotes)) {
			if (votes > bestVotes) {
				bestVotes = votes;
				bestSurface = name as SurfaceType;
			}
		}
		this.surface = bestSurface;

		// drift metric: how far velocity deviates from heading at speed
		const linvelNow = this.body.linvel();
		if (speed > 4) {
			tmp.vel.set(linvelNow.x, linvelNow.y, linvelNow.z).normalize();
			const alignment = Math.abs(tmp.vel.dot(forward));
			this.driftAmount = clamp01((1 - alignment) * 2.2) * clamp01(speed / 10);
		} else {
			this.driftAmount = 0;
		}

		// --- slipstream tow: gentle forward pull while in the draft ---
		if (this.slipstream > 0 && groundedCount > 0) {
			const pull = tuning.slipstream.pullAccel * this.slipstream * this.mass * dt;
			this.body.applyImpulse({ x: forward.x * pull, y: 0, z: forward.z * pull }, true);
		}

		// --- aero: quadratic drag + downforce for stability at speed ---
		const drag = tmp.impulse
			.set(linvelNow.x, linvelNow.y, linvelNow.z)
			.multiplyScalar(-tuning.aero.dragCoeff * speed * 0.02 * dt * this.mass * 0.001);
		this.body.applyImpulse({ x: drag.x, y: drag.y, z: drag.z }, true);
		if (groundedCount > 0) {
			const downforce = tuning.aero.downforceCoeff * speed * dt;
			this.body.applyImpulse({ x: -up.x * downforce, y: -up.y * downforce, z: -up.z * downforce }, true);
		}

		// --- upright stabilization (stronger in air so landings recover) ---
		const uprightK = groundedCount === 0 ? tuning.stabilization.airUprightTorque : tuning.stabilization.uprightTorque;
		const tilt = tmp.point.crossVectors(up, new THREE.Vector3(0, 1, 0));
		this.body.applyTorqueImpulse(
			{ x: tilt.x * uprightK * dt, y: 0, z: tilt.z * uprightK * dt },
			true,
		);
	}
}
