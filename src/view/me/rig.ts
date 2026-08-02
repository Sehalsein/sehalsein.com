/**
 * The character rig: the domed sticker plus the overlay quads that make the
 * eyes movable.
 *
 * Node layout, and why:
 *
 *   root       position (breath bob, wave bob) and scale
 *     pivot    ALL rotation — gaze and the wave's rock — about the neck
 *       body   translated by -pivot, so `pivot` really is the pivot
 *         dome + left eye + right eye
 *
 * Rotating about the image centre makes the head float and slide; rotating
 * about the base of the neck makes it pivot like a head on a neck. The
 * difference costs one extra Group and is enormous.
 */

import * as THREE from "three";
import { buildDome, HEAD_H, HEAD_W, surfacePoint } from "./domeGeometry";
import { createFaceMaterial, RIM_BASE, RIM_FLASH, type FaceUniforms } from "./faceMaterial";
import { clamp01, lerp, smoothstep } from "./math";
import { POSES, type EyeCalibration, type PoseId } from "./poses";
import type { PoseTextures } from "./textures";
import type { MePalette } from "./types";

const Z_AXIS = new THREE.Vector3(0, 0, 1);

/** Draw order for the overlays. Physical z offsets back these up. */
const LAYER = { sclera: 10, pupil: 11, highlight: 12, lid: 13 } as const;
const OFFSET = { sclera: 0.004, pupil: 0.008, highlight: 0.011, lid: 0.014 } as const;

const CROSSFADE = 0.12;
const RIM_FLASH_TIME = 0.5;

interface EyeNodes {
	group: THREE.Group;
	sclera: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
	pupil: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
	highlight: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
	lid: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
	/** Pupil travel in world units, from the pose's UV-space calibration. */
	travel: { x: number; y: number };
	/** Local y of the socket's top edge — the lid hangs from here. */
	lidTop: number;
	lidHeight: number;
}

export class MemojiRig {
	readonly root = new THREE.Group();
	private pivot = new THREE.Group();
	private body = new THREE.Group();
	private dome: THREE.Mesh;
	private uniforms: FaceUniforms;
	private material: THREE.ShaderMaterial;
	private quad = new THREE.PlaneGeometry(1, 1);

	private left: EyeNodes;
	private right: EyeNodes;

	/** The pose whose artwork is fully shown. */
	current: PoseId = "neutral";
	/** The pose being faded in, or `current` when nothing is in flight. */
	pending: PoseId = "neutral";
	private fade = 0;

	private rimFlash = 0;
	private palette: MePalette | null = null;

	constructor(private textures: PoseTextures) {
		this.material = createFaceMaterial();
		this.uniforms = (this.material as THREE.ShaderMaterial & { uniforms: FaceUniforms })
			.uniforms;

		this.dome = new THREE.Mesh(buildDome(), this.material);
		this.dome.frustumCulled = false;

		this.left = this.makeEye();
		this.right = this.makeEye();

		this.body.add(this.dome, this.left.group, this.right.group);
		this.pivot.add(this.body);
		this.root.add(this.pivot);

		const neutral = this.textures.get("neutral");
		this.uniforms.uMapA.value = neutral;
		this.uniforms.uMapB.value = neutral;
		this.applyPoseGeometry("neutral");
	}

	// ── construction ─────────────────────────────────────────────────────────

	private overlay(color: number, layer: number, z: number): THREE.Mesh<
		THREE.PlaneGeometry,
		THREE.MeshBasicMaterial
	> {
		const mesh = new THREE.Mesh(
			this.quad,
			new THREE.MeshBasicMaterial({
				map: this.textures.disc,
				color,
				transparent: true,
				// deterministic ordering with no sort artifacts: never write depth,
				// stack by renderOrder, and keep a real z gap so nothing z-fights
				depthWrite: false,
				depthTest: true,
				toneMapped: false,
			}),
		);
		mesh.renderOrder = layer;
		mesh.position.z = z;
		mesh.frustumCulled = false;
		return mesh;
	}

	private makeEye(): EyeNodes {
		const group = new THREE.Group();
		const sclera = this.overlay(0xffffff, LAYER.sclera, OFFSET.sclera);
		const pupil = this.overlay(0x222222, LAYER.pupil, OFFSET.pupil);
		const highlight = this.overlay(0xffffff, LAYER.highlight, OFFSET.highlight);
		const lid = this.overlay(0xffffff, LAYER.lid, OFFSET.lid);
		group.add(sclera, pupil, highlight, lid);
		return {
			group,
			sclera,
			pupil,
			highlight,
			lid,
			travel: { x: 0, y: 0 },
			lidTop: 0,
			lidHeight: 0,
		};
	}

	// ── pose ─────────────────────────────────────────────────────────────────

	/**
	 * Start a cross-fade to `id`.
	 *
	 * Swapping `material.map` outright gives a one-frame pop, and with art whose
	 * features shift between poses that reads as a glitch. Interrupting a fade
	 * commits the in-flight target first — worst case a sub-120ms jump at 40%
	 * blend, and in exchange the state machine is total: no queue, no reentrancy.
	 */
	setPose(id: PoseId): void {
		if (id === this.pending) return;
		if (this.fade > 0) {
			this.uniforms.uMapA.value = this.uniforms.uMapB.value;
			this.current = this.pending;
			this.fade = 0;
		}
		this.uniforms.uMapB.value = this.textures.get(id);
		this.pending = id;
		this.fade = 1e-6;
		// The overlays follow the *pending* pose immediately: a pose whose art
		// draws closed eyes needs the pupils gone before the fade reveals them.
		this.applyPoseGeometry(id);
	}

	/** Place the eye quads from the calibration of whatever art is on screen. */
	private applyPoseGeometry(id: PoseId): void {
		const cal = POSES[this.textures.effective(id)];
		this.setPivotFromPose(id);
		if (!cal.eyes) {
			this.left.group.visible = false;
			this.right.group.visible = false;
			return;
		}
		this.left.group.visible = true;
		this.right.group.visible = true;
		this.placeEye(this.left, cal.eyes.left, cal.scleraColor, cal.skinColor, cal.irisColor);
		this.placeEye(this.right, cal.eyes.right, cal.scleraColor, cal.skinColor, cal.irisColor);
	}

	/** Moves the rotation pivot to this pose's neck. Only on a pose change. */
	private setPivotFromPose(id: PoseId): void {
		const cal = POSES[this.textures.effective(id)];
		const p = surfacePoint(cal.pivot[0], cal.pivot[1]);
		this.pivot.position.copy(p.position);
		this.body.position.copy(p.position).negate();
	}

	private placeEye(
		eye: EyeNodes,
		cal: EyeCalibration,
		scleraColor: string,
		skinColor: string,
		irisColor?: string,
	): void {
		const s = surfacePoint(cal.center[0], cal.center[1]);
		eye.group.position.copy(s.position);
		eye.group.quaternion.setFromUnitVectors(Z_AXIS, s.normal);

		// 1 UV unit spans HEAD_W across and HEAD_H up
		const sw = cal.socket[0] * 2 * HEAD_W;
		const sh = cal.socket[1] * 2 * HEAD_H;

		// "cover" paints over an eye the artwork already drew, so the pupil has
		// somewhere clean to move. "overlay" art has nothing to hide.
		eye.sclera.visible = cal.mode === "cover";
		eye.sclera.scale.set(sw, sh, 1);
		eye.sclera.material.color.set(scleraColor);

		const pd = cal.pupilRadius * 2 * HEAD_W;
		eye.pupil.scale.set(pd, pd, 1);
		if (irisColor) eye.pupil.material.color.set(irisColor);

		const hd = cal.highlightRadius * 2 * HEAD_W;
		eye.highlight.visible = cal.highlightRadius > 0;
		eye.highlight.scale.set(hd, hd, 1);

		eye.lid.material.color.set(skinColor);
		eye.lid.scale.x = sw * 1.06;

		eye.travel.x = cal.pupilTravel[0] * HEAD_W;
		eye.travel.y = cal.pupilTravel[1] * HEAD_H;
		eye.lidTop = sh / 2;
		eye.lidHeight = sh * 1.25;

		if (this.palette) this.applyEyePalette(eye, this.palette, irisColor);
	}

	// ── per-frame state ──────────────────────────────────────────────────────

	/**
	 * All rotation in one call, about the neck.
	 *
	 * `pitch` is stored "up is positive" everywhere else in this codebase, but a
	 * positive `rotation.x` tips the surface normal DOWN — so it is negated here,
	 * once, and nowhere else. Getting this sign wrong doesn't look broken, it
	 * looks subtly and unplaceably off, which is much harder to spot.
	 *
	 * The wave's rock is added on top of the gaze roll rather than replacing it,
	 * so the character keeps watching you while it waves.
	 */
	setGaze(yaw: number, pitch: number, roll: number, rock: number): void {
		this.pivot.rotation.x = -pitch;
		this.pivot.rotation.y = yaw;
		this.pivot.rotation.z = roll + rock;
	}

	setPupils(x: number, y: number): void {
		for (const eye of [this.left, this.right]) {
			const px = x * eye.travel.x;
			const py = y * eye.travel.y;
			eye.pupil.position.x = px;
			eye.pupil.position.y = py;
			// The specular dot lags the pupil slightly — that's what sells wetness.
			// It sits up and to the left, matching the key light in faceMaterial.
			eye.highlight.position.x = px * 0.7 - eye.travel.x * 0.34;
			eye.highlight.position.y = py * 0.7 + eye.travel.y * 0.42;
		}
	}

	setBlink(lid: number): void {
		const t = clamp01(lid);
		for (const eye of [this.left, this.right]) {
			const h = t * eye.lidHeight;
			eye.lid.visible = h > 1e-4;
			eye.lid.scale.y = Math.max(h, 1e-4);
			// hangs from the top of the socket and closes downward
			eye.lid.position.y = eye.lidTop - h / 2;
		}
	}

	setBody(bob: number, scale: number, opacity: number): void {
		this.root.position.y = bob;
		this.root.scale.setScalar(scale);
		this.uniforms.uOpacity.value = opacity;
	}

	// ── palette ──────────────────────────────────────────────────────────────

	setPalette(palette: MePalette): void {
		this.palette = palette;
		const ink = new THREE.Color().setStyle(palette.ink, THREE.SRGBColorSpace);
		const accent = new THREE.Color().setStyle(palette.accent, THREE.SRGBColorSpace);

		// a key light pulled most of the way to white, so a saturated palette
		// tints the shading without staining the skin
		this.uniforms.uKeyColor.value.copy(ink).lerp(new THREE.Color(1, 1, 1), 0.65);
		this.uniforms.uRimColor.value.copy(accent);
		this.uniforms.uTint.value.copy(new THREE.Color(1, 1, 1)).lerp(ink, 0.1);

		const cal = POSES[this.textures.effective(this.pending)];
		this.applyEyePalette(this.left, palette, cal.irisColor);
		this.applyEyePalette(this.right, palette, cal.irisColor);
	}

	private applyEyePalette(eye: EyeNodes, palette: MePalette, irisColor?: string): void {
		if (irisColor) eye.pupil.material.color.set(irisColor);
		else eye.pupil.material.color.setStyle(palette.ink, THREE.SRGBColorSpace).multiplyScalar(0.28);
		eye.highlight.material.color.setStyle(palette.ink, THREE.SRGBColorSpace);
	}

	/** A brief rim pulse, so a palette change is felt and not just correct. */
	flashRim(): void {
		this.rimFlash = RIM_FLASH_TIME;
	}

	get rimStrength(): number {
		return this.uniforms.uRimStrength.value;
	}

	// ── tick ─────────────────────────────────────────────────────────────────

	update(dt: number): void {
		if (this.fade > 0) {
			this.fade = Math.min(1, this.fade + dt / CROSSFADE);
			this.uniforms.uMix.value = smoothstep(0, 1, this.fade);
			if (this.fade >= 1) {
				this.uniforms.uMapA.value = this.uniforms.uMapB.value;
				this.current = this.pending;
				this.fade = 0;
				this.uniforms.uMix.value = 0;
			}
		}

		if (this.rimFlash > 0) {
			this.rimFlash = Math.max(0, this.rimFlash - dt);
			const t = this.rimFlash / RIM_FLASH_TIME;
			this.uniforms.uRimStrength.value = lerp(RIM_BASE, RIM_FLASH, smoothstep(0, 1, t));
		} else {
			this.uniforms.uRimStrength.value = RIM_BASE;
		}
	}

	get mix(): number {
		return this.uniforms.uMix.value;
	}

	dispose(): void {
		this.dome.geometry.dispose();
		this.material.dispose();
		this.quad.dispose();
		for (const eye of [this.left, this.right]) {
			for (const mesh of [eye.sclera, eye.pupil, eye.highlight, eye.lid]) {
				mesh.material.dispose();
			}
		}
	}
}
