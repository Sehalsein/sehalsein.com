import * as THREE from "three";

/** Environment settings a biome supplies to restyle the world. */
export interface EnvironmentSettings {
	skyColor: string;
	fogColor: string;
	fogNear: number;
	fogFar: number;
	sunColor: string;
	sunIntensity: number;
	hemiSkyColor: string;
	hemiGroundColor: string;
	hemiIntensity: number;
	/** Normalized sun direction (will be scaled out for shadows). */
	sunDirection: [number, number, number];
}

/**
 * Owns the WebGL renderer, root scene and lighting. Stylized low-poly look:
 * flat colors, soft shadows from a single sun, distance fog matching the sky.
 */
export class Renderer {
	readonly canvas: HTMLCanvasElement;
	readonly gl: THREE.WebGLRenderer;
	readonly scene = new THREE.Scene();
	readonly sun: THREE.DirectionalLight;
	readonly hemi: THREE.HemisphereLight;

	/** Kept in world units so the sun can track the camera target. */
	private sunDirection = new THREE.Vector3(0.5, 1, 0.35).normalize();
	private resizeObserver: ResizeObserver;
	private onResizeCallbacks: ((width: number, height: number) => void)[] = [];

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.gl = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			powerPreference: "high-performance",
		});
		// 1.5 caps retina fill-rate cost — the difference from 2.0 is invisible
		// at this art style but roughly halves fragment work
		this.gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
		this.gl.shadowMap.enabled = true;
		this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
		this.gl.outputColorSpace = THREE.SRGBColorSpace;
		this.gl.toneMapping = THREE.ACESFilmicToneMapping;
		this.gl.toneMappingExposure = 1.1;

		this.hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.9);
		this.scene.add(this.hemi);

		this.sun = new THREE.DirectionalLight(0xfff2d9, 2.2);
		this.sun.castShadow = true;
		this.sun.shadow.mapSize.set(1024, 1024);
		const cam = this.sun.shadow.camera;
		cam.left = -85;
		cam.right = 85;
		cam.top = 85;
		cam.bottom = -85;
		cam.near = 10;
		cam.far = 420;
		this.sun.shadow.bias = -0.0004;
		this.sun.shadow.normalBias = 0.6;
		this.scene.add(this.sun);
		this.scene.add(this.sun.target);

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(canvas.parentElement ?? document.body);
		this.resize();
	}

	applyEnvironment(env: EnvironmentSettings): void {
		this.scene.background = new THREE.Color(env.skyColor);
		this.scene.fog = new THREE.Fog(env.fogColor, env.fogNear, env.fogFar);
		this.sun.color.set(env.sunColor);
		this.sun.intensity = env.sunIntensity;
		this.hemi.color.set(env.hemiSkyColor);
		this.hemi.groundColor.set(env.hemiGroundColor);
		this.hemi.intensity = env.hemiIntensity;
		this.sunDirection.fromArray(env.sunDirection).normalize();
	}

	/** Keep the shadow frustum centered on the action (call with camera target). */
	updateSunTarget(target: THREE.Vector3): void {
		this.sun.target.position.copy(target);
		this.sun.position.copy(target).addScaledVector(this.sunDirection, 220);
	}

	onResize(callback: (width: number, height: number) => void): void {
		this.onResizeCallbacks.push(callback);
	}

	private resize(): void {
		const parent = this.canvas.parentElement;
		const width = parent?.clientWidth ?? window.innerWidth;
		const height = parent?.clientHeight ?? window.innerHeight;
		this.gl.setSize(width, height, false);
		for (const cb of this.onResizeCallbacks) cb(width, height);
	}

	get aspect(): number {
		const size = this.gl.getSize(new THREE.Vector2());
		return size.x / Math.max(1, size.y);
	}

	render(camera: THREE.Camera): void {
		this.gl.render(this.scene, camera);
	}

	dispose(): void {
		this.resizeObserver.disconnect();
		this.scene.traverse((obj) => {
			const mesh = obj as THREE.Mesh;
			if (mesh.geometry) mesh.geometry.dispose();
			const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
			if (Array.isArray(material)) for (const m of material) m.dispose();
			else material?.dispose();
		});
		this.scene.clear();
		this.gl.dispose();
	}
}
