import type { RacingGame } from "./game/RacingGame";

let gamePromise: Promise<RacingGame> | null = null;

/**
 * Client-only entry. The React host mounts an empty div; we create the canvas
 * and boot the game against it. Guarded against React strict-mode's
 * mount → unmount → mount cycle.
 */
export async function bootPlayground(host: HTMLElement): Promise<RacingGame> {
	if (gamePromise) return gamePromise;
	gamePromise = (async () => {
		const canvas = document.createElement("canvas");
		canvas.className = "rg-canvas";
		host.appendChild(canvas);
		const { RacingGame } = await import("./game/RacingGame");
		const { parseRunFromLocation } = await import("./game/runUrl");
		// /playground/<seed>?… boots straight into that exact race
		const game = await RacingGame.create(host, canvas, parseRunFromLocation(window.location));
		game.engine.start();
		// dev/debug handle (also used by headless verification probes)
		(window as unknown as { __rg: RacingGame }).__rg = game;
		return game;
	})();
	return gamePromise;
}

export async function disposePlayground(): Promise<void> {
	const pending = gamePromise;
	gamePromise = null;
	if (pending) {
		const game = await pending.catch(() => null);
		game?.dispose();
	}
}
