import type { Engine } from "../../engine/Engine";
import type { System } from "../../engine/ecs/System";
import type { StandingEntry } from "../../shared/gameEvents";
import type { TrackData } from "../../procedural/types";
import { PlayerControlled, RacerState, VehicleComponent } from "../components";
import type { TrackRecord } from "../records";
import type { RaceSystem } from "../systems/RaceSystem";

export type ResultsAction = "again" | "newTrack" | "copy" | "menu";

function formatMs(ms: number | null): string {
	if (ms === null || !Number.isFinite(ms)) return "--:--.---";
	const total = Math.max(0, Math.round(ms));
	const m = Math.floor(total / 60000);
	const s = Math.floor((total % 60000) / 1000);
	const t = total % 1000;
	return `${m}:${String(s).padStart(2, "0")}.${String(t).padStart(3, "0")}`;
}

/** Signed lap delta against the personal best, e.g. "-0.412". */
function formatDelta(ms: number): string {
	return `${ms <= 0 ? "-" : "+"}${(Math.abs(ms) / 1000).toFixed(3)}`;
}

function formatGap(meters: number): string {
	if (Math.abs(meters) < 1) return "—";
	const sign = meters > 0 ? "+" : "−";
	const abs = Math.abs(meters);
	return abs >= 1000 ? `${sign}${(abs / 1000).toFixed(1)}km` : `${sign}${Math.round(abs)}m`;
}

/** Driver names and colours are data-driven, so escape before templating. */
function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"']/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
	);
}

/**
 * DOM-based race HUD: speed, boost, lap/position, timing against the personal
 * best, live standings with gaps, minimap with car dots, countdown, wrong-way
 * warning and the results board. Pure DOM + one 2D canvas — nothing here
 * touches the 3D scene.
 */
export class HUD implements System {
	readonly name = "hud";
	private root: HTMLElement;
	private els!: Record<string, HTMLElement>;
	private minimapCanvas!: HTMLCanvasElement;
	private track: TrackData | null = null;
	private standings: StandingEntry[] = [];
	private record: TrackRecord | null = null;
	private unsubscribe: (() => void)[] = [];
	private frame = 0;
	/** Seconds of life left on the lap-time flash. */
	private flashTimer = 0;

	constructor(
		host: HTMLElement,
		private race: RaceSystem,
	) {
		this.root = document.createElement("div");
		this.root.className = "rg-hud";
		this.root.innerHTML = `
			<div class="rg-hud-top">
				<div class="rg-panel rg-race-info">
					<div class="rg-track-name" data-el="trackName"></div>
					<div class="rg-lap" data-el="lap"></div>
					<div class="rg-pos" data-el="position"></div>
				</div>
				<div class="rg-panel rg-times">
					<div data-el="lapTime"></div>
					<div class="rg-best" data-el="bestTime"></div>
					<div class="rg-pb" data-el="pb"></div>
				</div>
				<div class="rg-hud-right">
					<canvas class="rg-minimap" width="180" height="180"></canvas>
					<div class="rg-panel rg-standings" data-el="standings"></div>
				</div>
			</div>
			<div class="rg-countdown" data-el="countdown"></div>
			<div class="rg-wrongway" data-el="wrongway">WRONG WAY</div>
			<div class="rg-flash" data-el="flash"></div>
			<div class="rg-hud-bottom">
				<div class="rg-panel rg-speed"><span data-el="speed">0</span><small> km/h</small></div>
				<div class="rg-boost"><div class="rg-boost-fill" data-el="boost"></div></div>
				<div class="rg-tags">
					<span class="rg-tag rg-slip" data-el="slip">SLIPSTREAM</span>
					<span class="rg-tag rg-drift" data-el="drift">DRIFT +BOOST</span>
				</div>
			</div>
			<div class="rg-results" data-el="results"></div>
			<div class="rg-hint" data-el="hint">WASD drive · Space handbrake · Shift boost · R reset · Esc pause · Q/E rotate · scroll zoom</div>
		`;
		host.appendChild(this.root);
		this.els = {};
		for (const el of this.root.querySelectorAll<HTMLElement>("[data-el]")) {
			this.els[el.dataset.el as string] = el;
		}
		this.minimapCanvas = this.root.querySelector(".rg-minimap") as HTMLCanvasElement;
		this.hide();
	}

	setTrack(track: TrackData, record: TrackRecord | null): void {
		this.track = track;
		this.record = record;
		this.standings = [];
		this.els.trackName.textContent = `${track.name} · ${(track.length / 1000).toFixed(1)}km · seed ${track.params.seed}`;
		this.els.standings.innerHTML = "";
		this.els.results.classList.remove("is-visible");
		this.els.flash.classList.remove("is-visible");
		this.flashTimer = 0;
		this.updatePersonalBestLabel();
	}

	/** Swap the keyboard legend for the touch legend once the pads appear. */
	useTouchHint(): void {
		this.els.hint.textContent = "hold GO · DRIFT to slide · BOOST spends charge · ↺ respawns";
	}

	show(): void {
		this.root.style.display = "";
	}

	hide(): void {
		this.root.style.display = "none";
	}

	init(engine: Engine): void {
		this.unsubscribe.push(
			engine.events.on("race:countdown", ({ value }) => {
				const el = this.els.countdown;
				el.textContent = value === 0 ? "GO!" : String(value);
				el.classList.remove("is-pop");
				void el.offsetWidth; // restart the pop animation
				el.classList.add("is-pop");
				if (value === 0) setTimeout(() => (el.textContent = ""), 900);
			}),
			engine.events.on("race:wrongWay", ({ wrongWay }) => {
				this.els.wrongway.classList.toggle("is-visible", wrongWay);
			}),
			engine.events.on("race:standings", ({ standings }) => {
				this.standings = standings;
			}),
			engine.events.on("race:lap", ({ lapTimeMs, isPlayer }) => {
				if (isPlayer) this.onPlayerLap(lapTimeMs);
			}),
		);
	}

	/** Show each completed lap against the stored personal best. */
	private onPlayerLap(lapTimeMs: number): void {
		const pb = this.record?.bestLapMs ?? null;
		if (pb === null || lapTimeMs < pb) {
			this.flash(`PERSONAL BEST · ${formatMs(lapTimeMs)}`, "is-good");
			this.record = {
				bestTotalMs: this.record?.bestTotalMs ?? null,
				bestPosition: this.record?.bestPosition ?? null,
				bestLapMs: lapTimeMs,
			};
			this.updatePersonalBestLabel();
		} else {
			this.flash(`${formatMs(lapTimeMs)} · ${formatDelta(lapTimeMs - pb)}`, "");
		}
	}

	private flash(text: string, modifier: string): void {
		const el = this.els.flash;
		el.textContent = text;
		el.className = `rg-flash is-visible ${modifier}`;
		this.flashTimer = 2.4;
	}

	private updatePersonalBestLabel(): void {
		const pb = this.record?.bestLapMs ?? null;
		this.els.pb.textContent = pb === null ? "pb --:--.---" : `pb ${formatMs(pb)}`;
		this.els.pb.classList.toggle("is-set", pb !== null);
	}

	showResults(standings: StandingEntry[], record: TrackRecord | null, isNewBest: boolean): void {
		this.record = record;
		this.updatePersonalBestLabel();
		const rows = standings
			.map((entry) => {
				const time = entry.finished ? formatMs(entry.totalMs) : "dnf";
				return `<tr class="${entry.isPlayer ? "is-player" : ""}"><td>${entry.position}</td><td>${escapeHtml(entry.name)}</td><td>${formatMs(entry.bestLapMs)}</td><td>${time}</td></tr>`;
			})
			.join("");
		const player = standings.find((entry) => entry.isPlayer);
		const headline =
			player === undefined
				? "Race complete"
				: standings.length < 2
					? "Run complete"
					: player.position === 1
						? "You win"
						: `Finished P${player.position}`;
		const badge = isNewBest ? `<span class="rg-badge">new personal best</span>` : "";
		this.els.results.innerHTML = `
			<div class="rg-results-card">
				<h2>${headline}${badge}</h2>
				<table><thead><tr><th>#</th><th>Driver</th><th>Best lap</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
				<div class="rg-results-actions">
					<button type="button" data-action="again" class="is-primary">Race again</button>
					<button type="button" data-action="newTrack">New track</button>
					<button type="button" data-action="copy">Copy link</button>
					<button type="button" data-action="menu">Setup</button>
				</div>
			</div>`;
		this.els.results.classList.add("is-visible");
	}

	hideResults(): void {
		this.els.results.classList.remove("is-visible");
	}

	/** The game wires its own handler for the results buttons. */
	onResultsAction(handler: (action: ResultsAction) => void): void {
		this.els.results.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;
			const action = target.dataset.action as ResultsAction | undefined;
			if (!action) return;
			if (action === "copy") target.textContent = "Copied";
			handler(action);
		});
	}

	update(engine: Engine, dt: number): void {
		const track = this.track;
		if (this.flashTimer > 0) {
			this.flashTimer -= dt;
			if (this.flashTimer <= 0) this.els.flash.classList.remove("is-visible");
		}

		for (const id of engine.world.query(PlayerControlled, VehicleComponent)) {
			const vc = engine.world.require(id, VehicleComponent);
			const racer = engine.world.get(id, RacerState);
			const kmh = Math.round(Math.abs(vc.vehicle.forwardSpeed) * 3.6);
			this.els.speed.textContent = String(kmh);
			this.els.boost.style.width = `${Math.round(vc.vehicle.boostCharge * 100)}%`;
			this.els.boost.classList.toggle("is-active", vc.vehicle.boosting);
			const inSlipstream = vc.vehicle.slipstream > 0.2;
			this.els.slip.classList.toggle("is-visible", inSlipstream);
			this.els.drift.classList.toggle("is-visible", vc.vehicle.driftCharge > 0);
			this.els.boost.parentElement?.classList.toggle("is-slipstream", inSlipstream);

			if (racer && track) {
				const lapLabel =
					this.race.totalLaps > 0
						? `Lap ${Math.max(1, Math.min(racer.lap, this.race.totalLaps))}/${this.race.totalLaps}`
						: `Lap ${Math.max(1, racer.lap)}`;
				this.els.lap.textContent = lapLabel;
				const total = this.standings.length;
				this.els.position.textContent = total > 1 ? `P${racer.position}/${total}` : "";
				const current = this.race.phase === "racing" ? (engine.simTime - racer.lapStartSim) * 1000 : 0;
				this.els.lapTime.textContent = formatMs(racer.lap >= 1 ? current : 0);
				this.els.bestTime.textContent = `best ${formatMs(racer.bestLapMs)}`;
			}
		}

		// minimap and standings are the expensive HUD elements — 15Hz is plenty
		if (this.frame++ % 4 === 0) {
			this.drawMinimap(engine);
			this.drawStandings();
		}
	}

	private drawStandings(): void {
		if (this.standings.length < 2) {
			this.els.standings.hidden = true;
			return;
		}
		this.els.standings.hidden = false;
		const playerProgress = this.standings.find((entry) => entry.isPlayer)?.progressM ?? 0;
		this.els.standings.innerHTML = this.standings
			.map(
				(entry) => `<div class="rg-standing${entry.isPlayer ? " is-player" : ""}">
					<span class="rg-standing-pos">${entry.position}</span>
					<span class="rg-standing-dot" style="background:${escapeHtml(entry.color)}"></span>
					<span class="rg-standing-name">${escapeHtml(entry.name)}</span>
					<span class="rg-standing-gap">${entry.isPlayer ? "" : formatGap(entry.progressM - playerProgress)}</span>
				</div>`,
			)
			.join("");
	}

	private drawMinimap(engine: Engine): void {
		const track = this.track;
		const ctx = this.minimapCanvas.getContext("2d");
		if (!track || !ctx) return;
		const { points, min, max } = track.minimap;
		const w = this.minimapCanvas.width;
		const h = this.minimapCanvas.height;
		ctx.clearRect(0, 0, w, h);
		const pad = 14;
		const scale = Math.min((w - pad * 2) / (max.x - min.x), (h - pad * 2) / (max.y - min.y));
		const ox = (w - (max.x - min.x) * scale) / 2;
		const oy = (h - (max.y - min.y) * scale) / 2;
		const px = (x: number) => ox + (x - min.x) * scale;
		const py = (z: number) => oy + (z - min.y) * scale;

		ctx.beginPath();
		for (let i = 0; i < points.length; i++) {
			const p = points[i];
			if (i === 0) ctx.moveTo(px(p.x), py(p.y));
			else ctx.lineTo(px(p.x), py(p.y));
		}
		ctx.closePath();
		ctx.strokeStyle = "rgba(255,255,255,0.85)";
		ctx.lineWidth = 3;
		ctx.lineJoin = "round";
		ctx.stroke();

		// start line tick
		const start = points[0];
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(px(start.x) - 3, py(start.y) - 3, 6, 6);

		// car dots
		for (const id of engine.world.query(VehicleComponent)) {
			const vc = engine.world.require(id, VehicleComponent);
			const isPlayer = engine.world.has(id, PlayerControlled);
			const pos = vc.vehicle.body.translation();
			ctx.beginPath();
			ctx.arc(px(pos.x), py(pos.z), isPlayer ? 5 : 3.5, 0, Math.PI * 2);
			ctx.fillStyle = isPlayer ? "#ffd84d" : vc.colors.body;
			ctx.fill();
			if (isPlayer) {
				ctx.strokeStyle = "#1c1d21";
				ctx.lineWidth = 1.5;
				ctx.stroke();
			}
		}
	}

	dispose(): void {
		for (const fn of this.unsubscribe) fn();
		this.root.remove();
	}
}
