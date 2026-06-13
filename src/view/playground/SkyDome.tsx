"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import {
	BackSide,
	Color,
	type Group,
	type Mesh,
	ShaderMaterial,
	Vector3,
} from "three";
import { usePlayground } from "./context";
import GLB from "./GLB";
import { DREAM } from "./usePalette";

/**
 * THE shared atmosphere constant: the dome's horizon band, the scene fog,
 * and the canvas background all use this color so they melt into each other.
 */
export const HORIZON = DREAM.horizon;

/** matches the key light direction in Scene — shadows agree with the sun */
export const SUN_DIR = new Vector3(0.45, 0.72, -0.45).normalize();

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
	vDir = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragment = /* glsl */ `
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uSunDir;
uniform vec3 uSunCore;
varying vec3 vDir;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
	vec3 d = normalize(vDir);
	float h = clamp(d.y, 0.0, 1.0);
	// below the horizon, hold the horizon color so the ground fog matches
	vec3 col = mix(uHorizon, uZenith, pow(h, 0.6));
	float s = distance(d, uSunDir);
	// soft daylight disc, >1.0 channels so bloom catches it
	col = mix(col, uSunCore, smoothstep(0.065, 0.045, s));
	// gentle halo
	col += vec3(1.0, 0.97, 0.9) * 0.25 * exp(-s * 4.0);
	// dither kills gradient banding
	col += (hash(gl_FragCoord.xy) - 0.5) * 0.015;
	gl_FragColor = vec4(col, 1.0);
}
`;

/** clouds ring the horizon and drift; the zenith stays clean */
const CLOUDS = [
	{ y: 24, z: -78, speed: 0.5, scale: 6.5, offset: 0 },
	{ y: 32, z: 64, speed: 0.36, scale: 5.2, offset: 40 },
	{ y: 20, z: 96, speed: 0.42, scale: 4.4, offset: 110 },
	{ y: 38, z: -52, speed: 0.3, scale: 6.0, offset: 75 },
	{ y: 27, z: 44, speed: 0.26, scale: 3.6, offset: 170 },
	{ y: 22, z: -104, speed: 0.46, scale: 5.6, offset: 205 },
	{ y: 34, z: 84, speed: 0.33, scale: 4.8, offset: 140 },
	{ y: 42, z: -30, speed: 0.22, scale: 7.0, offset: 250 },
	{ y: 18, z: 58, speed: 0.55, scale: 3.2, offset: 22 },
];

export default function SkyDome() {
	const dome = useRef<Mesh>(null);
	const { reducedMotion } = usePlayground();
	const q =
		typeof window !== "undefined"
			? new URLSearchParams(window.location.search)
			: new URLSearchParams();

	const material = useMemo(
		() =>
			new ShaderMaterial({
				vertexShader: skyVertex,
				fragmentShader: skyFragment,
				uniforms: {
					uHorizon: { value: new Color(HORIZON) },
					uZenith: { value: new Color(DREAM.zenith) },
					uSunDir: { value: SUN_DIR },
					uSunCore: { value: new Vector3(1.6, 1.35, 1.1) },
				},
				side: BackSide,
				depthWrite: false,
				fog: false,
			}),
		[],
	);

	useFrame(({ camera }) => {
		// the dome follows the camera so its edge never comes into view
		dome.current?.position.set(camera.position.x, 0, camera.position.z);
	});

	return (
		<group>
			<mesh ref={dome} material={material} renderOrder={-1}>
				<sphereGeometry args={[380, 32, 24]} />
			</mesh>
			{!q.has("no-clouds") && (
				<Suspense fallback={null}>
					{CLOUDS.map((c) => (
						<Cloud key={c.offset} {...c} still={reducedMotion} />
					))}
				</Suspense>
			)}
		</group>
	);
}

function Cloud({
	y,
	z,
	speed,
	scale,
	offset,
	still,
}: {
	y: number;
	z: number;
	speed: number;
	scale: number;
	offset: number;
	still?: boolean;
}) {
	const group = useRef<Group>(null);

	useFrame(({ clock }) => {
		if (!group.current) return;
		const t = still ? 0 : clock.elapsedTime;
		group.current.position.x = ((t * speed + offset) % 280) - 140;
	});

	return (
		<group ref={group} position={[0, y, z]}>
			<GLB src="/models/cloud.glb" size={scale} tint={DREAM.cloud} />
		</group>
	);
}
