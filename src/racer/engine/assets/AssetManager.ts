import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Caching asset loader. The current game builds all geometry procedurally, but
 * vehicles/props can move to GLB files later without touching game code —
 * everything goes through here.
 */
export class AssetManager {
	private gltfLoader = new GLTFLoader();
	private textureLoader = new THREE.TextureLoader();
	private gltfCache = new Map<string, Promise<THREE.Group>>();
	private textureCache = new Map<string, THREE.Texture>();

	/** Load (or reuse) a GLTF scene; returns a fresh clone per call. */
	async loadModel(url: string): Promise<THREE.Group> {
		let cached = this.gltfCache.get(url);
		if (!cached) {
			cached = this.gltfLoader.loadAsync(url).then((gltf) => gltf.scene);
			this.gltfCache.set(url, cached);
		}
		const scene = await cached;
		return scene.clone(true);
	}

	loadTexture(url: string): THREE.Texture {
		let tex = this.textureCache.get(url);
		if (!tex) {
			tex = this.textureLoader.load(url);
			tex.colorSpace = THREE.SRGBColorSpace;
			this.textureCache.set(url, tex);
		}
		return tex;
	}

	dispose(): void {
		for (const tex of this.textureCache.values()) tex.dispose();
		this.textureCache.clear();
		this.gltfCache.clear();
	}
}
