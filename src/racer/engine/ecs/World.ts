/**
 * Lightweight Entity Component System.
 *
 * Entities are integer ids. Components are plain class instances stored in
 * per-type maps. Systems (see System.ts) query the world each tick. This is
 * deliberately simple — cache-friendly archetype storage can be swapped in
 * behind the same API if entity counts ever demand it.
 */

export type EntityId = number;

// biome-ignore lint/suspicious/noExplicitAny: component constructors are heterogeneous
export type ComponentCtor<T> = new (...args: any[]) => T;

export class World {
	private nextId: EntityId = 1;
	private alive = new Set<EntityId>();
	// biome-ignore lint/suspicious/noExplicitAny: values are typed at the access sites
	private stores = new Map<ComponentCtor<any>, Map<EntityId, any>>();

	create(): EntityId {
		const id = this.nextId++;
		this.alive.add(id);
		return id;
	}

	destroy(id: EntityId): void {
		this.alive.delete(id);
		for (const store of this.stores.values()) store.delete(id);
	}

	isAlive(id: EntityId): boolean {
		return this.alive.has(id);
	}

	add<T extends object>(id: EntityId, component: T): T {
		const ctor = component.constructor as ComponentCtor<T>;
		let store = this.stores.get(ctor);
		if (!store) {
			store = new Map();
			this.stores.set(ctor, store);
		}
		store.set(id, component);
		return component;
	}

	get<T>(id: EntityId, ctor: ComponentCtor<T>): T | undefined {
		return this.stores.get(ctor)?.get(id);
	}

	/** Like get() but throws — for components the caller knows must exist. */
	require<T>(id: EntityId, ctor: ComponentCtor<T>): T {
		const c = this.get(id, ctor);
		if (!c) throw new Error(`Entity ${id} missing required component ${ctor.name}`);
		return c;
	}

	has<T>(id: EntityId, ctor: ComponentCtor<T>): boolean {
		return this.stores.get(ctor)?.has(id) ?? false;
	}

	remove<T>(id: EntityId, ctor: ComponentCtor<T>): void {
		this.stores.get(ctor)?.delete(id);
	}

	/** All entities that have every listed component type. */
	// biome-ignore lint/suspicious/noExplicitAny: variadic component query
	query(...ctors: ComponentCtor<any>[]): EntityId[] {
		if (ctors.length === 0) return [...this.alive];
		// iterate the smallest store for efficiency
		let smallest: Map<EntityId, unknown> | undefined;
		for (const ctor of ctors) {
			const store = this.stores.get(ctor);
			if (!store) return [];
			if (!smallest || store.size < smallest.size) smallest = store;
		}
		const result: EntityId[] = [];
		outer: for (const id of smallest?.keys() ?? []) {
			for (const ctor of ctors) {
				if (!this.stores.get(ctor)?.has(id)) continue outer;
			}
			result.push(id);
		}
		return result;
	}

	clear(): void {
		this.alive.clear();
		this.stores.clear();
		this.nextId = 1;
	}
}
