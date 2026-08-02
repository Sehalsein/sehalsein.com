import * as THREE from "three";
import { clamp, damp, dampAngle } from "../../shared/math";

/** Classic isometric pitch: atan(1/√2). */
const ISO_PITCH = Math.atan(1 / Math.SQRT2);
const CAMERA_DISTANCE = 320;

/**
 * Isometric follow camera (orthographic) plus a free-orbit developer camera.
 *
 * - Zoom: mouse wheel adjusts the ortho frustum size.
 * - Rotation: yaw rotates in smooth 45° steps (Q/E).
 * - Follow: exponentially damped so the car leads into corners.
 * - Ground clamp: the rig never dips below a supplied ground height (the
 *   isometric equivalent of camera collision handling).
 */
export class CameraRig {
	readonly iso: THREE.OrthographicCamera;
	readonly free: THREE.PerspectiveCamera;
	freeMode = false;

	/** World-space point the camera tracks. */
	readonly target = new THREE.Vector3();
	private smoothedTarget = new THREE.Vector3();

	private yaw = Math.PI / 4;
	private targetYaw = Math.PI / 4;
	/**
	 * When true the rig yaws to keep the car's heading pointing up-screen.
	 *
	 * A fixed isometric yaw looks lovely but inverts the controls for half of
	 * every lap: once the car is driving back toward the viewer, steering
	 * right moves it left across the screen. Following the heading keeps
	 * "press D, go right on screen" true everywhere on the track. Q/E still
	 * work — they now nudge a persistent offset on top of the follow angle.
	 */
	followHeading = true;
	/**
	 * Where the camera sits relative to the car's heading. PI puts it directly
	 * behind, which is what makes the car drive up-screen and keeps "press D,
	 * go right" true; Q/E step this in 45° increments.
	 */
	private headingOffset = Math.PI;
	private viewSize = 20;
	private targetViewSize = 20;
	/** Extra frustum size added at speed (sense of pace without losing the car). */
	private speedZoom = 0;
	private aspect = 16 / 9;
	/** Callback so the rig can keep itself above terrain. */
	groundHeightAt: ((x: number, z: number) => number) | null = null;

	// free camera orbit state
	private freeYaw = Math.PI / 4;
	private freePitch = 0.9;
	private freeDistance = 90;
	private dragging = false;

	constructor() {
		this.iso = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 1500);
		this.free = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);
	}

	get active(): THREE.Camera {
		return this.freeMode ? this.free : this.iso;
	}

	setAspect(aspect: number): void {
		this.aspect = aspect;
		this.free.aspect = aspect;
		this.free.updateProjectionMatrix();
	}

	rotate(direction: -1 | 1): void {
		this.headingOffset += direction * (Math.PI / 4);
		if (!this.followHeading) this.targetYaw += direction * (Math.PI / 4);
	}

	/**
	 * Feed the followed car's heading (radians, atan2(forwardX, forwardZ)).
	 * Ignored while free-look or fixed-yaw mode is active.
	 */
	setFollowHeading(heading: number): void {
		if (this.followHeading) this.targetYaw = heading + this.headingOffset;
	}

	zoomBy(wheelDelta: number): void {
		this.targetViewSize = clamp(this.targetViewSize * (1 + wheelDelta * 0.0011), 14, 90);
	}

	/** Feed the followed vehicle's speed (m/s); subtle zoom-out at pace. */
	setFollowSpeed(speed: number): void {
		// kept subtle — zooming out too far kills the sensation of speed
		this.speedZoom = clamp(speed * 0.1, 0, 5);
	}

	/** Snap everything to the target instantly (spawn / respawn). */
	snap(): void {
		this.smoothedTarget.copy(this.target);
		this.yaw = this.targetYaw;
		this.viewSize = this.targetViewSize;
	}

	/** Reset the manual Q/E offset back to directly behind the car. */
	resetOrientation(): void {
		this.headingOffset = Math.PI;
	}

	update(dt: number): void {
		this.smoothedTarget.x = damp(this.smoothedTarget.x, this.target.x, 0.0001, dt);
		this.smoothedTarget.y = damp(this.smoothedTarget.y, this.target.y, 0.0001, dt);
		this.smoothedTarget.z = damp(this.smoothedTarget.z, this.target.z, 0.0001, dt);
		// heading-follow eases rather than snaps: a rig that tracks the car
		// exactly makes every twitch of the wheel swing the whole world
		this.yaw = dampAngle(this.yaw, this.targetYaw, this.followHeading ? 0.12 : 0.005, dt);
		this.viewSize = damp(this.viewSize, this.targetViewSize + this.speedZoom, 0.02, dt);

		if (this.freeMode) {
			this.updateFree();
			return;
		}

		const offset = new THREE.Vector3(
			Math.sin(this.yaw) * Math.cos(ISO_PITCH),
			Math.sin(ISO_PITCH),
			Math.cos(this.yaw) * Math.cos(ISO_PITCH),
		).multiplyScalar(CAMERA_DISTANCE);

		this.iso.position.copy(this.smoothedTarget).add(offset);
		if (this.groundHeightAt) {
			const minY = this.groundHeightAt(this.iso.position.x, this.iso.position.z) + 4;
			if (this.iso.position.y < minY) this.iso.position.y = minY;
		}
		this.iso.lookAt(this.smoothedTarget);

		const halfH = this.viewSize;
		const halfW = this.viewSize * this.aspect;
		this.iso.left = -halfW;
		this.iso.right = halfW;
		this.iso.top = halfH;
		this.iso.bottom = -halfH;
		this.iso.updateProjectionMatrix();
	}

	private updateFree(): void {
		const offset = new THREE.Vector3(
			Math.sin(this.freeYaw) * Math.cos(this.freePitch),
			Math.sin(this.freePitch),
			Math.cos(this.freeYaw) * Math.cos(this.freePitch),
		).multiplyScalar(this.freeDistance);
		this.free.position.copy(this.smoothedTarget).add(offset);
		this.free.lookAt(this.smoothedTarget);
	}

	/** Pointer-drag orbit for the developer camera. */
	attachFreeControls(element: HTMLElement): () => void {
		const onDown = () => {
			this.dragging = true;
		};
		const onUp = () => {
			this.dragging = false;
		};
		const onMove = (e: PointerEvent) => {
			if (!this.dragging || !this.freeMode) return;
			this.freeYaw -= e.movementX * 0.005;
			this.freePitch = clamp(this.freePitch + e.movementY * 0.005, 0.08, 1.45);
		};
		const onWheel = (e: WheelEvent) => {
			if (!this.freeMode) return;
			this.freeDistance = clamp(this.freeDistance * (1 + e.deltaY * 0.001), 10, 600);
		};
		element.addEventListener("pointerdown", onDown);
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointermove", onMove);
		element.addEventListener("wheel", onWheel, { passive: true });
		return () => {
			element.removeEventListener("pointerdown", onDown);
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointermove", onMove);
			element.removeEventListener("wheel", onWheel);
		};
	}
}
