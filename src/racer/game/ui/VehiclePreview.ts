import * as THREE from "three";
import type { VehicleColors, VehicleConfig } from "../vehicles/VehicleCatalog";
import { buildVehicleMesh } from "../vehicles/VehicleMeshFactory";

/**
 * Small turntable render of the currently selected car, shown on the setup
 * screen. It owns a second, tiny WebGL context rather than borrowing the game
 * renderer, because the menu exists before (and after) any race does.
 *
 * The lighting deliberately mirrors the track's — key light from above-right
 * plus sky fill — so the car you pick looks like the car you drive.
 */
export class VehiclePreview {
	readonly canvas: HTMLCanvasElement;
	private renderer: THREE.WebGLRenderer | null = null;
	private scene = new THREE.Scene();
	private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
	private turntable = new THREE.Group();
	private current: THREE.Group | null = null;
	private rafId = 0;
	private lastTime = 0;
	private angle = Math.PI * 0.25;
	private dragging = false;
	private detach: (() => void)[] = [];

	constructor() {
		this.canvas = document.createElement("canvas");
		this.canvas.className = "rg-preview-canvas";

		try {
			this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
		} catch {
			// no second WebGL context available — the menu still works fine
			this.renderer = null;
			return;
		}
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = false;

		// far enough back that the longest car (the pickup) still clears the frame
		this.camera.position.set(6.8, 3.6, 8.0);
		this.camera.lookAt(0, 0.1, 0);

		const key = new THREE.DirectionalLight(0xfff4e0, 2.1);
		key.position.set(4, 7, 5);
		const rim = new THREE.DirectionalLight(0x9ec2ff, 0.7);
		rim.position.set(-5, 2, -4);
		this.scene.add(key, rim, new THREE.HemisphereLight(0xbcd6ff, 0x2a2d36, 1.1));

		// a soft disc under the car so it doesn't float in the void
		const shadow = new THREE.Mesh(
			new THREE.CircleGeometry(2.1, 32),
			new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }),
		);
		shadow.rotation.x = -Math.PI / 2;
		shadow.position.y = -0.62;
		this.scene.add(shadow, this.turntable);

		// drag to spin — the turntable resumes on release
		const onDown = (e: PointerEvent) => {
			this.dragging = true;
			this.canvas.setPointerCapture(e.pointerId);
		};
		const onUp = () => {
			this.dragging = false;
		};
		const onMove = (e: PointerEvent) => {
			if (this.dragging) this.angle -= e.movementX * 0.01;
		};
		this.canvas.addEventListener("pointerdown", onDown);
		this.canvas.addEventListener("pointerup", onUp);
		this.canvas.addEventListener("pointercancel", onUp);
		this.canvas.addEventListener("pointermove", onMove);
		this.detach.push(() => {
			this.canvas.removeEventListener("pointerdown", onDown);
			this.canvas.removeEventListener("pointerup", onUp);
			this.canvas.removeEventListener("pointercancel", onUp);
			this.canvas.removeEventListener("pointermove", onMove);
		});
	}

	/** Swap in a car; cheap enough to call on every colour tap. */
	show(config: VehicleConfig, colors: VehicleColors): void {
		if (!this.renderer) return;
		this.disposeCurrent();
		const { root } = buildVehicleMesh(config, colors);
		this.current = root;
		this.turntable.add(root);
	}

	start(): void {
		if (!this.renderer || this.rafId) return;
		this.lastTime = performance.now();
		const frame = (now: number) => {
			this.rafId = requestAnimationFrame(frame);
			const dt = Math.min((now - this.lastTime) / 1000, 0.1);
			this.lastTime = now;
			if (!this.dragging) this.angle += dt * 0.55;
			this.turntable.rotation.y = this.angle;
			this.resize();
			this.renderer?.render(this.scene, this.camera);
		};
		this.rafId = requestAnimationFrame(frame);
	}

	stop(): void {
		cancelAnimationFrame(this.rafId);
		this.rafId = 0;
	}

	private resize(): void {
		const width = this.canvas.clientWidth;
		const height = this.canvas.clientHeight;
		if (!width || !height) return;
		if (this.canvas.width === width && this.canvas.height === height) return;
		this.renderer?.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	private disposeCurrent(): void {
		if (!this.current) return;
		this.turntable.remove(this.current);
		this.current.traverse((obj) => {
			const mesh = obj as THREE.Mesh;
			mesh.geometry?.dispose();
			const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
			if (Array.isArray(material)) for (const m of material) m.dispose();
			else material?.dispose();
		});
		this.current = null;
	}

	dispose(): void {
		this.stop();
		for (const fn of this.detach) fn();
		this.detach = [];
		this.disposeCurrent();
		this.renderer?.dispose();
		this.renderer = null;
	}
}
