/**
 * Boot/dispose for the /me stage.
 *
 * Same contract as `src/racer/boot.ts`: React owns a host <div> and nothing
 * else — the stage creates its own canvas — and a module-level promise makes
 * strict mode's double mount idempotent.
 */

import { MemojiStage } from "./MemojiStage";
import type { PoseId } from "./poses";
import type { MeHandle } from "./types";

let stagePromise: Promise<MemojiStage> | null = null;

export function hasWebGL(): boolean {
	try {
		const canvas = document.createElement("canvas");
		return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
	} catch {
		return false;
	}
}

export async function bootMe(
	host: HTMLElement,
	availablePoses: readonly PoseId[],
): Promise<MemojiStage> {
	if (stagePromise) return stagePromise;

	stagePromise = (async () => {
		const canvas = document.createElement("canvas");
		canvas.className = "me-canvas";
		canvas.setAttribute("aria-hidden", "true");
		host.appendChild(canvas);

		const stage = new MemojiStage({ host, canvas, availablePoses });
		await stage.init(availablePoses);
		stage.start();

		const handle: MeHandle = {
			start: () => stage.start(),
			stop: () => stage.stop(),
			step: (dtMs) => stage.step(dtMs),
			steps: (n, dtMs) => stage.steps(n, dtMs),
			snapshot: () => stage.snapshot(),
			setPointer: (x, y) => stage.setPointer(x, y),
			trigger: (state) => stage.trigger(state),
			setSeed: (seed) => stage.setSeed(seed),
		};
		window.__me = handle;

		return stage;
	})();

	return stagePromise;
}

export async function disposeMe(): Promise<void> {
	const pending = stagePromise;
	if (!pending) return;
	stagePromise = null;
	const stage = await pending;
	stage.dispose();
	delete window.__me;
}
