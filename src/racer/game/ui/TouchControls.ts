import type { Input } from "../../engine/input/Input";

interface PadSpec {
	/** Key in the touch drive-input state, or a one-shot action. */
	el: string;
	label: string;
	className: string;
	onDown: (input: Input) => void;
	onUp: (input: Input) => void;
}

const PADS: PadSpec[] = [
	{
		el: "left",
		label: "◀",
		className: "rg-touch-steer",
		onDown: (i) => (i.touch.steer = -1),
		onUp: (i) => (i.touch.steer = i.touch.steer < 0 ? 0 : i.touch.steer),
	},
	{
		el: "right",
		label: "▶",
		className: "rg-touch-steer",
		onDown: (i) => (i.touch.steer = 1),
		onUp: (i) => (i.touch.steer = i.touch.steer > 0 ? 0 : i.touch.steer),
	},
	{
		el: "brake",
		label: "BRAKE",
		className: "rg-touch-brake",
		onDown: (i) => (i.touch.brake = 1),
		onUp: (i) => (i.touch.brake = 0),
	},
	{
		el: "throttle",
		label: "GO",
		className: "rg-touch-throttle",
		onDown: (i) => (i.touch.throttle = 1),
		onUp: (i) => (i.touch.throttle = 0),
	},
	{
		el: "drift",
		label: "DRIFT",
		className: "rg-touch-drift",
		onDown: (i) => (i.touch.handbrake = true),
		onUp: (i) => (i.touch.handbrake = false),
	},
	{
		el: "boost",
		label: "BOOST",
		className: "rg-touch-boost",
		onDown: (i) => (i.touch.boost = true),
		onUp: (i) => (i.touch.boost = false),
	},
];

/**
 * On-screen driving controls for touch devices — steering pads on the left,
 * throttle/brake/drift/boost on the right, plus a respawn tap.
 *
 * The pads mutate `Input.touch`, which the input layer merges with the
 * keyboard and gamepad, so nothing downstream knows touch exists. They stay
 * hidden on pointer devices until an actual touch happens, which covers
 * hybrid laptops without cluttering the mouse experience.
 */
export class TouchControls {
	private root: HTMLElement;
	private enabled = false;
	private detach: (() => void)[] = [];

	constructor(
		host: HTMLElement,
		private input: Input,
		/** Fired once, when the pads first become visible. */
		private onEnable: () => void = () => {},
	) {
		this.root = document.createElement("div");
		this.root.className = "rg-touch";
		this.root.hidden = true;
		this.root.innerHTML = `
			<div class="rg-touch-left">
				${PADS.filter((p) => p.className === "rg-touch-steer").map(pad).join("")}
			</div>
			<div class="rg-touch-right">
				<div class="rg-touch-row">
					${PADS.filter((p) => p.el === "drift" || p.el === "boost").map(pad).join("")}
				</div>
				<div class="rg-touch-row">
					${PADS.filter((p) => p.el === "brake" || p.el === "throttle").map(pad).join("")}
				</div>
			</div>
			<button class="rg-touch-reset" data-touch="reset" type="button" aria-label="Respawn">↺</button>
		`;
		host.appendChild(this.root);

		for (const spec of PADS) {
			const button = this.root.querySelector<HTMLElement>(`[data-touch="${spec.el}"]`);
			if (button) this.bindHold(button, spec);
		}
		const reset = this.root.querySelector<HTMLElement>('[data-touch="reset"]');
		reset?.addEventListener("click", () => this.input.press("reset"));

		// hybrid devices: reveal the pads the first time someone actually taps
		if (matchesCoarsePointer()) {
			this.enable();
		} else {
			const onFirstTouch = () => this.enable();
			window.addEventListener("touchstart", onFirstTouch, { once: true, passive: true });
			this.detach.push(() => window.removeEventListener("touchstart", onFirstTouch));
		}
	}

	/** True once the pads are visible — the HUD uses it to swap its hint text. */
	get isEnabled(): boolean {
		return this.enabled;
	}

	private enable(): void {
		if (this.enabled) return;
		this.enabled = true;
		this.root.hidden = false;
		this.onEnable();
	}

	/**
	 * Hold-to-press with pointer capture, so a finger that slides off the pad
	 * still releases it (otherwise the throttle sticks on).
	 */
	private bindHold(element: HTMLElement, spec: PadSpec): void {
		const release = (event: PointerEvent) => {
			if (!element.hasAttribute("data-active")) return;
			element.removeAttribute("data-active");
			spec.onUp(this.input);
			if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
		};
		const press = (event: PointerEvent) => {
			event.preventDefault();
			element.setAttribute("data-active", "");
			element.setPointerCapture(event.pointerId);
			spec.onDown(this.input);
		};
		element.addEventListener("pointerdown", press);
		element.addEventListener("pointerup", release);
		element.addEventListener("pointercancel", release);
		this.detach.push(() => {
			element.removeEventListener("pointerdown", press);
			element.removeEventListener("pointerup", release);
			element.removeEventListener("pointercancel", release);
		});
	}

	/** Drop every held pad — used when the race pauses or a menu opens. */
	releaseAll(): void {
		for (const spec of PADS) {
			const element = this.root.querySelector<HTMLElement>(`[data-touch="${spec.el}"][data-active]`);
			if (!element) continue;
			element.removeAttribute("data-active");
			spec.onUp(this.input);
		}
	}

	show(): void {
		if (this.enabled) this.root.hidden = false;
	}

	hide(): void {
		this.root.hidden = true;
		this.releaseAll();
	}

	dispose(): void {
		for (const fn of this.detach) fn();
		this.detach = [];
		this.root.remove();
	}
}

function pad(spec: PadSpec): string {
	return `<button type="button" class="rg-touch-pad ${spec.className}" data-touch="${spec.el}">${spec.label}</button>`;
}

function matchesCoarsePointer(): boolean {
	return typeof matchMedia === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches;
}
