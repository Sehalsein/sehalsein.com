/** Everything the game can be told to do, independent of how it was pressed. */
const BINDINGS = {
	forward: ["KeyW", "ArrowUp"],
	back: ["KeyS", "ArrowDown"],
	turnLeft: ["ArrowLeft"],
	turnRight: ["ArrowRight"],
	strafeLeft: ["KeyA", "KeyQ"],
	strafeRight: ["KeyD", "KeyE"],
	run: ["ShiftLeft", "ShiftRight"],
	fire: ["ControlLeft", "ControlRight", "KeyF"],
	use: ["Space", "KeyR"],
	automap: ["Tab", "KeyM"],
	pause: ["Escape", "KeyP"],
	weapon1: ["Digit1"],
	weapon2: ["Digit2"],
	weapon3: ["Digit3"],
	weapon4: ["Digit4"],
	nextWeapon: ["BracketRight"],
	prevWeapon: ["BracketLeft"],
	confirm: ["Enter", "NumpadEnter"],
	debug: ["Backquote"],
} as const;

export type Action = keyof typeof BINDINGS;

/** Analogue movement request assembled from keys, mouse and touch. */
export interface MoveInput {
	/** -1 (back) .. 1 (forward) */
	forward: number;
	/** -1 (left) .. 1 (right) */
	strafe: number;
	/** Radians to add to the view angle this step. */
	turn: number;
	run: boolean;
}

const TOUCH_STICK_RADIUS = 54;

/**
 * Keyboard, mouse (pointer-locked or dragged) and touch input.
 *
 * Key edges are latched between fixed steps rather than read live, so a tap
 * that lands between two simulation steps is never dropped. Mouse deltas
 * accumulate and are consumed once per step for the same reason.
 */
export class Input {
	/** True once the pointer is locked — the crosshair-and-mouselook mode. */
	locked = false;
	/** Set when the browser has coarse pointers, i.e. touch controls are live. */
	readonly touch: boolean;

	private host: HTMLElement;
	private down = new Set<string>();
	private pressedSinceStep = new Set<string>();
	private edges = new Set<string>();
	private mouseAccum = 0;
	private pitchAccum = 0;
	private mouseDown = false;
	private dragging = false;
	private lastDragX = 0;
	private lastDragY = 0;
	private detach: (() => void)[] = [];

	/** Touch: left-thumb virtual stick. */
	private stickId: number | null = null;
	private stickOrigin = { x: 0, y: 0 };
	private stickVec = { x: 0, y: 0 };
	/** Touch: right-thumb look drag. */
	private lookId: number | null = null;
	private lookLast = { x: 0, y: 0 };
	private touchFire = false;
	private touchButtons: HTMLElement[] = [];

	constructor(host: HTMLElement) {
		this.host = host;
		this.touch =
			typeof window !== "undefined" &&
			window.matchMedia("(pointer: coarse)").matches;

		const onKeyDown = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			) {
				return;
			}
			if (!e.repeat) this.pressedSinceStep.add(e.code);
			this.down.add(e.code);
			// Tab, space and the arrows would otherwise scroll or blur the game.
			if (
				e.code === "Tab" ||
				e.code === "Space" ||
				e.code.startsWith("Arrow")
			) {
				e.preventDefault();
			}
		};
		const onKeyUp = (e: KeyboardEvent) => this.down.delete(e.code);
		const onBlur = () => {
			this.down.clear();
			this.mouseDown = false;
			this.dragging = false;
		};

		const onMouseDown = (e: MouseEvent) => {
			if (e.button === 0) {
				this.mouseDown = true;
				this.dragging = true;
				this.lastDragX = e.clientX;
				this.lastDragY = e.clientY;
			}
		};
		const onMouseUp = (e: MouseEvent) => {
			if (e.button === 0) {
				this.mouseDown = false;
				this.dragging = false;
			}
		};
		const onMouseMove = (e: MouseEvent) => {
			if (this.locked) {
				this.mouseAccum += e.movementX;
				this.pitchAccum += e.movementY;
			} else if (this.dragging) {
				// Without pointer lock, dragging still turns the view.
				this.mouseAccum += e.clientX - this.lastDragX;
				this.pitchAccum += e.clientY - this.lastDragY;
				this.lastDragX = e.clientX;
				this.lastDragY = e.clientY;
			}
		};
		const onLockChange = () => {
			this.locked = document.pointerLockElement === this.host;
		};
		const onContextMenu = (e: Event) => e.preventDefault();

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("blur", onBlur);
		window.addEventListener("mouseup", onMouseUp);
		window.addEventListener("mousemove", onMouseMove);
		document.addEventListener("pointerlockchange", onLockChange);
		host.addEventListener("mousedown", onMouseDown);
		host.addEventListener("contextmenu", onContextMenu);
		this.detach.push(
			() => window.removeEventListener("keydown", onKeyDown),
			() => window.removeEventListener("keyup", onKeyUp),
			() => window.removeEventListener("blur", onBlur),
			() => window.removeEventListener("mouseup", onMouseUp),
			() => window.removeEventListener("mousemove", onMouseMove),
			() => document.removeEventListener("pointerlockchange", onLockChange),
			() => host.removeEventListener("mousedown", onMouseDown),
			() => host.removeEventListener("contextmenu", onContextMenu),
		);

		if (this.touch) this.attachTouch();
	}

	/** Pointer lock has to be requested from inside a user gesture. */
	requestPointerLock(): void {
		if (this.touch || this.locked) return;
		const request = this.host.requestPointerLock?.bind(this.host);
		if (!request) return;
		// Safari's implementation is promise-based and rejects when the gesture
		// has already been consumed; a failed lock just leaves drag-look active.
		try {
			const result = request() as unknown;
			if (result instanceof Promise) result.catch(() => undefined);
		} catch {
			/* drag-look fallback */
		}
	}

	releasePointerLock(): void {
		if (document.pointerLockElement === this.host) document.exitPointerLock();
	}

	/** Latch key edges for the upcoming fixed step. */
	beginStep(): void {
		this.edges = this.pressedSinceStep;
		this.pressedSinceStep = new Set();
	}

	isDown(action: Action): boolean {
		return BINDINGS[action].some((code) => this.down.has(code));
	}

	justPressed(action: Action): boolean {
		return BINDINGS[action].some((code) => this.edges.has(code));
	}

	/** Any key at all — "press any key to continue" screens. */
	anyKeyPressed(): boolean {
		return this.edges.size > 0;
	}

	get firing(): boolean {
		return this.mouseDown || this.touchFire || this.isDown("fire");
	}

	/** Mouse/touch turn delta in radians, consumed once per step. */
	consumeLook(sensitivity: number): { yaw: number; pitch: number } {
		const yaw = this.mouseAccum * sensitivity;
		const pitch = this.pitchAccum * sensitivity;
		this.mouseAccum = 0;
		this.pitchAccum = 0;
		return { yaw, pitch };
	}

	getMoveInput(): MoveInput {
		let forward = (this.isDown("forward") ? 1 : 0) - (this.isDown("back") ? 1 : 0);
		let strafe =
			(this.isDown("strafeRight") ? 1 : 0) - (this.isDown("strafeLeft") ? 1 : 0);
		const turn =
			(this.isDown("turnRight") ? 1 : 0) - (this.isDown("turnLeft") ? 1 : 0);

		if (this.stickId !== null) {
			forward = Math.max(-1, Math.min(1, forward - this.stickVec.y));
			strafe = Math.max(-1, Math.min(1, strafe + this.stickVec.x));
		}

		return {
			forward,
			strafe,
			turn,
			// Touch always runs — nobody wants a run modifier on a phone.
			run: this.isDown("run") || this.stickId !== null,
		};
	}

	/** Screen-space stick state, for drawing the touch overlay. */
	getStick(): { active: boolean; x: number; y: number } {
		return {
			active: this.stickId !== null,
			x: this.stickVec.x,
			y: this.stickVec.y,
		};
	}

	private attachTouch(): void {
		const fire = this.makeTouchButton("fire", "right: 16px; bottom: 96px;");
		const use = this.makeTouchButton("use", "right: 96px; bottom: 34px;");
		const swap = this.makeTouchButton("gun", "right: 16px; bottom: 26px;");

		const press = (el: HTMLElement, onDown: () => void, onUp?: () => void) => {
			const start = (e: TouchEvent) => {
				e.preventDefault();
				e.stopPropagation();
				el.classList.add("dm-touch-btn-on");
				onDown();
			};
			const end = (e: TouchEvent) => {
				e.preventDefault();
				e.stopPropagation();
				el.classList.remove("dm-touch-btn-on");
				onUp?.();
			};
			el.addEventListener("touchstart", start, { passive: false });
			el.addEventListener("touchend", end, { passive: false });
			el.addEventListener("touchcancel", end, { passive: false });
			this.detach.push(
				() => el.removeEventListener("touchstart", start),
				() => el.removeEventListener("touchend", end),
				() => el.removeEventListener("touchcancel", end),
			);
		};

		press(
			fire,
			() => {
				this.touchFire = true;
			},
			() => {
				this.touchFire = false;
			},
		);
		press(use, () => this.pressedSinceStep.add("Space"));
		press(swap, () => this.pressedSinceStep.add("BracketRight"));

		const onStart = (e: TouchEvent) => {
			const rect = this.host.getBoundingClientRect();
			for (const t of Array.from(e.changedTouches)) {
				const left = t.clientX - rect.left < rect.width * 0.45;
				if (left && this.stickId === null) {
					this.stickId = t.identifier;
					this.stickOrigin = { x: t.clientX, y: t.clientY };
					this.stickVec = { x: 0, y: 0 };
				} else if (!left && this.lookId === null) {
					this.lookId = t.identifier;
					this.lookLast = { x: t.clientX, y: t.clientY };
				}
			}
			e.preventDefault();
		};
		const onMove = (e: TouchEvent) => {
			for (const t of Array.from(e.changedTouches)) {
				if (t.identifier === this.stickId) {
					const dx = t.clientX - this.stickOrigin.x;
					const dy = t.clientY - this.stickOrigin.y;
					const len = Math.hypot(dx, dy) || 1;
					const clamped = Math.min(len, TOUCH_STICK_RADIUS) / TOUCH_STICK_RADIUS;
					this.stickVec = { x: (dx / len) * clamped, y: (dy / len) * clamped };
				} else if (t.identifier === this.lookId) {
					this.mouseAccum += t.clientX - this.lookLast.x;
					this.pitchAccum += t.clientY - this.lookLast.y;
					this.lookLast = { x: t.clientX, y: t.clientY };
				}
			}
			e.preventDefault();
		};
		const onEnd = (e: TouchEvent) => {
			for (const t of Array.from(e.changedTouches)) {
				if (t.identifier === this.stickId) {
					this.stickId = null;
					this.stickVec = { x: 0, y: 0 };
				}
				if (t.identifier === this.lookId) this.lookId = null;
			}
			e.preventDefault();
		};

		this.host.addEventListener("touchstart", onStart, { passive: false });
		this.host.addEventListener("touchmove", onMove, { passive: false });
		this.host.addEventListener("touchend", onEnd, { passive: false });
		this.host.addEventListener("touchcancel", onEnd, { passive: false });
		this.detach.push(
			() => this.host.removeEventListener("touchstart", onStart),
			() => this.host.removeEventListener("touchmove", onMove),
			() => this.host.removeEventListener("touchend", onEnd),
			() => this.host.removeEventListener("touchcancel", onEnd),
		);
	}

	private makeTouchButton(label: string, position: string): HTMLElement {
		const el = document.createElement("button");
		el.type = "button";
		el.className = "dm-touch-btn";
		el.setAttribute("aria-label", label);
		el.textContent = label;
		el.setAttribute("style", position);
		this.host.appendChild(el);
		this.touchButtons.push(el);
		return el;
	}

	dispose(): void {
		for (const fn of this.detach) fn();
		this.detach = [];
		for (const el of this.touchButtons) el.remove();
		this.touchButtons = [];
		this.down.clear();
		this.releasePointerLock();
	}
}
