"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
	BufferAttribute,
	BufferGeometry,
	CanvasTexture,
	ShaderMaterial,
} from "three";

const MAX = 160;
const LIFE = 0.9; // seconds

type Particle = {
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
	life: number; // 1 → 0
	size: number;
};

const pool: Particle[] = Array.from({ length: MAX }, () => ({
	x: 0,
	y: -999,
	z: 0,
	vx: 0,
	vy: 0,
	vz: 0,
	life: 0,
	size: 1,
}));
let cursor = 0;
let mounted = false;

/**
 * Kick up `n` puffs of dust at a world position. Shared pool: rear wheels,
 * prop impacts and station rams all draw from the same 160 particles.
 * No-ops until the <Dust /> system is mounted.
 */
export function emitDust(
	x: number,
	y: number,
	z: number,
	n = 4,
	spread = 0.4,
): void {
	if (!mounted) return;
	for (let i = 0; i < n; i++) {
		const p = pool[cursor];
		cursor = (cursor + 1) % MAX;
		p.x = x + (Math.random() - 0.5) * spread;
		p.y = y + Math.random() * 0.1;
		p.z = z + (Math.random() - 0.5) * spread;
		p.vx = (Math.random() - 0.5) * 1.2;
		p.vy = 0.6 + Math.random() * 0.9;
		p.vz = (Math.random() - 0.5) * 1.2;
		p.life = 1;
		p.size = 0.7 + Math.random() * 0.7;
	}
}

function makeSprite(): CanvasTexture {
	const c = document.createElement("canvas");
	c.width = 64;
	c.height = 64;
	const g = c.getContext("2d");
	if (g) {
		const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
		grad.addColorStop(0, "rgba(255,255,255,1)");
		grad.addColorStop(0.55, "rgba(255,255,255,0.55)");
		grad.addColorStop(1, "rgba(255,255,255,0)");
		g.fillStyle = grad;
		g.fillRect(0, 0, 64, 64);
	}
	return new CanvasTexture(c);
}

const vertex = /* glsl */ `
attribute float aLife;
attribute float aSize;
varying float vLife;
void main() {
	vLife = aLife;
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	// puffs swell as they fade
	gl_PointSize = aSize * (1.6 - aLife) * 90.0 / max(1.0, -mv.z);
	gl_Position = projectionMatrix * mv;
}
`;

const fragment = /* glsl */ `
uniform sampler2D uTex;
uniform vec3 uColor;
varying float vLife;
void main() {
	float a = texture2D(uTex, gl_PointCoord).a * vLife * 0.55;
	if (a < 0.01) discard;
	gl_FragColor = vec4(uColor, a);
}
`;

/** pooled soft-sprite dust, driven imperatively via emitDust() */
export default function Dust() {
	const { geometry, material } = useMemo(() => {
		const geometry = new BufferGeometry();
		geometry.setAttribute(
			"position",
			new BufferAttribute(new Float32Array(MAX * 3), 3),
		);
		geometry.setAttribute("aLife", new BufferAttribute(new Float32Array(MAX), 1));
		geometry.setAttribute("aSize", new BufferAttribute(new Float32Array(MAX), 1));
		const material = new ShaderMaterial({
			vertexShader: vertex,
			fragmentShader: fragment,
			uniforms: {
				uTex: { value: makeSprite() },
				uColor: { value: [0.93, 0.85, 0.72] }, // pastel tan
			},
			transparent: true,
			depthWrite: false,
		});
		return { geometry, material };
	}, []);

	useEffect(() => {
		mounted = true;
		return () => {
			mounted = false;
		};
	}, []);

	useFrame((_, delta) => {
		const dt = Math.min(delta, 0.05);
		const pos = geometry.attributes.position as BufferAttribute;
		const life = geometry.attributes.aLife as BufferAttribute;
		const size = geometry.attributes.aSize as BufferAttribute;
		const damp = Math.exp(-2.2 * dt);
		for (let i = 0; i < MAX; i++) {
			const p = pool[i];
			if (p.life > 0) {
				p.life -= dt / LIFE;
				p.vx *= damp;
				p.vz *= damp;
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.z += p.vz * dt;
			}
			pos.setXYZ(i, p.x, p.life > 0 ? p.y : -999, p.z);
			life.setX(i, Math.max(0, p.life));
			size.setX(i, p.size);
		}
		pos.needsUpdate = true;
		life.needsUpdate = true;
		size.needsUpdate = true;
	});

	return <points geometry={geometry} material={material} frustumCulled={false} />;
}
