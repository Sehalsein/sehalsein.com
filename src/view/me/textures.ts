/**
 * Resolves each pose to a texture, and builds the small shared sprites the eye
 * overlays are drawn with.
 *
 * Which PNGs exist is decided on the server (see app/me/page.tsx) and handed in
 * as `availablePoses`, so this never speculatively fetches anything — no 404s,
 * no console noise, and the probe can assert on exactly that.
 */

import * as THREE from "three";
import { POSE_FALLBACK, POSE_IDS, type PoseId } from "./poses";
import { makeStandinTexture } from "./standin";
import type { TextureSource } from "./types";

const DIR = "/memoji";

function configure(tex: THREE.Texture, maxAnisotropy: number): THREE.Texture {
	tex.colorSpace = THREE.SRGBColorSpace;
	// see faceMaterial.ts — premultiplied on both sides or the edges halo
	tex.premultiplyAlpha = true;
	tex.minFilter = THREE.LinearMipmapLinearFilter;
	tex.magFilter = THREE.LinearFilter;
	tex.generateMipmaps = true;
	tex.wrapS = THREE.ClampToEdgeWrapping;
	tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.anisotropy = Math.min(8, maxAnisotropy);
	tex.needsUpdate = true;
	return tex;
}

/**
 * A white disc with a soft edge, used (tinted) for every eye overlay quad.
 * One texture, four jobs: sclera, pupil, highlight, eyelid.
 */
function makeDiscTexture(): THREE.CanvasTexture {
	const S = 128;
	const canvas = document.createElement("canvas");
	canvas.width = S;
	canvas.height = S;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
		g.addColorStop(0, "rgba(255,255,255,1)");
		g.addColorStop(0.86, "rgba(255,255,255,1)");
		g.addColorStop(1, "rgba(255,255,255,0)");
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, S, S);
	}
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.minFilter = THREE.LinearMipmapLinearFilter;
	tex.magFilter = THREE.LinearFilter;
	tex.needsUpdate = true;
	return tex;
}

export interface PoseTextures {
	get(id: PoseId): THREE.Texture;
	/**
	 * Which pose's calibration matches what is actually on screen for `id`.
	 * Differs from `id` only when this pose borrowed another pose's artwork.
	 */
	effective(id: PoseId): PoseId;
	sources: Record<PoseId, TextureSource>;
	disc: THREE.Texture;
	dispose(): void;
}

export async function createPoseTextures(
	availablePoses: readonly PoseId[],
	maxAnisotropy: number,
): Promise<PoseTextures> {
	const available = new Set(availablePoses);
	const loader = new THREE.TextureLoader();

	// Load every real PNG up front. We only ever ask for files the server told
	// us are there, so a failure here means something is genuinely broken —
	// fall through to the stand-in and say so once.
	const loaded = new Map<PoseId, THREE.Texture>();
	await Promise.all(
		[...available].map(async (id) => {
			try {
				const tex = await loader.loadAsync(`${DIR}/${id}.png`);
				loaded.set(id, configure(tex, maxAnisotropy));
			} catch {
				console.warn(`[me] ${DIR}/${id}.png failed to load — using the stand-in`);
			}
		}),
	);

	/** Walk the fallback chain to the first pose with real artwork. */
	function borrowFrom(id: PoseId): PoseId | null {
		const seen = new Set<PoseId>([id]);
		let next = POSE_FALLBACK[id];
		while (next && !seen.has(next)) {
			if (loaded.has(next)) return next;
			seen.add(next);
			next = POSE_FALLBACK[next];
		}
		return null;
	}

	const textures = {} as Record<PoseId, THREE.Texture>;
	const effectiveOf = {} as Record<PoseId, PoseId>;
	const sources = {} as Record<PoseId, TextureSource>;
	const owned: THREE.Texture[] = [];

	for (const id of POSE_IDS) {
		const own = loaded.get(id);
		if (own) {
			textures[id] = own;
			effectiveOf[id] = id;
			sources[id] = "png";
			continue;
		}
		const borrowed = borrowFrom(id);
		if (borrowed) {
			// reuse the real art rather than mixing a stand-in doodle into a
			// session that otherwise shows the actual Memoji
			textures[id] = loaded.get(borrowed) as THREE.Texture;
			effectiveOf[id] = borrowed;
			sources[id] = "fallback";
			continue;
		}
		const standin = configure(makeStandinTexture(id), maxAnisotropy);
		textures[id] = standin;
		effectiveOf[id] = id;
		sources[id] = "standin";
		owned.push(standin);
	}

	const disc = makeDiscTexture();

	return {
		get: (id) => textures[id],
		effective: (id) => effectiveOf[id],
		sources,
		disc,
		dispose() {
			for (const tex of loaded.values()) tex.dispose();
			for (const tex of owned) tex.dispose();
			disc.dispose();
		},
	};
}
