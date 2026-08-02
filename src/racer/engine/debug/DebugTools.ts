import * as THREE from "three";
import { Pane } from "tweakpane";
import Stats from "stats-gl";
import type { Engine } from "../Engine";
import type { System } from "../ecs/System";
import type { TrackData } from "../../procedural/types";

/**
 * Developer tooling, available from the first frame: FPS monitor (stats-gl),
 * physics wireframe, track spline / racing line / checkpoint visualization,
 * scene wireframe, free camera, seed viewer and generation profiler dumps.
 * Toggle the panel with backquote (`).
 */
export class DebugTools implements System {
	readonly name = "debug";
	private pane: Pane | null = null;
	private stats: Stats | null = null;
	private track: TrackData | null = null;
	private helpers = new THREE.Group();
	private physicsLines: THREE.LineSegments | null = null;

	readonly state = {
		panelVisible: false,
		physicsWireframe: false,
		splineViz: false,
		racingLineViz: false,
		checkpointViz: false,
		sceneWireframe: false,
		freeCamera: false,
	};

	constructor(private onRegenerate: (seed: string) => void) {}

	init(engine: Engine): void {
		this.helpers.name = "debug-helpers";
		engine.renderer.scene.add(this.helpers);

		this.stats = new Stats({ trackGPU: false, horizontal: true });
		this.stats.init(engine.renderer.gl);
		this.stats.dom.style.cssText = "position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:60;display:none;";
		engine.host.appendChild(this.stats.dom);

		const pane = new Pane({ title: "debug", expanded: true });
		this.pane = pane;
		const container = pane.element.parentElement;
		if (container) {
			container.style.zIndex = "70";
			container.style.display = "none";
		}

		pane.addBinding(this.state, "physicsWireframe", { label: "physics wires" });
		pane.addBinding(this.state, "splineViz", { label: "track spline" }).on("change", () => this.rebuildHelpers());
		pane.addBinding(this.state, "racingLineViz", { label: "racing line" }).on("change", () => this.rebuildHelpers());
		pane.addBinding(this.state, "checkpointViz", { label: "checkpoints" }).on("change", () => this.rebuildHelpers());
		pane.addBinding(this.state, "sceneWireframe", { label: "wireframe" }).on("change", (ev) => {
			engine.renderer.scene.traverse((obj) => {
				const material = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
				if (material && "wireframe" in material) material.wireframe = ev.value as boolean;
			});
		});
		pane.addBinding(this.state, "freeCamera", { label: "free camera" }).on("change", (ev) => {
			engine.camera.freeMode = ev.value as boolean;
		});

		const seedState = { seed: "" };
		this.seedBinding = seedState;
		pane.addBinding(seedState, "seed", { label: "seed" });
		pane.addButton({ title: "regenerate" }).on("click", () => this.onRegenerate(seedState.seed));
		pane.addButton({ title: "log generation profile" }).on("click", () => {
			if (this.track) {
				// eslint-disable-next-line no-console
				console.table(this.track.profile.map((p) => ({ stage: p.stage, ms: +p.ms.toFixed(2), attempts: p.attempts })));
			}
		});
		pane.addButton({ title: "log validation report" }).on("click", () => {
			if (this.track) console.info("track validation", this.track.validation);
		});
	}

	private seedBinding: { seed: string } = { seed: "" };

	setTrack(track: TrackData): void {
		this.track = track;
		this.seedBinding.seed = track.params.seed;
		this.pane?.refresh();
		this.rebuildHelpers();
	}

	private rebuildHelpers(): void {
		for (const child of [...this.helpers.children]) {
			this.helpers.remove(child);
			const mesh = child as THREE.Line;
			mesh.geometry?.dispose();
			(mesh.material as THREE.Material)?.dispose();
		}
		const track = this.track;
		if (!track) return;

		if (this.state.splineViz) {
			const points = track.samples.map((s) => new THREE.Vector3(s.x, s.y + 0.6, s.z));
			points.push(points[0].clone());
			const geo = new THREE.BufferGeometry().setFromPoints(points);
			this.helpers.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x35e0e6 })));
		}
		if (this.state.racingLineViz) {
			const points = track.racingLine.map((p) => new THREE.Vector3(p.x, p.y + 0.7, p.z));
			points.push(points[0].clone());
			const geo = new THREE.BufferGeometry().setFromPoints(points);
			this.helpers.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff4de1 })));
		}
		if (this.state.checkpointViz) {
			for (const cp of track.checkpoints) {
				const nx = cp.tz;
				const nz = -cp.tx;
				const geo = new THREE.BufferGeometry().setFromPoints([
					new THREE.Vector3(cp.x + nx * cp.halfWidth, cp.y + 2.2, cp.z + nz * cp.halfWidth),
					new THREE.Vector3(cp.x - nx * cp.halfWidth, cp.y + 2.2, cp.z - nz * cp.halfWidth),
				]);
				this.helpers.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe14d })));
			}
		}
	}

	fixedUpdate(engine: Engine): void {
		if (engine.input.justPressed("toggleDebug")) {
			this.state.panelVisible = !this.state.panelVisible;
			const container = this.pane?.element.parentElement;
			if (container) container.style.display = this.state.panelVisible ? "" : "none";
			if (this.stats) this.stats.dom.style.display = this.state.panelVisible ? "" : "none";
			engine.events.emit("debug:toggle", { panel: this.state.panelVisible });
		}
	}

	update(engine: Engine): void {
		this.stats?.update();

		// physics wireframe rebuilt per frame while enabled (debug-only cost)
		if (this.physicsLines) {
			this.helpers.remove(this.physicsLines);
			this.physicsLines.geometry.dispose();
			(this.physicsLines.material as THREE.Material).dispose();
			this.physicsLines = null;
		}
		if (this.state.physicsWireframe && this.state.panelVisible) {
			const buffers = engine.physics.world.debugRender();
			const geo = new THREE.BufferGeometry();
			geo.setAttribute("position", new THREE.BufferAttribute(buffers.vertices, 3));
			geo.setAttribute("color", new THREE.BufferAttribute(buffers.colors, 4));
			this.physicsLines = new THREE.LineSegments(
				geo,
				new THREE.LineBasicMaterial({ vertexColors: true }),
			);
			this.helpers.add(this.physicsLines);
		}
	}

	dispose(engine: Engine): void {
		this.pane?.dispose();
		this.stats?.dom.remove();
		engine.renderer.scene.remove(this.helpers);
	}
}
