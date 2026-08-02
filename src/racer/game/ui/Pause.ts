export interface PauseActions {
	resume: () => void;
	restart: () => void;
	setup: () => void;
	copyLink: () => Promise<boolean>;
}

/**
 * Pause overlay. Distinct from the setup Menu on purpose: pausing freezes the
 * simulation and keeps the current run's shareable URL, while "change setup"
 * is the deliberate exit back to track selection.
 */
export class Pause {
	private root: HTMLElement;
	private copyButton: HTMLButtonElement;
	private copyTimer = 0;

	constructor(host: HTMLElement, actions: PauseActions) {
		this.root = document.createElement("div");
		this.root.className = "rg-pause";
		this.root.hidden = true;
		this.root.innerHTML = `
			<div class="rg-pause-card">
				<h2>Paused</h2>
				<p class="rg-pause-track" data-el="track"></p>
				<div class="rg-pause-actions">
					<button type="button" data-action="resume" class="is-primary">Resume</button>
					<button type="button" data-action="restart">Restart race</button>
					<button type="button" data-action="setup">Change setup</button>
					<button type="button" data-action="copy">Copy run link</button>
				</div>
				<p class="rg-pause-hint">Esc resumes · R respawns on the racing line</p>
			</div>
		`;
		host.appendChild(this.root);

		this.copyButton = this.root.querySelector<HTMLButtonElement>('[data-action="copy"]')!;
		this.root.addEventListener("click", (event) => {
			const action = (event.target as HTMLElement).dataset.action;
			if (action === "resume") actions.resume();
			else if (action === "restart") actions.restart();
			else if (action === "setup") actions.setup();
			else if (action === "copy") void this.copy(actions.copyLink);
		});
	}

	private async copy(copyLink: () => Promise<boolean>): Promise<void> {
		const ok = await copyLink();
		this.copyButton.textContent = ok ? "Link copied" : "Copy failed";
		window.clearTimeout(this.copyTimer);
		this.copyTimer = window.setTimeout(() => {
			this.copyButton.textContent = "Copy run link";
		}, 1600);
	}

	get isVisible(): boolean {
		return !this.root.hidden;
	}

	show(trackLabel: string): void {
		this.root.querySelector<HTMLElement>('[data-el="track"]')!.textContent = trackLabel;
		this.root.hidden = false;
	}

	hide(): void {
		this.root.hidden = true;
	}

	dispose(): void {
		window.clearTimeout(this.copyTimer);
		this.root.remove();
	}
}
