import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { PropKind } from "../../procedural/types";

/**
 * One merged low-poly geometry per prop kind, shared by every instance.
 * Geometry that should take the biome tint (instance color) is the "primary"
 * geometry; fixed-color parts (trunks) are a second geometry.
 */
export interface PropGeometry {
	/** Tinted via per-instance color. */
	primary: THREE.BufferGeometry;
	primaryRoughness: number;
	/** Optional untinted secondary part with its own material color. */
	secondary?: THREE.BufferGeometry;
	secondaryColor?: string;
}

function cone(radius: number, height: number, y: number, segments = 7): THREE.BufferGeometry {
	const geo = new THREE.ConeGeometry(radius, height, segments);
	geo.translate(0, y, 0);
	return geo;
}

export function buildPropGeometry(kind: PropKind): PropGeometry {
	switch (kind) {
		case "pine":
		case "pineSnow": {
			const layers = mergeGeometries([cone(1.6, 2.6, 2.6), cone(1.25, 2.2, 4.1), cone(0.9, 1.8, 5.4)]);
			const trunk = new THREE.CylinderGeometry(0.28, 0.36, 1.6, 6);
			trunk.translate(0, 0.8, 0);
			return {
				primary: layers,
				primaryRoughness: 0.85,
				secondary: trunk,
				secondaryColor: kind === "pineSnow" ? "#6b544a" : "#7a5a43",
			};
		}
		case "cactus": {
			const trunk = new THREE.CylinderGeometry(0.45, 0.55, 3.4, 7);
			trunk.translate(0, 1.7, 0);
			// arms: pivot at the base (translate up half-length AFTER rotating
			// around origin), then attach to the trunk
			const armA = new THREE.CylinderGeometry(0.28, 0.3, 1.5, 6);
			armA.translate(0, 0.75, 0);
			armA.rotateZ(-Math.PI / 5);
			armA.translate(0.5, 1.9, 0);
			const armB = new THREE.CylinderGeometry(0.24, 0.28, 1.2, 6);
			armB.translate(0, 0.6, 0);
			armB.rotateZ(Math.PI / 5);
			armB.translate(-0.5, 1.5, 0);
			return { primary: mergeGeometries([trunk, armA, armB]), primaryRoughness: 0.8 };
		}
		case "bush": {
			const geo = new THREE.IcosahedronGeometry(1.1, 0);
			geo.scale(1, 0.75, 1);
			geo.translate(0, 0.7, 0);
			return { primary: geo, primaryRoughness: 0.9 };
		}
		case "rock": {
			const geo = new THREE.IcosahedronGeometry(0.9, 0);
			geo.scale(1.2, 0.8, 1);
			geo.translate(0, 0.5, 0);
			return { primary: geo, primaryRoughness: 0.95 };
		}
		case "boulder": {
			const geo = new THREE.IcosahedronGeometry(1.6, 1);
			geo.scale(1.25, 0.95, 1.05);
			geo.translate(0, 1.0, 0);
			return { primary: geo, primaryRoughness: 0.95 };
		}
	}
}

/** Rocks/boulders ignore the vegetation palette and use neutral grays. */
export function propUsesPalette(kind: PropKind): boolean {
	return kind === "pine" || kind === "pineSnow" || kind === "cactus" || kind === "bush";
}

export function neutralPropColor(kind: PropKind, tint: number): THREE.Color {
	const grays = ["#8d8f94", "#9aa0a6", "#7d8087", "#a8a9ad"];
	const color = new THREE.Color(grays[tint % grays.length]);
	if (kind === "boulder") color.multiplyScalar(0.92);
	return color;
}
