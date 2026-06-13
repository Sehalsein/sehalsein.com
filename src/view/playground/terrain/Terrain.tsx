"use client";

import { CuboidCollider, HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import {
	Color,
	MeshStandardMaterial,
	PlaneGeometry,
	type Texture,
} from "three";
import { usePlayground } from "../context";
import { DREAM } from "../usePalette";
import { sampleHeight, WORLD_BOUND, WORLD_HALF, WORLD_SIZE } from "./height";
import { getZoneMap } from "./maps";

const COLLIDER_N = 160;

/** pastel meadow material: gradient toward the horizon, painted zones */
function makeGroundMaterial(zoneMap: Texture): MeshStandardMaterial {
	const mat = new MeshStandardMaterial({ color: "#ffffff", roughness: 1 });
	mat.onBeforeCompile = (shader) => {
		shader.uniforms.uZoneMap = { value: zoneMap };
		shader.uniforms.uHalf = { value: WORLD_HALF };
		shader.uniforms.uGrassNear = { value: new Color(DREAM.grassNear) };
		shader.uniforms.uGrassHigh = { value: new Color(DREAM.grassHigh) };
		shader.uniforms.uPath = { value: new Color(DREAM.path) };
		shader.uniforms.uSand = { value: new Color(DREAM.sand) };
		shader.uniforms.uRock = { value: new Color(DREAM.rock) };
		shader.uniforms.uShallows = { value: new Color(DREAM.shallows) };
		shader.vertexShader = shader.vertexShader
			.replace(
				"#include <common>",
				"#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;",
			)
			.replace(
				"#include <begin_vertex>",
				`#include <begin_vertex>
vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWorldNormal = objectNormal;`,
			);
		shader.fragmentShader = shader.fragmentShader
			.replace(
				"#include <common>",
				`#include <common>
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
uniform sampler2D uZoneMap;
uniform float uHalf;
uniform vec3 uGrassNear;
uniform vec3 uGrassHigh;
uniform vec3 uPath;
uniform vec3 uSand;
uniform vec3 uRock;
uniform vec3 uShallows;`,
			)
			.replace(
				"#include <color_fragment>",
				`#include <color_fragment>
{
	vec2 zuv = (vWorldPos.xz + uHalf) / (2.0 * uHalf);
	vec3 zone = texture2D(uZoneMap, zuv).rgb;
	float mottle = fract(sin(dot(floor(vWorldPos.xz * 0.9), vec2(127.1, 311.7))) * 43758.5453);
	// sunlit meadow, brighter on the high shelves
	vec3 grass = mix(uGrassNear, uGrassHigh, smoothstep(1.2, 9.0, vWorldPos.y));
	grass *= 0.94 + 0.12 * mottle;
	// steep faces read as bare rock — the terrace cliffs
	float steep = 1.0 - normalize(vWorldNormal).y;
	vec3 col = mix(grass, uRock * (0.9 + 0.2 * mottle), smoothstep(0.32, 0.55, steep));
	// stone-flag paths with crumbly edges
	float path = smoothstep(0.3, 0.75, zone.r + (mottle - 0.5) * 0.45);
	col = mix(col, uPath * (0.92 + 0.16 * mottle), path);
	col = mix(col, uSand, smoothstep(0.25, 0.8, zone.g));
	// bright shallows ringing the shore, sand below
	col = mix(col, uSand, smoothstep(-0.1, -0.9, vWorldPos.y));
	col = mix(col, uShallows, smoothstep(-0.9, -2.6, vWorldPos.y));
	diffuseColor.rgb = col;
}`,
			);
	};
	mat.customProgramCacheKey = () => "playground-ground";
	return mat;
}

export default function Terrain() {
	const { focused, setFocused } = usePlayground();

	const geometry = useMemo(() => {
		const geo = new PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 300, 300);
		geo.rotateX(-Math.PI / 2);
		const pos = geo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			pos.setY(i, sampleHeight(pos.getX(i), pos.getZ(i)));
		}
		geo.computeVertexNormals();
		return geo;
	}, []);

	const material = useMemo(() => makeGroundMaterial(getZoneMap()), []);

	// rapier heightfield: column-major matrix, rows along z, columns along x
	const heights = useMemo(() => {
		const n = COLLIDER_N;
		const h = new Float32Array((n + 1) * (n + 1));
		for (let i = 0; i <= n; i++) {
			for (let j = 0; j <= n; j++) {
				const x = (j / n - 0.5) * WORLD_SIZE;
				const z = (i / n - 0.5) * WORLD_SIZE;
				h[j * (n + 1) + i] = sampleHeight(x, z);
			}
		}
		return h;
	}, []);

	return (
		<group>
			<mesh
				geometry={geometry}
				material={material}
				receiveShadow
				onClick={() => {
					if (focused) setFocused(null);
				}}
			/>
			<RigidBody type="fixed" colliders={false}>
				<HeightfieldCollider
					args={[
						COLLIDER_N,
						COLLIDER_N,
						Array.from(heights),
						{ x: WORLD_SIZE, y: 1, z: WORLD_SIZE },
					]}
					friction={1}
				/>
				{/* invisible walls so nothing tumbles off the edge of the world */}
				{([
					[WORLD_BOUND, 0, 0, 2, 20, WORLD_BOUND],
					[-WORLD_BOUND, 0, 0, 2, 20, WORLD_BOUND],
					[0, 0, WORLD_BOUND, WORLD_BOUND, 20, 2],
					[0, 0, -WORLD_BOUND, WORLD_BOUND, 20, 2],
				] as const).map(([x, y, z, hx, hy, hz]) => (
					<CuboidCollider key={`${x}:${z}`} args={[hx, hy, hz]} position={[x, y, z]} />
				))}
			</RigidBody>
		</group>
	);
}
