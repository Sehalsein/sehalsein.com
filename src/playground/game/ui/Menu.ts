import type { BiomeId, TrackDifficulty, TrackStyle } from "../../procedural/types";
import { allVehicles } from "../vehicles/VehicleCatalog";
import { sanitizeSeed } from "../runUrl";
import type { RaceMode } from "../systems/RaceSystem";

export interface RaceSetup {
	mode: RaceMode;
	vehicleId: string;
	biome: BiomeId;
	difficulty: TrackDifficulty;
	style: TrackStyle;
	lengthKm: number;
	seed: string;
	aiCount: number;
}

/** Random human-friendly seed. */
function randomSeed(): string {
	return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Pre-race setup screen: mode, vehicle, and the full track recipe (biome,
 * length, difficulty, style, seed). The chosen seed is displayed prominently
 * because the same recipe always rebuilds the same track.
 */
export class Menu {
	private root: HTMLElement;
	private onStart: (setup: RaceSetup) => void;
	private selectedVehicle = allVehicles()[0].id;

	constructor(host: HTMLElement, onStart: (setup: RaceSetup) => void, prefill: RaceSetup | null = null) {
		this.onStart = onStart;
		this.root = document.createElement("div");
		this.root.className = "rg-menu";

		const vehicleCards = allVehicles()
			.map(
				(v, i) => `
			<button class="rg-vehicle-card ${i === 0 ? "is-selected" : ""}" data-vehicle="${v.id}">
				<span class="rg-vehicle-swatch" style="background:${v.colors.body}"></span>
				<strong>${v.name}</strong>
				<small>${v.description}</small>
				<div class="rg-statbars">
					${statBar("SPD", v.stats.maxSpeed)}
					${statBar("ACC", v.stats.acceleration)}
					${statBar("HDL", v.stats.handling)}
					${statBar("GRP", v.stats.grip)}
				</div>
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
					<label>Length <span data-el="lengthLabel">4.0 km</span>
						<input type="range" min="2" max="8" step="0.5" value="4" data-el="length" />
					</label>
					<label>Seed
						<span class="rg-seed-row">
							<input type="text" data-el="seed" maxlength="24" spellcheck="false" />
							<button type="button" data-el="reroll" title="Random seed">🎲</button>
						</span>
					</label>
				</div>

				<div class="rg-vehicles">${vehicleCards}</div>

				<button class="rg-start" data-el="start">START RACE</button>
			</div>
		`;
		host.appendChild(this.root);

		const el = <T extends HTMLElement>(name: string) =>
			this.root.querySelector(`[data-el="${name}"]`) as T;

		el<HTMLInputElement>("seed").value = prefill?.seed ?? randomSeed();
		if (prefill) {
			el<HTMLSelectElement>("mode").value = prefill.mode;
			el<HTMLSelectElement>("biome").value = prefill.biome;
			el<HTMLSelectElement>("difficulty").value = prefill.difficulty;
			el<HTMLSelectElement>("style").value = prefill.style;
			el<HTMLInputElement>("length").value = String(prefill.lengthKm);
			el("lengthLabel").textContent = `${prefill.lengthKm.toFixed(1)} km`;
			this.selectedVehicle = prefill.vehicleId;
			for (const card of this.root.querySelectorAll("[data-vehicle]")) {
				card.classList.toggle("is-selected", (card as HTMLElement).dataset.vehicle === prefill.vehicleId);
			}
		}
		el<HTMLButtonElement>("reroll").addEventListener("click", () => {
			el<HTMLInputElement>("seed").value = randomSeed();
		});
		el<HTMLInputElement>("length").addEventListener("input", () => {
			el("lengthLabel").textContent = `${Number(el<HTMLInputElement>("length").value).toFixed(1)} km`;
		});
		for (const card of this.root.querySelectorAll<HTMLButtonElement>("[data-vehicle]")) {
			card.addEventListener("click", () => {
				this.selectedVehicle = card.dataset.vehicle as string;
				for (const c of this.root.querySelectorAll("[data-vehicle]")) c.classList.remove("is-selected");
				card.classList.add("is-selected");
			});
		}
		el<HTMLButtonElement>("start").addEventListener("click", () => {
			const seed = sanitizeSeed(el<HTMLInputElement>("seed").value.trim() || randomSeed());
			this.onStart({
				mode: el<HTMLSelectElement>("mode").value as RaceMode,
				vehicleId: this.selectedVehicle,
				biome: el<HTMLSelectElement>("biome").value as BiomeId,
				difficulty: el<HTMLSelectElement>("difficulty").value as TrackDifficulty,
				style: el<HTMLSelectElement>("style").value as TrackStyle,
				lengthKm: Number(el<HTMLInputElement>("length").value),
				seed,
				aiCount: 5,
			});
		});
	}

	show(): void {
		this.root.style.display = "";
	}

	hide(): void {
		this.root.style.display = "none";
	}

	dispose(): void {
		this.root.remove();
	}
}

function statBar(label: string, value: number): string {
	return `<span class="rg-statbar"><em>${label}</em><i><b style="width:${Math.round(value * 100)}%"></b></i></span>`;
}
