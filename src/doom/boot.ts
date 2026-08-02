import type { DoomGame } from "./game/DoomGame";

let gamePromise: Promise<DoomGame> | null = null;

/**
 * Client-only entry, mirroring the playground's boot contract: the React host
 * mounts an empty div and we build the canvas against it. Guarded against
 * React strict-mode's mount → unmount → mount cycle so we never end up with two
 * loops racing on the same canvas.
 */
export async function bootDoom(host: HTMLElement): Promise<DoomGame> {
	if (gamePromise) return gamePromise;
	gamePromise = (async () => {
		const canvas = document.createElement("canvas");
		canvas.className = "dm-canvas";
		host.appendChild(canvas);
		const { DoomGame } = await import("./game/DoomGame");
		const game = new DoomGame(host, canvas);
		game.start();
		// Debug handle, and the hook a headless probe drives the game through.
		(window as unknown as { __doom: DoomGame }).__doom = game;
		return game;
	})();
	return gamePromise;
}

export async function disposeDoom(): Promise<void> {
	const pending = gamePromise;
	gamePromise = null;
	if (pending) {
		const game = await pending.catch(() => null);
		game?.dispose();
	}
}
