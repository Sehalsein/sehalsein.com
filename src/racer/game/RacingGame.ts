import * as THREE from "three";
import { Engine } from "../engine/Engine";
import type { EntityId } from "../engine/ecs/World";
import { RaycastVehicle } from "../engine/physics/RaycastVehicle";
import { DebugTools } from "../engine/debug/DebugTools";
import { generateTrack } from "../procedural/TrackGenerator";
import type { TrackData } from "../procedural/types";
import type { StandingEntry } from "../shared/gameEvents";
import { Rng } from "../shared/rng";
import {
	AIControlled,
	PlayerControlled,
	RacerState,
	RenderTransform,
	VehicleComponent,
} from "./components";
import { pickFieldProfiles } from "./ai/aiProfiles";
import {
	allVehicles,
	getLivery,
	getVehicle,
	randomLivery,
	type VehicleColors,
	type VehicleConfig,
} from "./vehicles/VehicleCatalog";
import { buildVehicleMesh } from "./vehicles/VehicleMeshFactory";
import { buildTrack, type BuiltTrack } from "./tracks/TrackBuilder";
import { AISystem } from "./systems/AISystem";
import { AudioSystem } from "./systems/AudioSystem";
import { CameraSystem } from "./systems/CameraSystem";
import { EffectsSystem } from "./systems/EffectsSystem";
import { MeshSyncSystem } from "./systems/MeshSyncSystem";
import { PlayerInputSystem } from "./systems/PlayerInputSystem";
import { RaceSystem } from "./systems/RaceSystem";
import { SlipstreamSystem } from "./systems/SlipstreamSystem";
import { VehicleSystem } from "./systems/VehicleSystem";
import { HUD, type ResultsAction } from "./ui/HUD";
import { Menu, randomSeed, type RaceSetup } from "./ui/Menu";
import { Pause } from "./ui/Pause";
import { TouchControls } from "./ui/TouchControls";
import { loadRecord, saveRecord, trackKey, type TrackRecord } from "./records";
import { runUrl } from "./runUrl";
import settings from "../data/race/settings.json";

/**
 * Top-level game object: owns the engine, the menu/HUD/pause flow, and the
 * lifecycle of generated tracks and spawned vehicles. Everything it creates
 * can be torn down and rebuilt, so new tracks regenerate at runtime without a
 * reload.
 */
export class RacingGame {
	readonly engine: Engine;
	private menu: Menu;
	private pause: Pause;
	private hud: HUD;
	private touch: TouchControls;
	private race = new RaceSystem();
	private ai = new AISystem(this.race);
	private debug: DebugTools;
	private builtTrack: BuiltTrack | null = null;
	private vehicleEntities: EntityId[] = [];
	private lastSetup: RaceSetup | null = null;
	/** The stored record as it stood when the current race started. */
	private recordAtStart: TrackRecord | null = null;
	private trackLabel = "";
	private detach: (() => void)[] = [];

	private constructor(host: HTMLElement, canvas: HTMLCanvasElement, initialSetup: RaceSetup | null) {
		this.engine = new Engine({ host, canvas });
		this.debug = new DebugTools((seed) => {
			if (this.lastSetup) this.startRace({ ...this.lastSetup, seed: seed || this.lastSetup.seed });
		});

		// fixed-step order: player + AI write inputs → slipstream → vehicles step → race scores
		this.engine
			.addSystem(new PlayerInputSystem(this.race))
			.addSystem(this.ai)
			.addSystem(new SlipstreamSystem())
			.addSystem(new VehicleSystem())
			.addSystem(this.race)
			.addSystem(new CameraSystem())
			.addSystem(new MeshSyncSystem())
			.addSystem(new EffectsSystem())
			.addSystem(new AudioSystem());

		this.hud = new HUD(host, this.race);
		this.engine.addSystem(this.hud).addSystem(this.debug);

		this.touch = new TouchControls(host, this.engine.input, () => this.hud.useTouchHint());
		this.touch.hide();

		this.pause = new Pause(host, {
			resume: () => this.setPaused(false),
			restart: () => this.lastSetup && this.startRace(this.lastSetup),
			setup: () => this.showMenu(),
			copyLink: () => this.copyRunLink(),
		});

		this.menu = new Menu(host, (setup) => this.startRace(setup), initialSetup);
		this.hud.onResultsAction((action) => this.onResultsAction(action));

		// Escape toggles pause. Handled outside the fixed step because a paused
		// engine runs no fixed steps and so latches no key edges.
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.code !== "Escape" || !this.lastSetup) return;
			if (this.menu.isVisible || this.race.phase === "finished") return;
			event.preventDefault();
			this.setPaused(!this.engine.paused);
		};
		window.addEventListener("keydown", onKeyDown);
		this.detach.push(() => window.removeEventListener("keydown", onKeyDown));

		this.engine.events.on("race:finished", ({ standings }) => this.onRaceFinished(standings));
	}

	static async create(
		host: HTMLElement,
		canvas: HTMLCanvasElement,
		initialSetup: RaceSetup | null = null,
	): Promise<RacingGame> {
		const game = new RacingGame(host, canvas, initialSetup);
		await game.engine.init();
		// arriving on a /racer/<seed> run link: straight into the race
		if (initialSetup) game.startRace(initialSetup);
		// nothing to simulate behind the setup screen
		else game.engine.setPaused(true);
		return game;
	}

	private setPaused(paused: boolean): void {
		this.engine.setPaused(paused);
		this.touch.releaseAll();
		if (paused) {
			this.touch.hide();
			this.pause.show(this.trackLabel);
		} else {
			this.pause.hide();
			this.touch.show();
		}
	}

	private showMenu(): void {
		this.pause.hide();
		this.hud.hideResults();
		this.touch.hide();
		this.engine.setPaused(true);
		this.menu.show();
		window.history.replaceState(null, "", "/racer");
	}

	private onResultsAction(action: ResultsAction): void {
		const setup = this.lastSetup;
		if (!setup) return;
		if (action === "again") this.startRace(setup);
		else if (action === "newTrack") this.startRace({ ...setup, seed: randomSeed() });
		else if (action === "copy") void this.copyRunLink();
		else this.showMenu();
	}

	private onRaceFinished(standings: StandingEntry[]): void {
		const player = standings.find((entry) => entry.isPlayer);
		const setup = this.lastSetup;
		if (!player || !setup) return;
		const previousBest = this.recordAtStart?.bestLapMs ?? null;
		const isNewBest = player.bestLapMs !== null && (previousBest === null || player.bestLapMs < previousBest);
		const record = saveRecord(trackKey(setup), {
			lapMs: player.bestLapMs,
			totalMs: player.finished ? player.totalMs : null,
			position: standings.length > 1 ? player.position : null,
		});
		this.recordAtStart = record;
		this.touch.hide();
		this.hud.showResults(standings, record, isNewBest);
	}

	/** Copy the current run's absolute, shareable URL. */
	private async copyRunLink(): Promise<boolean> {
		if (!this.lastSetup) return false;
		const url = `${window.location.origin}${runUrl(this.lastSetup)}`;
		try {
			await navigator.clipboard.writeText(url);
			return true;
		} catch {
			// insecure context or denied permission — fall back to a scratch node
			try {
				const scratch = document.createElement("textarea");
				scratch.value = url;
				scratch.setAttribute("readonly", "");
				scratch.style.position = "fixed";
				scratch.style.opacity = "0";
				document.body.appendChild(scratch);
				scratch.select();
				const ok = document.execCommand("copy");
				scratch.remove();
				return ok;
			} catch {
				return false;
			}
		}
	}

	startRace(setup: RaceSetup): void {
		this.lastSetup = setup;
		this.teardownRace();

		const modeCfg = settings.modes[setup.mode];
		const aiCount = modeCfg.ai ? setup.aiCount : 0;

		const { track, terrainBuild } = generateTrack(
			{
				seed: setup.seed,
				biome: setup.biome,
				lengthKm: setup.lengthKm,
				difficulty: setup.difficulty,
				style: setup.style,
			},
			{ gridSlots: aiCount + 1 },
		);
		if (!track.validation.valid) {
			console.warn("track validation reported errors — racing anyway", track.validation.issues);
		}

		this.builtTrack = buildTrack(this.engine, track, terrainBuild);
		this.engine.camera.groundHeightAt = this.builtTrack.heightAt;

		this.race.configure(track, setup.mode);
		this.ai.setTrack(track);
		this.recordAtStart = loadRecord(trackKey(setup));
		this.trackLabel = `${track.name} · ${(track.length / 1000).toFixed(1)}km · seed ${setup.seed}`;
		this.hud.setTrack(track, this.recordAtStart);
		this.debug.setTrack(track);

		// --- spawn the field ---
		const playerConfig = getVehicle(setup.vehicleId);
		const playerLivery = getLivery(setup.livery, playerConfig);
		this.spawnVehicle(track, 0, playerConfig, playerLivery, { player: true, name: "You" });

		const fieldRng = new Rng(`${setup.seed}:field`);
		const field = pickFieldProfiles(fieldRng, aiCount);
		const catalog = allVehicles();
		for (let i = 0; i < field.length; i++) {
			const config = catalog[fieldRng.int(0, catalog.length - 1)];
			// rivals never wear the player's paint, so "which dot am I" stays easy
			this.spawnVehicle(track, i + 1, config, randomLivery(fieldRng, playerLivery.id), {
				player: false,
				name: field[i].name,
				profile: field[i],
				rng: fieldRng.fork(`driver:${i}`),
			});
		}

		this.menu.hide();
		this.pause.hide();
		this.hud.show();
		this.touch.show();
		this.engine.setPaused(false);
		// every run gets a shareable URL — same link rebuilds the same race
		window.history.replaceState(null, "", runUrl(setup));
		// orient the rig down the grid before snapping, so the first frame
		// already looks the way it will once the car is rolling
		this.engine.camera.resetOrientation();
		this.engine.camera.setFollowHeading(track.spawns[0].yaw);
		this.engine.camera.snap();
		this.engine.events.emit("track:generated", {
			seed: setup.seed,
			biome: setup.biome,
			lengthM: track.length,
			name: track.name,
		});
		this.race.startCountdown(this.engine);
	}

	private spawnVehicle(
		track: TrackData,
		gridSlot: number,
		config: VehicleConfig,
		colors: VehicleColors,
		options: { player: boolean; name: string; profile?: ReturnType<typeof pickFieldProfiles>[number]; rng?: Rng },
	): EntityId {
		const spawn = track.spawns[Math.min(gridSlot, track.spawns.length - 1)];
		const world = this.engine.world;
		const id = world.create();

		const vehicle = new RaycastVehicle(
			this.engine.physics,
			config.stats,
			new THREE.Vector3(spawn.x, spawn.y + 0.6, spawn.z),
			spawn.yaw,
		);
		const mesh = buildVehicleMesh(config, colors);
		this.engine.renderer.scene.add(mesh.root);

		world.add(id, new VehicleComponent(vehicle, config, colors, mesh));
		const rt = world.add(id, new RenderTransform());
		rt.snapTo(vehicle.position, vehicle.rotation);
		const racer = world.add(id, new RacerState(options.name, options.player));
		racer.nearestSample = this.nearestSampleTo(track, spawn.x, spawn.z);

		if (options.player) {
			world.add(id, new PlayerControlled());
		} else if (options.profile && options.rng) {
			world.add(id, new AIControlled(options.profile.profile, options.profile.name, options.rng));
		}
		this.vehicleEntities.push(id);
		return id;
	}

	private nearestSampleTo(track: TrackData, x: number, z: number): number {
		let best = 0;
		let bestD2 = Number.POSITIVE_INFINITY;
		for (let i = 0; i < track.samples.length; i++) {
			const dx = track.samples[i].x - x;
			const dz = track.samples[i].z - z;
			const d2 = dx * dx + dz * dz;
			if (d2 < bestD2) {
				bestD2 = d2;
				best = i;
			}
		}
		return best;
	}

	private teardownRace(): void {
		for (const id of this.vehicleEntities) {
			const vc = this.engine.world.get(id, VehicleComponent);
			if (vc) {
				this.engine.physics.removeBody(vc.vehicle.body);
				this.engine.renderer.scene.remove(vc.mesh.root);
				vc.mesh.root.traverse((obj) => {
					const mesh = obj as THREE.Mesh;
					mesh.geometry?.dispose();
					const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
					if (Array.isArray(material)) for (const m of material) m.dispose();
					else material?.dispose();
				});
			}
			this.engine.world.destroy(id);
		}
		this.vehicleEntities = [];
		this.builtTrack?.dispose();
		this.builtTrack = null;
	}

	dispose(): void {
		for (const fn of this.detach) fn();
		this.detach = [];
		this.teardownRace();
		this.menu.dispose();
		this.pause.dispose();
		this.touch.dispose();
		this.engine.dispose();
	}
}
