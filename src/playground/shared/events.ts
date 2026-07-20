/** Minimal typed event bus — modules communicate through this instead of direct references. */

// biome-ignore lint/suspicious/noExplicitAny: event maps are heterogeneous by design
type EventMap = Record<string, any>;

export class EventBus<E extends EventMap> {
	private listeners = new Map<keyof E, Set<(payload: never) => void>>();

	on<K extends keyof E>(event: K, handler: (payload: E[K]) => void): () => void {
		let set = this.listeners.get(event);
		if (!set) {
			set = new Set();
			this.listeners.set(event, set);
		}
		set.add(handler as (payload: never) => void);
		return () => this.off(event, handler);
	}

	off<K extends keyof E>(event: K, handler: (payload: E[K]) => void): void {
		this.listeners.get(event)?.delete(handler as (payload: never) => void);
	}

	emit<K extends keyof E>(event: K, payload: E[K]): void {
		const set = this.listeners.get(event);
		if (!set) return;
		for (const handler of set) (handler as (payload: E[K]) => void)(payload);
	}

	clear(): void {
		this.listeners.clear();
	}
}
