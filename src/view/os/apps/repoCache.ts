import { REPO } from "@/src/data/repoSources";

const TTL_MS = 24 * 60 * 60 * 1000;
const VERSION = "v1";

type CacheEntry<T> = { v: string; value: T; expiresAt: number };

function read<T>(key: string): T | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const entry = JSON.parse(raw) as CacheEntry<T>;
		if (entry.v !== VERSION) {
			localStorage.removeItem(key);
			return null;
		}
		if (entry.expiresAt < Date.now()) {
			localStorage.removeItem(key);
			return null;
		}
		return entry.value;
	} catch {
		return null;
	}
}

function write<T>(key: string, value: T): void {
	if (typeof window === "undefined") return;
	try {
		const entry: CacheEntry<T> = {
			v: VERSION,
			value,
			expiresAt: Date.now() + TTL_MS,
		};
		localStorage.setItem(key, JSON.stringify(entry));
	} catch {
		// quota exceeded — silently ignore
	}
}

export function treeCacheKey(): string {
	return `repo-tree:${REPO.owner}/${REPO.name}@${REPO.branch}`;
}

export function fileCacheKey(path: string): string {
	return `repo-file:${REPO.owner}/${REPO.name}@${REPO.branch}:${path}`;
}

export async function cachedFetchJson<T>(
	key: string,
	url: string,
	signal: AbortSignal,
): Promise<T> {
	const cached = read<T>(key);
	if (cached !== null) return cached;
	const res = await fetch(url, { signal });
	if (!res.ok) throw new Error(`github responded ${res.status}`);
	const data = (await res.json()) as T;
	write(key, data);
	return data;
}

export async function cachedFetchText(
	key: string,
	url: string,
	signal: AbortSignal,
): Promise<string> {
	const cached = read<string>(key);
	if (cached !== null) return cached;
	const res = await fetch(url, { signal });
	if (!res.ok) throw new Error(`github responded ${res.status}`);
	const text = await res.text();
	write(key, text);
	return text;
}
