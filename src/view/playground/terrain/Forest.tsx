"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
	Color,
	ConeGeometry,
	CylinderGeometry,
	IcosahedronGeometry,
	type InstancedMesh,
	Matrix4,
	MeshStandardMaterial,
	Quaternion,
	Vector3,
} from "three";
import { DAY, FOLIAGE } from "../usePalette";
import { clearOf, sampleHeight, WORLD_BOUND } from "./height";

/**
 * The ambient woods: hundreds of static trees in three instanced draw
 * calls (trunks, blob canopies, pine canopies). No physics — the knockable
 * trees near the roads live in Flora; these give the world its depth.
 */

type TreeSpot = { x: number; z: number; s: number; pine: boolean };

/* deterministic scatter */
function hash(i: number, salt: number): number {
	let h = Math.imul(i * 1297 + salt, 374761393) ^ Math.imul(salt * 911 + 7, 668265263);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function scatter(): TreeSpot[] {
	const spots: TreeSpot[] = [];
	const put = (x: number, z: number, s: number, pine: boolean) => {
		if (Math.abs(x) > WORLD_BOUND || Math.abs(z) > WORLD_BOUND) return;
		if (!clearOf(x, z, 2.6)) return;
		if (sampleHeight(x, z) < -0.2) return; // no trees in the sea
		spots.push({ x, z, s, pine });
	};
	// global fill out to the fog line
	for (let i = 0; i < 480; i++) {
		const ang = hash(i, 501) * Math.PI * 2;
		const dist = 8 + hash(i, 503) ** 0.7 * 100;
		put(
			Math.cos(ang) * dist,
			Math.sin(ang) * dist,
			0.8 + hash(i, 507) * 1.0,
			hash(i, 509) < 0.25,
		);
	}
	// dense groves: the arcade forest, the highland's pine skirt, coast woods
	const GROVES: [number, number, number, number, number, boolean][] = [
		// [cx, cz, rMin, rMax, count, pine]
		[-45, -25, 7, 20, 120, true], // arcade grove
		[55, -48, 14, 30, 90, true], // highland flanks
		[55, -48, 7, 11, 18, true], // summit crown
		[-12, 66, 4, 20, 70, false], // north meadow woods
		[-62, 4, 4, 16, 60, true], // west coast pines
		[48, 10, 4, 18, 60, false], // east woods, below the highland
		[-18, 38, 5, 12, 30, false], // ring around the spring pool
		[-15, 20, 3, 10, 40, false], // mid-west meadow clump
		[28, 6, 3, 10, 40, false], // east meadow clump
	];
	GROVES.forEach(([cx, cz, r0, r1, count, pine], gi) => {
		for (let i = 0; i < count; i++) {
			const ang = hash(i, 601 + gi * 7) * Math.PI * 2;
			const dist = r0 + hash(i, 613 + gi * 7) ** 0.8 * (r1 - r0);
			put(
				cx + Math.cos(ang) * dist,
				cz + Math.sin(ang) * dist,
				0.7 + hash(i, 617 + gi * 7) * 0.9,
				pine,
			);
		}
	});
	return spots;
}

export default function Forest() {
	const trunks = useRef<InstancedMesh>(null);
	const blobs = useRef<InstancedMesh>(null);
	const pines = useRef<InstancedMesh>(null);

	const uTime = useMemo(() => ({ value: 0 }), []);
	const { spots, blobCount, pineCount, geo, mats } = useMemo(() => {
		const spots = scatter();
		const canopy = new MeshStandardMaterial({ flatShading: true });
		// canopies breathe in the wind, phase-shifted per tree
		canopy.onBeforeCompile = (shader) => {
			shader.uniforms.uTime = uTime;
			shader.vertexShader = shader.vertexShader
				.replace("#include <common>", "#include <common>\nuniform float uTime;")
				.replace(
					"#include <begin_vertex>",
					`#include <begin_vertex>
#ifdef USE_INSTANCING
	vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
	float reach = position.y + 0.7;
	transformed.x += sin(uTime * 1.2 + ip.x * 0.45 + ip.y * 0.3) * 0.05 * reach;
	transformed.z += cos(uTime * 0.9 + ip.x * 0.3 - ip.y * 0.5) * 0.035 * reach;
#endif`,
				);
		};
		canopy.customProgramCacheKey = () => "forest-canopy";
		return {
			spots,
			blobCount: spots.filter((s) => !s.pine).length,
			pineCount: spots.filter((s) => s.pine).length,
			geo: {
				trunk: new CylinderGeometry(0.09, 0.15, 1, 5),
				blob: new IcosahedronGeometry(0.62, 0),
				pine: new ConeGeometry(0.52, 1.5, 6),
			},
			mats: {
				trunk: new MeshStandardMaterial({ color: DAY.trunk, flatShading: true }),
				canopy,
			},
		};
	}, [uTime]);

	useFrame(({ clock }) => {
		uTime.value = clock.elapsedTime;
	});

	useEffect(() => {
		const mat = new Matrix4();
		const pos = new Vector3();
		const quat = new Quaternion();
		const scl = new Vector3();
		const up = new Vector3(0, 1, 0);
		const tint = new Color();
		const PINE_GREENS = ["#4d8a45", "#5e9c4f", "#3f7c40"];
		let bi = 0;
		let pi = 0;
		spots.forEach((t, i) => {
			const y = sampleHeight(t.x, t.z);
			quat.setFromAxisAngle(up, hash(i, 701) * Math.PI * 2);
			// trunk
			pos.set(t.x, y + 0.45 * t.s, t.z);
			scl.set(t.s, t.s * 0.9, t.s);
			mat.compose(pos, quat, scl);
			trunks.current?.setMatrixAt(i, mat);
			// canopy
			if (t.pine) {
				pos.set(t.x, y + 1.25 * t.s, t.z);
				scl.setScalar(t.s);
				mat.compose(pos, quat, scl);
				pines.current?.setMatrixAt(pi, mat);
				pines.current?.setColorAt(
					pi,
					tint.set(PINE_GREENS[i % PINE_GREENS.length]),
				);
				pi++;
			} else {
				pos.set(t.x, y + 1.3 * t.s, t.z);
				scl.setScalar(t.s * (0.9 + hash(i, 703) * 0.4));
				mat.compose(pos, quat, scl);
				blobs.current?.setMatrixAt(bi, mat);
				blobs.current?.setColorAt(bi, tint.set(FOLIAGE[i % FOLIAGE.length]));
				bi++;
			}
		});
		for (const ref of [trunks, blobs, pines]) {
			const m = ref.current;
			if (!m) continue;
			m.instanceMatrix.needsUpdate = true;
			if (m.instanceColor) m.instanceColor.needsUpdate = true;
			m.computeBoundingSphere();
		}
	}, [spots]);

	return (
		<group>
			<instancedMesh
				ref={trunks}
				args={[geo.trunk, mats.trunk, spots.length]}
				castShadow
				receiveShadow
			/>
			<instancedMesh
				ref={blobs}
				args={[geo.blob, mats.canopy, blobCount]}
				castShadow
				receiveShadow
			/>
			<instancedMesh
				ref={pines}
				args={[geo.pine, mats.canopy, pineCount]}
				castShadow
				receiveShadow
			/>
		</group>
	);
}
