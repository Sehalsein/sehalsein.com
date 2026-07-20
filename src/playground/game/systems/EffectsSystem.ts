import * as THREE from "three";
import type { Engine } from "../../engine/Engine";
import type { System } from "../../engine/ecs/System";
import { clamp01, smoothstep } from "../../shared/math";
import { PlayerControlled, VehicleComponent } from "../components";

const STREAK_COUNT = 40;
const PUFF_COUNT = 48;
/** Streaks live in a halo around the car, not across the whole screen —
 * full-screen lines read as weather; a near-field halo reads as airflow. */
const STREAK_RANGE = 30;

interface Streak {
	position: THREE.Vector3;
	/** Per-streak variance so the field doesn't look stamped. */
	lengthScale: number;
	thickness: number;
	brightness: number;
}

interface Puff {
	position: THREE.Vector3;
	velocity: THREE.Vector3;
	age: number;
	life: number;
}

/**
 * Sense-of-speed effects, all pooled and allocation-free per frame:
 *
 * - Wind streaks: additive-blended lines in a halo around the player,
 *   stretched along travel, brightness fading with distance from the car.
 *   They appear above ~60 km/h and intensify inside a slipstream.
 * - Drift dust: soft puffs kicked up at the rear wheels while sliding.
 */
export class EffectsSystem implements System {
	readonly name = "effects";

	private streakMesh!: THREE.InstancedMesh;
	private streakMat!: THREE.MeshBasicMaterial;
	private streaks: Streak[] = [];

	private puffMesh!: THREE.InstancedMesh;
	private puffs: Puff[] = [];
	private nextPuff = 0;

	private static tmp = {
		matrix: new THREE.Matrix4(),
		quat: new THREE.Quaternion(),
		scale: new THREE.Vector3(),
		dir: new THREE.Vector3(),
		vec: new THREE.Vector3(),
		color: new THREE.Color(),
		zAxis: new THREE.Vector3(0, 0, 1),
	};

	init(engine: Engine): void {
		const streakGeo = new THREE.BoxGeometry(1, 1, 1);
		this.streakMat = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		});
		this.streakMesh = new THREE.InstancedMesh(streakGeo, this.streakMat, STREAK_COUNT);
		this.streakMesh.frustumCulled = false;
		// instanceColor drives per-streak brightness (additive: darker = fainter)
		this.streakMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(STREAK_COUNT * 3), 3);
		engine.renderer.scene.add(this.streakMesh);
		for (let i = 0; i < STREAK_COUNT; i++) {
			this.streaks.push({
				position: new THREE.Vector3(0, -100, 0),
				lengthScale: 0.65 + Math.random() * 0.8,
				thickness: 0.03 + Math.random() * 0.05,
				brightness: 0,
			});
		}

		const puffGeo = new THREE.IcosahedronGeometry(0.32, 0);
		const puffMat = new THREE.MeshBasicMaterial({
			color: 0xd8d4c8,
			transparent: true,
			opacity: 0.5,
			depthWrite: false,
		});
		this.puffMesh = new THREE.InstancedMesh(puffGeo, puffMat, PUFF_COUNT);
		this.puffMesh.frustumCulled = false;
		engine.renderer.scene.add(this.puffMesh);
		for (let i = 0; i < PUFF_COUNT; i++) {
			this.puffs.push({ position: new THREE.Vector3(0, -100, 0), velocity: new THREE.Vector3(), age: 1, life: 1 });
		}
	}

	fixedUpdate(engine: Engine, dt: number): void {
		// spawn drift dust in the fixed step (timing tied to the sim, not fps)
		for (const id of engine.world.query(PlayerControlled, VehicleComponent)) {
			const vehicle = engine.world.require(id, VehicleComponent).vehicle;
			if (vehicle.driftAmount < 0.4 || vehicle.groundedWheels < 2) continue;
			// rear wheels are indices 2 and 3
			for (const wheelIndex of [2, 3]) {
				const wheel = vehicle.wheels[wheelIndex];
				if (!wheel.grounded || wheel.slip < 0.3) continue;
				const puff = this.puffs[this.nextPuff];
				this.nextPuff = (this.nextPuff + 1) % PUFF_COUNT;
				puff.position.copy(wheel.worldCenter);
				puff.velocity.set((Math.random() - 0.5) * 1.4, 1.6 + Math.random(), (Math.random() - 0.5) * 1.4);
				puff.age = 0;
				puff.life = 0.55 + Math.random() * 0.25;
			}
		}
		for (const puff of this.puffs) {
			if (puff.age >= puff.life) continue;
			puff.age += dt;
			puff.position.addScaledVector(puff.velocity, dt);
		}
	}

	update(engine: Engine): void {
		const tmp = EffectsSystem.tmp;

		let player: VehicleComponent | null = null;
		for (const id of engine.world.query(PlayerControlled, VehicleComponent)) {
			player = engine.world.require(id, VehicleComponent);
		}

		// --- wind streaks ---
		if (player) {
			const vehicle = player.vehicle;
			const speed = vehicle.speed;
			const linvel = vehicle.body.linvel();
			const translation = vehicle.body.translation();
			// visible above ~60 km/h; the slipstream makes the air "thicker"
			this.streakMat.opacity = smoothstep(16, 30, speed) * (0.5 + vehicle.slipstream * 0.35);

			if (speed > 4) {
				tmp.dir.set(linvel.x, linvel.y, linvel.z).normalize();
				tmp.quat.setFromUnitVectors(tmp.zAxis, tmp.dir);
				const baseLength = Math.min(2.5 + speed * 0.3, 14);

				for (let i = 0; i < STREAK_COUNT; i++) {
					const streak = this.streaks[i];
					const pos = streak.position;
					tmp.vec.set(pos.x - translation.x, pos.y - translation.y, pos.z - translation.z);
					const along = tmp.vec.dot(tmp.dir);
					const distSq = tmp.vec.lengthSq();
					// respawn once passed or drifted out of the halo
					if (along < -12 || distSq > STREAK_RANGE * STREAK_RANGE) {
						const ahead = 8 + Math.random() * (STREAK_RANGE - 10);
						const side = (Math.random() - 0.5) * 2;
						pos.set(
							translation.x + tmp.dir.x * ahead - tmp.dir.z * side * 16,
							translation.y + 0.3 + Math.random() * 3.6,
							translation.z + tmp.dir.z * ahead + tmp.dir.x * side * 16,
						);
						streak.brightness = 0.35 + Math.random() * 0.65;
					}
					// fade with distance from the car so the halo has a soft edge
					const falloff = clamp01(1 - Math.sqrt(distSq) / STREAK_RANGE);
					tmp.color.setScalar(streak.brightness * (0.3 + falloff * 0.7));
					this.streakMesh.setColorAt(i, tmp.color);
					tmp.scale.set(streak.thickness, streak.thickness, baseLength * streak.lengthScale);
					tmp.matrix.compose(pos, tmp.quat, tmp.scale);
					this.streakMesh.setMatrixAt(i, tmp.matrix);
				}
				this.streakMesh.instanceMatrix.needsUpdate = true;
				if (this.streakMesh.instanceColor) this.streakMesh.instanceColor.needsUpdate = true;
			}
		}

		// --- dust puffs (grow, then shrink out) ---
		tmp.quat.identity();
		for (let i = 0; i < PUFF_COUNT; i++) {
			const puff = this.puffs[i];
			const t = clamp01(puff.age / puff.life);
			const size = t >= 1 ? 0 : (0.5 + t * 2.2) * Math.sin(Math.min(t, 0.999) * Math.PI);
			tmp.scale.setScalar(Math.max(size, 0.0001));
			tmp.matrix.compose(puff.position, tmp.quat, tmp.scale);
			this.puffMesh.setMatrixAt(i, tmp.matrix);
		}
		this.puffMesh.instanceMatrix.needsUpdate = true;
	}

	dispose(engine: Engine): void {
		engine.renderer.scene.remove(this.streakMesh, this.puffMesh);
		this.streakMesh.geometry.dispose();
		this.streakMat.dispose();
		this.puffMesh.geometry.dispose();
		(this.puffMesh.material as THREE.Material).dispose();
	}
}
