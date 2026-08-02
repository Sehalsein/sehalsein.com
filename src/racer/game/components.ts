import * as THREE from "three";
import type { RaycastVehicle } from "../engine/physics/RaycastVehicle";
import { type DriveInput, neutralDriveInput } from "../engine/input/Input";
import type { Rng } from "../shared/rng";
import type { VehicleColors, VehicleConfig } from "./vehicles/VehicleCatalog";
import type { VehicleMesh } from "./vehicles/VehicleMeshFactory";
import type { AIProfile } from "./ai/aiProfiles";

/** Physics-to-render interpolation state. */
export class RenderTransform {
	prevPosition = new THREE.Vector3();
	position = new THREE.Vector3();
	prevRotation = new THREE.Quaternion();
	rotation = new THREE.Quaternion();

	snapTo(position: THREE.Vector3, rotation: THREE.Quaternion): void {
		this.position.copy(position);
		this.prevPosition.copy(position);
		this.rotation.copy(rotation);
		this.prevRotation.copy(rotation);
	}
}

/** A drivable car: physics body + data config + visual + current inputs. */
export class VehicleComponent {
	input: DriveInput = neutralDriveInput();
	constructor(
		public vehicle: RaycastVehicle,
		public config: VehicleConfig,
		/** Resolved paint — the HUD dots this car with it. */
		public colors: VehicleColors,
		public mesh: VehicleMesh,
	) {}
}

/** Tag: this vehicle reads the local player's input devices. */
export class PlayerControlled {}

/** AI driver brain state. */
export class AIControlled {
	/** Smoothed inputs modelling reaction time. */
	smoothedSteer = 0;
	smoothedThrottle = 0;
	/** Current mistake state: >0 means off-line until the timer expires. */
	mistakeTimer = 0;
	mistakeOffset = 0;
	constructor(
		public profile: AIProfile,
		public driverName: string,
		public rng: Rng,
	) {}
}

/** Per-racer progress/timing — the race system owns the semantics. */
export class RacerState {
	nearestSample = 0;
	/** Monotonic total progress in samples (laps roll it forward). */
	totalProgress = 0;
	lap = 0;
	nextCheckpoint = 0;
	lapStartSim = 0;
	bestLapMs: number | null = null;
	lapTimesMs: number[] = [];
	finished = false;
	finishSimTime: number | null = null;
	wrongWayTime = 0;
	position = 1;
	constructor(
		public displayName: string,
		public isPlayer: boolean,
	) {}
}
