"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import {
	Box3,
	type Group,
	type Mesh,
	type MeshStandardMaterial,
	Vector3,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

type GLBProps = {
	src: string;
	/** target size of the model's largest dimension, in world units */
	size?: number;
	rotationY?: number;
	/** override every material's base color (e.g. recolor clouds) */
	tint?: string;
};

/**
 * Drop-in GLTF model: cloned, shadow-enabled, scaled so its largest
 * dimension equals `size`, and re-origined to sit bottom-centered at the
 * local origin — so every poly.pizza asset behaves the same way.
 */
export default function GLB({ src, size = 1, rotationY = 0, tint }: GLBProps) {
	const { scene } = useGLTF(src);
	const { clone, scale, offset } = useMemo(() => {
		const clone = scene.clone(true);
		clone.traverse((o) => {
			const m = o as Mesh;
			if (m.isMesh) {
				m.castShadow = true;
				m.receiveShadow = true;
				if (tint) {
					const mat = (m.material as MeshStandardMaterial).clone();
					mat.color.set(tint);
					m.material = mat;
				}
			}
		});
		const box = new Box3().setFromObject(clone);
		const dims = box.getSize(new Vector3());
		const center = box.getCenter(new Vector3());
		const scale = size / Math.max(dims.x, dims.y, dims.z, 1e-6);
		const offset = new Vector3(-center.x, -box.min.y, -center.z);
		return { clone, scale, offset };
	}, [scene, size, tint]);

	return (
		<group rotation={[0, rotationY, 0]} scale={scale}>
			<primitive object={clone} position={offset.toArray()} />
		</group>
	);
}

export function preloadModels(srcs: string[]) {
	for (const s of srcs) useGLTF.preload(s);
}

/**
 * Like GLB, but clones skinned meshes properly and plays a built-in
 * animation clip (first one matching `clip`, e.g. /idle/ or /walk/).
 */
export function AnimatedGLB({
	src,
	size = 1,
	rotationY = 0,
	clip = /idle/i,
}: GLBProps & { clip?: RegExp }) {
	const group = useRef<Group>(null);
	const { scene, animations } = useGLTF(src);
	const { clone, scale, offset } = useMemo(() => {
		const clone = cloneSkeleton(scene);
		clone.traverse((o) => {
			const m = o as Mesh;
			if (m.isMesh) {
				m.castShadow = true;
				m.receiveShadow = true;
				m.frustumCulled = false; // skinned bounds lag the animation
			}
		});
		const box = new Box3().setFromObject(clone);
		const dims = box.getSize(new Vector3());
		const center = box.getCenter(new Vector3());
		const scale = size / Math.max(dims.x, dims.y, dims.z, 1e-6);
		const offset = new Vector3(-center.x, -box.min.y, -center.z);
		return { clone, scale, offset };
	}, [scene, size]);
	const { actions, names } = useAnimations(animations, group);

	useEffect(() => {
		const name =
			names.find((n) => clip.test(n)) ??
			names.find((n) => /idle/i.test(n)) ??
			names[0];
		const action = name ? actions[name] : null;
		action?.reset().fadeIn(0.2).play();
		return () => {
			action?.fadeOut(0.2);
		};
	}, [actions, names, clip]);

	return (
		<group ref={group} rotation={[0, rotationY, 0]} scale={scale}>
			<primitive object={clone} position={offset.toArray()} />
		</group>
	);
}
