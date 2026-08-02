import { clamp } from "../../shared/math";

/** Normalized driving input — everything a vehicle (human or AI) consumes. */
export interface DriveInput {
	/** -1 (left) .. 1 (right) */
	steer: number;
	/** 0 .. 1 */
	throttle: number;
	/** 0 .. 1 */
	brake: number;
	handbrake: boolean;
	boost: boolean;
}

export function neutralDriveInput(): DriveInput {
	return { steer: 0, throttle: 0, brake: 0, handbrake: false, boost: false };
}

/** Data-driven key bindings (KeyboardEvent.code). */
const BINDINGS = {
	steerLeft: ["KeyA", "ArrowLeft"],
	steerRight: ["KeyD", "ArrowRight"],
	throttle: ["KeyW", "ArrowUp"],
	brake: ["KeyS", "ArrowDown"],
	handbrake: ["Space"],
	boost: ["ShiftLeft", "ShiftRight"],
	reset: ["KeyR"],
	cameraRotateLeft: ["KeyQ"],
	cameraRotateRight: ["KeyE"],
	toggleDebug: ["Backquote"],
	toggleMute: ["KeyM"],
	pause: ["Escape"],
} as const;

export type Action = keyof typeof BINDINGS;

/**
 * Keyboard + gamepad + on-screen touch input. Keys are sampled per fixed step
 * so the simulation sees a consistent snapshot; `justPressed` edges are latched
 * between fixed steps so short taps are never missed at low frame rates.
 */
export class Input {
	private down = new Set<string>();
	private pressedSinceStep = new Set<string>();
	private justPressedCodes = new Set<string>();
	private host: HTMLElement;
	private detach: (() => void)[] = [];
	/** Wheel delta accumulated since last frame (for camera zoom). */
	wheelDelta = 0;
	/**
	 * Live state of the on-screen controls, mutated in place by the touch UI
	 * and merged into `getDriveInput` alongside the physical devices.
	 */
	readonly touch: DriveInput = neutralDriveInput();

	constructor(host: HTMLElement) {
		this.host = host;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			if (!e.repeat) this.pressedSinceStep.add(e.code);
			this.down.add(e.code);
			// keep the page from scrolling under the game
			if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
				e.preventDefault();
			}
		};
		const onKeyUp = (e: KeyboardEvent) => this.down.delete(e.code);
		const onBlur = () => this.down.clear();
		const onWheel = (e: WheelEvent) => {
			this.wheelDelta += e.deltaY;
			e.preventDefault();
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("blur", onBlur);
		host.addEventListener("wheel", onWheel, { passive: false });
		this.detach.push(
			() => window.removeEventListener("keydown", onKeyDown),
			() => window.removeEventListener("keyup", onKeyUp),
			() => window.removeEventListener("blur", onBlur),
			() => host.removeEventListener("wheel", onWheel),
		);
	}

	/** Latch edge state for the upcoming fixed step. */
	beginFixedStep(): void {
		this.justPressedCodes = this.pressedSinceStep;
		this.pressedSinceStep = new Set();
	}

	endFrame(): void {
		this.wheelDelta = 0;
	}

	/** Forget every held key/edge — used when pausing and on teardown. */
	clear(): void {
		this.down.clear();
		this.pressedSinceStep.clear();
		this.justPressedCodes.clear();
		Object.assign(this.touch, neutralDriveInput());
	}

	/** Fire a one-shot action from a virtual control (the touch UI). */
	press(action: Action): void {
		this.pressedSinceStep.add(BINDINGS[action][0]);
	}

	isDown(action: Action): boolean {
		return BINDINGS[action].some((code) => this.down.has(code));
	}

	justPressed(action: Action): boolean {
		return BINDINGS[action].some((code) => this.justPressedCodes.has(code));
	}

	private gamepad(): Gamepad | null {
		if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
		for (const pad of navigator.getGamepads()) {
			if (pad?.connected) return pad;
		}
		return null;
	}

	/** Combined keyboard + gamepad + touch driving input for the player. */
	getDriveInput(): DriveInput {
		let steer = (this.isDown("steerRight") ? 1 : 0) - (this.isDown("steerLeft") ? 1 : 0);
		let throttle = this.isDown("throttle") ? 1 : 0;
		let brake = this.isDown("brake") ? 1 : 0;
		let handbrake = this.isDown("handbrake");
		let boost = this.isDown("boost");

		steer = clamp(steer + this.touch.steer, -1, 1);
		throttle = clamp(throttle + this.touch.throttle, 0, 1);
		brake = clamp(brake + this.touch.brake, 0, 1);
		handbrake = handbrake || this.touch.handbrake;
		boost = boost || this.touch.boost;

		const pad = this.gamepad();
		if (pad) {
			const deadzone = (v: number) => (Math.abs(v) < 0.12 ? 0 : v);
			steer = clamp(steer + deadzone(pad.axes[0] ?? 0), -1, 1);
			// standard mapping: buttons[7] = RT (throttle), buttons[6] = LT (brake)
			throttle = clamp(throttle + (pad.buttons[7]?.value ?? 0), 0, 1);
			brake = clamp(brake + (pad.buttons[6]?.value ?? 0), 0, 1);
			handbrake = handbrake || (pad.buttons[0]?.pressed ?? false);
			boost = boost || (pad.buttons[2]?.pressed ?? false);
		}

		return { steer, throttle, brake, handbrake, boost };
	}

	dispose(): void {
		for (const fn of this.detach) fn();
		this.detach = [];
		this.clear();
	}
}
