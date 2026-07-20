import * as THREE from "three";
import { Engine } from "../engine/Engine";
import type { EntityId } from "../engine/ecs/World";
import { RaycastVehicle } from "../engine/physics/RaycastVehicle";
import { DebugTools } from "../engine/debug/DebugTools";
import { generateTrack } from "../procedural/TrackGenerator";
import type { TrackData } from "../procedural/types";
import { Rng } from "../shared/rng";
import {
	AIControlled,
	PlayerControlled,
	RacerState,
	RenderTransform,
	VehicleComponent,
} from "./components";
import { pickFieldProfiles } from "./ai/aiProfiles";
import { allVehicles, getVehicle, type VehicleConfig } from "./vehicles/VehicleCatalog";
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
import { HUD } from "./ui/HUD";
import { Menu, type RaceSetup } from "./ui/Menu";
import { runUrl } from "./runUrl";
import settings from "../data/race/settings.json";

/**
 * Top-level game object: owns the engine, menu/HUD flow, and the lifecycle of
 * generated tracks and spawned vehicles. Everything it creates can be torn
 * down and rebuilt, so new tracks regenerate at runtime without a reload.
 */
export class RacingGame {
	readonly engine: Engine;
	private menu: Menu;
	private hud: HUD;
	private race = new RaceSystem();
	private ai = new AISystem(this.race);
	private debug: DebugTools;
	private builtTrack: BuiltTrack | null = null;
	private vehicleEntities: EntityId[] = [];
	private lastSetup: RaceSetup | null = null;

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

		// Escape opens the setup menu at any time (race keeps running behind it)
		this.engine.addSystem({
			name: "pauseMenu",
			fixedUpdate: (engine: Engine) => {
				if (engine.input.justPressed("pause")) this.showMenu();
			},
		});

		this.menu = new Menu(host, (setup) => this.startRace(setup), initialSetup);
		this.hud.onResultsAction(() => this.showMenu());
	}

	static async create(
		host: HTMLElement,
		canvas: HTMLCanvasElement,
		initialSetup: RaceSetup | null = null,
	): Promise<RacingGame> {
		const game = new RacingGame(host, canvas, initialSetup);
		await game.engine.init();
		// arriving on a /playground/<seed> run link: straight into the race
		if (initialSetup) game.startRace(initialSetup);
		return game;
	}

	private showMenu(): void {
		this.menu.show();
		window.history.replaceState(null, "", "/playground");
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
		this.hud.setTrack(track);
		this.debug.setTrack(track);

		// --- spawn the field ---
		const playerConfig = getVehicle(setup.vehicleId);
		this.spawnVehicle(track, 0, playerConfig, { player: true, name: "You" });

		const fieldRng = new Rng(`${setup.seed}:field`);
		const field = pickFieldProfiles(fieldRng, aiCount);
		const catalog = allVehicles();
		for (let i = 0; i < field.length; i++) {
			const config = catalog[fieldRng.int(0, catalog.length - 1)];
			this.spawnVehicle(track, i + 1, config, {
				player: false,
				name: field[i].name,
				profile: field[i],
				rng: fieldRng.fork(`driver:${i}`),
			});
		}

		this.menu.hide();
		this.hud.show();
		// every run gets a shareable URL — same link rebuilds the same race
		window.history.replaceState(null, "", runUrl(setup));
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
		const mesh = buildVehicleMesh(config);
		this.engine.renderer.scene.add(mesh.root);

		world.add(id, new VehicleComponent(vehicle, config, mesh));
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
		this.teardownRace();
		this.menu.dispose();
		this.engine.dispose();
	}
}
