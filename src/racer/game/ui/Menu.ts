import type { BiomeId, TrackDifficulty, TrackStyle } from "../../procedural/types";
import { allLiveries, allVehicles, getLivery, getVehicle } from "../vehicles/VehicleCatalog";
import { loadRecord, trackKey } from "../records";
import { sanitizeSeed } from "../runUrl";
import type { RaceMode } from "../systems/RaceSystem";
import { VehiclePreview } from "./VehiclePreview";
import settings from "../../data/race/settings.json";

export interface RaceSetup {
	mode: RaceMode;
	vehicleId: string;
	livery: string;
	biome: BiomeId;
	difficulty: TrackDifficulty;
	style: TrackStyle;
	lengthKm: number;
	seed: string;
	aiCount: number;
}

/** Remembers the last car + paint so returning players skip the fiddling. */
const GARAGE_KEY = "iso-racer:garage:v1";

/** Random human-friendly seed. */
export function randomSeed(): string {
	return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function formatMs(ms: number): string {
	const total = Math.max(0, Math.round(ms));
	const m = Math.floor(total / 60000);
	const s = Math.floor((total % 60000) / 1000);
	return `${m}:${String(s).padStart(2, "0")}.${String(total % 1000).padStart(3, "0")}`;
}

function loadGarage(): { vehicleId?: string; liveries?: Record<string, string> } {
	try {
		return JSON.parse(localStorage.getItem(GARAGE_KEY) ?? "{}");
	} catch {
		return {};
	}
}

function saveGarage(vehicleId: string, liveries: Record<string, string>): void {
	try {
		localStorage.setItem(GARAGE_KEY, JSON.stringify({ vehicleId, liveries }));
	} catch {
		// storage blocked — the choice just doesn't persist
	}
}

/**
 * Pre-race setup screen: the track recipe (biome, length, difficulty, style,
 * seed) plus the garage — car, paint, and a live turntable of exactly what
 * you'll be driving. The seed is displayed prominently because the same
 * recipe always rebuilds the same track, and if that recipe has been raced
 * before, its personal best is shown next to it.
 */
export class Menu {
	private root: HTMLElement;
	private preview = new VehiclePreview();
	private selectedVehicle: string;
	/** Chosen paint per car, so each one keeps its own look. */
	private liveryByVehicle: Record<string, string>;

	constructor(host: HTMLElement, onStart: (setup: RaceSetup) => void, prefill: RaceSetup | null = null) {
		const vehicles = allVehicles();
		const garage = loadGarage();
		this.liveryByVehicle = { ...garage.liveries };
		this.selectedVehicle =
			prefill?.vehicleId ??
			(vehicles.some((v) => v.id === garage.vehicleId) ? (garage.vehicleId as string) : vehicles[0].id);
		if (prefill) this.liveryByVehicle[prefill.vehicleId] = prefill.livery;

		this.root = document.createElement("div");
		this.root.className = "rg-menu";

		const vehicleCards = vehicles
			.map(
				(v) => `
			<button type="button" class="rg-vehicle-card" data-vehicle="${v.id}">
				<strong>${v.name}</strong>
				<div class="rg-statbars">
					${statBar("SPD", v.stats.maxSpeed)}
					${statBar("ACC", v.stats.acceleration)}
					${statBar("HDL", v.stats.handling)}
					${statBar("GRP", v.stats.grip)}
				</div>
			</button>`,
			)
			.join("");

		const liverySwatches = allLiveries()
			.map(
				(l) =>
					`<button type="button" class="rg-livery" data-livery="${l.id}" title="${l.name}" aria-label="${l.name}">
						<span style="background:${l.body}"></span><i style="background:${l.accent}"></i>
					</button>`,
			)
			.join("");

		this.root.innerHTML = `
			<div class="rg-menu-card">
				<h1>ISO RACER</h1>
				<p class="rg-menu-sub">procedural circuits · deterministic seeds</p>

				<div class="rg-field-row">
					<label>Mode
						<select data-el="mode">
							<option value="race" selected>Race</option>
							<option value="timetrial">Time Trial</option>
							<option value="practice">Practice</option>
						</select>
					</label>
					<label>Biome
						<select data-el="biome">
							<option value="forest" selected>Forest</option>
							<option value="desert">Desert</option>
							<option value="snow">Snow</option>
						</select>
					</label>
					<label>Difficulty
						<select data-el="difficulty">
							<option value="easy">Easy</option>
							<option value="medium" selected>Medium</option>
							<option value="hard">Hard</option>
						</select>
					</label>
					<label>Style
						<select data-el="style">
							<option value="fast">Fast</option>
							<option value="balanced" selected>Balanced</option>
							<option value="technical">Technical</option>
						</select>
					</label>
				</div>

				<div class="rg-field-row">
					<label>Length <span data-el="lengthLabel">1.0 km</span>
						<input type="range" min="1" max="4" step="0.5" value="1" data-el="length" />
					</label>
					<label data-el="opponentsField">Opponents <span data-el="aiLabel">5</span>
						<input type="range" min="0" max="7" step="1" value="5" data-el="ai" />
					</label>
					<label>Seed
						<span class="rg-seed-row">
							<input type="text" data-el="seed" maxlength="24" spellcheck="false" />
							<button type="button" data-el="reroll" title="Random seed">🎲</button>
						</span>
					</label>
				</div>

				<p class="rg-menu-record" data-el="record"></p>

				<div class="rg-garage">
					<div class="rg-preview" data-el="preview">
						<div class="rg-preview-caption">
							<strong data-el="vehicleName"></strong>
							<small data-el="vehicleDesc"></small>
						</div>
					</div>
					<div class="rg-garage-side">
						<div class="rg-vehicles">${vehicleCards}</div>
						<div class="rg-liveries" data-el="liveries">${liverySwatches}</div>
					</div>
				</div>

				<button class="rg-start" data-el="start">START RACE</button>
			</div>
		`;
		host.appendChild(this.root);

		const el = <T extends HTMLElement>(name: string) => this.root.querySelector(`[data-el="${name}"]`) as T;
		el("preview").prepend(this.preview.canvas);

		el<HTMLInputElement>("seed").value = prefill?.seed ?? randomSeed();
		if (prefill) {
			el<HTMLSelectElement>("mode").value = prefill.mode;
			el<HTMLSelectElement>("biome").value = prefill.biome;
			el<HTMLSelectElement>("difficulty").value = prefill.difficulty;
			el<HTMLSelectElement>("style").value = prefill.style;
			el<HTMLInputElement>("length").value = String(prefill.lengthKm);
			el("lengthLabel").textContent = `${prefill.lengthKm.toFixed(1)} km`;
			el<HTMLInputElement>("ai").value = String(prefill.aiCount);
			el("aiLabel").textContent = String(prefill.aiCount);
		}

		// solo modes have no field to size — hide the control rather than lie
		const syncMode = () => {
			el("opponentsField").hidden = !settings.modes[el<HTMLSelectElement>("mode").value as RaceMode].ai;
		};
		el<HTMLSelectElement>("mode").addEventListener("change", syncMode);
		syncMode();

		const syncRecord = () => {
			const record = loadRecord(trackKey(this.readSetup(el)));
			const label = el("record");
			label.textContent =
				record?.bestLapMs != null ? `personal best on this track · ${formatMs(record.bestLapMs)}` : "";
			label.hidden = record?.bestLapMs == null;
		};

		const syncGarage = () => {
			const config = getVehicle(this.selectedVehicle);
			const livery = getLivery(this.liveryByVehicle[config.id], config);
			this.liveryByVehicle[config.id] = livery.id;
			el("vehicleName").textContent = config.name;
			el("vehicleDesc").textContent = config.description;
			for (const card of this.root.querySelectorAll<HTMLElement>("[data-vehicle]")) {
				card.classList.toggle("is-selected", card.dataset.vehicle === config.id);
			}
			for (const swatch of this.root.querySelectorAll<HTMLElement>("[data-livery]")) {
				swatch.classList.toggle("is-selected", swatch.dataset.livery === livery.id);
			}
			this.preview.show(config, livery);
			saveGarage(config.id, this.liveryByVehicle);
		};

		el<HTMLButtonElement>("reroll").addEventListener("click", () => {
			el<HTMLInputElement>("seed").value = randomSeed();
			syncRecord();
		});
		el<HTMLInputElement>("length").addEventListener("input", () => {
			el("lengthLabel").textContent = `${Number(el<HTMLInputElement>("length").value).toFixed(1)} km`;
			syncRecord();
		});
		el<HTMLInputElement>("ai").addEventListener("input", () => {
			el("aiLabel").textContent = el<HTMLInputElement>("ai").value;
		});
		for (const name of ["seed", "biome", "difficulty", "style"]) {
			el(name).addEventListener("change", syncRecord);
			el(name).addEventListener("input", syncRecord);
		}

		for (const card of this.root.querySelectorAll<HTMLButtonElement>("[data-vehicle]")) {
			card.addEventListener("click", () => {
				this.selectedVehicle = card.dataset.vehicle as string;
				syncGarage();
			});
		}
		for (const swatch of this.root.querySelectorAll<HTMLButtonElement>("[data-livery]")) {
			swatch.addEventListener("click", () => {
				this.liveryByVehicle[this.selectedVehicle] = swatch.dataset.livery as string;
				syncGarage();
			});
		}

		el<HTMLButtonElement>("start").addEventListener("click", () => {
			const setup = this.readSetup(el);
			el<HTMLInputElement>("seed").value = setup.seed;
			onStart(setup);
		});

		syncRecord();
		syncGarage();
		this.preview.start();
	}

	private readSetup(el: <T extends HTMLElement>(name: string) => T): RaceSetup {
		const config = getVehicle(this.selectedVehicle);
		return {
			mode: el<HTMLSelectElement>("mode").value as RaceMode,
			vehicleId: config.id,
			livery: getLivery(this.liveryByVehicle[config.id], config).id,
			biome: el<HTMLSelectElement>("biome").value as BiomeId,
			difficulty: el<HTMLSelectElement>("difficulty").value as TrackDifficulty,
			style: el<HTMLSelectElement>("style").value as TrackStyle,
			lengthKm: Number(el<HTMLInputElement>("length").value),
			seed: sanitizeSeed(el<HTMLInputElement>("seed").value.trim() || randomSeed()),
			aiCount: Number(el<HTMLInputElement>("ai").value),
		};
	}

	get isVisible(): boolean {
		return this.root.style.display !== "none";
	}

	show(): void {
		this.root.style.display = "";
		this.preview.start();
	}

	hide(): void {
		this.root.style.display = "none";
		// the turntable is pure decoration — never let it cost frames mid-race
		this.preview.stop();
	}

	dispose(): void {
		this.preview.dispose();
		this.root.remove();
	}
}

function statBar(label: string, value: number): string {
	return `<span class="rg-statbar"><em>${label}</em><i><b style="width:${Math.round(value * 100)}%"></b></i></span>`;
}
