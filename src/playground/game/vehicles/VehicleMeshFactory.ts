import * as THREE from "three";
import type { VehicleConfig } from "./VehicleCatalog";
import tuning from "../../data/physics/tuning.json";

export interface VehicleMesh {
	root: THREE.Group;
	wheels: THREE.Object3D[];
}

/**
 * Procedural low-poly car: chassis + cabin + bumpers + four wheels, colored
 * from the vehicle's data file. Wheel order matches RaycastVehicle wheel order
 * (FL, FR, RL, RR) so the render system can mirror physics state directly.
 */
export function buildVehicleMesh(config: VehicleConfig): VehicleMesh {
	const root = new THREE.Group();
	const c = tuning.chassis;
	const w = tuning.wheels;

	const bodyMat = new THREE.MeshStandardMaterial({
		color: config.colors.body,
		roughness: 0.55,
		metalness: 0.15,
		flatShading: true,
	});
	const accentMat = new THREE.MeshStandardMaterial({
		color: config.colors.accent,
		roughness: 0.6,
		flatShading: true,
	});
	const cabinMat = new THREE.MeshStandardMaterial({
		color: config.colors.cabin,
		roughness: 0.25,
		metalness: 0.4,
		flatShading: true,
	});
	const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.92, flatShading: true });
	const hubMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.4, flatShading: true });

	// chassis (slightly narrower at top via two stacked boxes)
	const lower = new THREE.Mesh(new THREE.BoxGeometry(c.halfWidth * 2, c.halfHeight * 1.5, c.halfLength * 2), bodyMat);
	lower.position.y = 0;
	lower.castShadow = true;
	root.add(lower);

	const hood = new THREE.Mesh(
		new THREE.BoxGeometry(c.halfWidth * 1.75, c.halfHeight * 0.9, c.halfLength * 0.66),
		bodyMat,
	);
	hood.position.set(0, c.halfHeight * 0.85, c.halfLength * 0.58);
	hood.castShadow = true;
	root.add(hood);

	// cabin
	const cabin = new THREE.Mesh(
		new THREE.BoxGeometry(c.halfWidth * 1.55, c.halfHeight * 1.5, c.halfLength * 0.95),
		cabinMat,
	);
	cabin.position.set(0, c.halfHeight * 1.5, -c.halfLength * 0.12);
	cabin.castShadow = true;
	root.add(cabin);

	// rear spoiler-ish accent block
	const tail = new THREE.Mesh(
		new THREE.BoxGeometry(c.halfWidth * 1.9, c.halfHeight * 0.7, c.halfLength * 0.24),
		accentMat,
	);
	tail.position.set(0, c.halfHeight * 1.1, -c.halfLength * 0.9);
	tail.castShadow = true;
	root.add(tail);

	// front bumper stripe
	const bumper = new THREE.Mesh(
		new THREE.BoxGeometry(c.halfWidth * 1.95, c.halfHeight * 0.5, c.halfLength * 0.14),
		accentMat,
	);
	bumper.position.set(0, -c.halfHeight * 0.2, c.halfLength * 0.98);
	root.add(bumper);

	// wheels — order must match RaycastVehicle: FL, FR, RL, RR
	const radius = tuning.suspension.wheelRadius;
	const wheelGeo = new THREE.CylinderGeometry(radius, radius, 0.3, 12);
	wheelGeo.rotateZ(Math.PI / 2);
	const hubGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.32, 8);
	hubGeo.rotateZ(Math.PI / 2);
	const wheels: THREE.Object3D[] = [];
	const offsets: [number, number][] = [
		[-w.offsetX, w.offsetZFront],
		[w.offsetX, w.offsetZFront],
		[-w.offsetX, w.offsetZRear],
		[w.offsetX, w.offsetZRear],
	];
	for (const [x, z] of offsets) {
		const wheelGroup = new THREE.Group();
		const tire = new THREE.Mesh(wheelGeo, tireMat);
		tire.castShadow = true;
		const hub = new THREE.Mesh(hubGeo, hubMat);
		wheelGroup.add(tire, hub);
		wheelGroup.position.set(x, 0, z);
		root.add(wheelGroup);
		wheels.push(wheelGroup);
	}

	return { root, wheels };
}
