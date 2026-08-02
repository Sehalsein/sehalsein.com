import RAPIER from "@dimforge/rapier3d-compat";
import tuning from "../../data/physics/tuning.json";

/** Collision groups — membership << 16 | filter. */
export const GROUP_GROUND = 0x0001;
export const GROUP_VEHICLE = 0x0002;
export const GROUP_BARRIER = 0x0004;

/**
 * Thin ownership wrapper around the Rapier world. Rapier ships as WASM, so
 * `init()` must resolve before anything else touches physics.
 */
export type SurfaceType = keyof typeof tuning.surfaces;

export class PhysicsWorld {
	world!: RAPIER.World;
	private initialized = false;
	/** collider handle → surface type, so wheel rays know what they rolled onto. */
	private surfaceByCollider = new Map<number, SurfaceType>();

	async init(): Promise<void> {
		await RAPIER.init();
		this.world = new RAPIER.World({ x: 0, y: tuning.gravity, z: 0 });
		this.initialized = true;
	}

	step(dt: number): void {
		if (!this.initialized) return;
		this.world.timestep = dt;
		this.world.step();
	}

	/** Static trimesh collider (terrain, road, barriers). Returns for later removal. */
	createStaticTrimesh(
		vertices: Float32Array,
		indices: Uint32Array,
		options: { friction?: number; restitution?: number; groups?: number; surface?: SurfaceType } = {},
	): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
		const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
		const desc = RAPIER.ColliderDesc.trimesh(vertices, indices)
			.setFriction(options.friction ?? 1)
			.setRestitution(options.restitution ?? 0.05);
		if (options.groups !== undefined) desc.setCollisionGroups(options.groups);
		const collider = this.world.createCollider(desc, body);
		if (options.surface) this.surfaceByCollider.set(collider.handle, options.surface);
		return { body, collider };
	}

	surfaceOf(collider: RAPIER.Collider): SurfaceType {
		return this.surfaceByCollider.get(collider.handle) ?? "offroad";
	}

	removeBody(body: RAPIER.RigidBody): void {
		this.world.removeRigidBody(body);
		// prune surface entries for colliders that no longer exist
		for (const handle of [...this.surfaceByCollider.keys()]) {
			if (!this.world.colliders.contains(handle)) this.surfaceByCollider.delete(handle);
		}
	}

	/**
	 * Ray straight down; returns hit ground height or null. Used for spawn
	 * placement and unstuck logic.
	 */
	groundHeight(x: number, z: number, fromY = 500): number | null {
		const ray = new RAPIER.Ray({ x, y: fromY, z }, { x: 0, y: -1, z: 0 });
		const hit = this.world.castRay(ray, 1000, true);
		return hit ? fromY - hit.timeOfImpact : null;
	}

	dispose(): void {
		if (this.initialized) this.world.free();
		this.initialized = false;
	}
}

export { RAPIER };
