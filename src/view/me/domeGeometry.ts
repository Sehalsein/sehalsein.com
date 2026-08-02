/**
 * The dome the sticker is mapped onto.
 *
 * A flat plane under an orthographic camera only ever produces a symmetric
 * `cos θ` squash when it turns — that reads as a sticker sliding, not a head
 * turning. Bulging the plane into a shallow ellipsoidal cap and viewing it
 * through a narrow-FOV perspective camera gives real foreshortening: the near
 * cheek widens, the far cheek compresses, and the features shift against the
 * silhouette. That is the whole trick.
 */

import * as THREE from "three";
import { smoothstep } from "./math";

/** World size of the sticker quad. Square, because the art is square. */
export const HEAD_W = 2;
export const HEAD_H = 2;

/**
 * Peak displacement, as a fraction of the head width.
 * Below ~0.18 the turn reads flat; above ~0.35 the planar UVs visibly stretch
 * at the rim, because a bulge is a stretch when the mapping stays planar.
 */
export const BULGE = 0.26;

const SEGMENTS = 72;

export interface SurfaceSample {
	position: THREE.Vector3;
	normal: THREE.Vector3;
}

function heightAt(nx: number, ny: number): number {
	// slightly wider than the art so the corners land at z≈0 rather than being
	// clipped part-way down the slope
	const q = 1 - (nx / 1.06) ** 2 - (ny / 1.14) ** 2;
	let cap = q > 0 ? Math.sqrt(q) : 0;
	// soften the rim so the silhouette edge isn't a hard crease
	cap = smoothstep(0, 1, cap);
	// forehead forward, chin receding — the cheap "this is a head" cue
	const tilt = -0.1 * ny;
	return BULGE * cap + BULGE * tilt * cap;
}

/**
 * Where UV (u,v) lands in 3D, and which way the surface faces there.
 *
 * The single source of truth for the dome's shape: called once per vertex when
 * building the geometry, and again at runtime to place the eye quads. Sharing
 * it is why an overlay can never drift off the surface.
 */
export function surfacePoint(u: number, v: number): SurfaceSample {
	const nx = (u - 0.5) * 2;
	const ny = (v - 0.5) * 2;
	const position = new THREE.Vector3(
		(nx * HEAD_W) / 2,
		(ny * HEAD_H) / 2,
		heightAt(nx, ny),
	);

	// Analytic-ish normal by central difference on the same closed form.
	// `computeVertexNormals()` also works but facets badly at the rim where the
	// cap clamps to zero.
	const e = 1e-3;
	const dzdx = (heightAt(nx + e, ny) - heightAt(nx - e, ny)) / (2 * e);
	const dzdy = (heightAt(nx, ny + e) - heightAt(nx, ny - e)) / (2 * e);
	// tangents in world units: d/dnx scales by HEAD_W/2, d/dny by HEAD_H/2
	const normal = new THREE.Vector3(
		(-dzdx * 2) / HEAD_W,
		(-dzdy * 2) / HEAD_H,
		1,
	).normalize();

	return { position, normal };
}

/** The displaced, correctly-normalled plane. ~10k triangles. */
export function buildDome(): THREE.BufferGeometry {
	const geo = new THREE.PlaneGeometry(HEAD_W, HEAD_H, SEGMENTS, SEGMENTS);
	const pos = geo.attributes.position as THREE.BufferAttribute;
	const nrm = geo.attributes.normal as THREE.BufferAttribute;
	const uv = geo.attributes.uv as THREE.BufferAttribute;

	for (let i = 0; i < pos.count; i++) {
		const s = surfacePoint(uv.getX(i), uv.getY(i));
		pos.setXYZ(i, s.position.x, s.position.y, s.position.z);
		nrm.setXYZ(i, s.normal.x, s.normal.y, s.normal.z);
	}
	pos.needsUpdate = true;
	nrm.needsUpdate = true;
	geo.computeBoundingSphere();
	return geo;
}
