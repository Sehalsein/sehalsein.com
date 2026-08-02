/**
 * The face material — one small shader that does the pose cross-fade *and* the
 * lighting.
 *
 * `MeshStandardMaterial` is wrong here: Memoji art is flat and saturated, and a
 * PBR pipeline plus ACES tone mapping turns it to mud. `MeshBasicMaterial` is
 * also wrong: an unshaded dome makes the whole geometric trick invisible. So:
 * a hand-rolled ambient + lambert + Fresnel rim, with no `THREE.Light` objects
 * anywhere in the scene. Uniforms are trivially deterministic for the headless
 * probe, and "the key light follows the palette" becomes a uniform write.
 *
 * Alpha is the detail that otherwise produces a dark halo around the sticker:
 * straight-alpha PNGs carry black RGB in fully transparent texels, and
 * mipmapping bleeds it into the edge. The fix is premultiplied alpha on BOTH
 * the texture upload and the material — one without the other looks worse than
 * neither. Premultiplication is also what makes the two-pose `mix()` linearly
 * correct instead of ghosting mid-fade.
 */

import * as THREE from "three";

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vNormalV = normalize(normalMatrix * normal);
  vViewDir = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMapA;
uniform sampler2D uMapB;
uniform float uMix;
uniform vec3  uKeyDir;
uniform vec3  uKeyColor;
uniform float uKeyStrength;
uniform float uAmbient;
uniform vec3  uRimColor;
uniform float uRimStrength;
uniform vec3  uTint;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewDir;

void main() {
  vec4 a = texture2D(uMapA, vUv);
  vec4 b = texture2D(uMapB, vUv);
  // linear mix is only correct because both textures are premultiplied
  vec4 c = mix(a, b, uMix);
  if (c.a < 0.02) discard;

  vec3 N = normalize(vNormalV);
  float lambert = max(dot(N, uKeyDir), 0.0);
  float rim = pow(1.0 - max(dot(N, normalize(vViewDir)), 0.0), 2.5);

  vec3 rgb = c.rgb * uTint * (uAmbient + uKeyStrength * lambert * uKeyColor);
  rgb += uRimColor * rim * uRimStrength * c.a;

  // scale rgb by opacity too — the output stays premultiplied
  gl_FragColor = vec4(rgb * uOpacity, c.a * uOpacity);

  #include <colorspace_fragment>
}
`;

export interface FaceUniforms {
	uMapA: { value: THREE.Texture | null };
	uMapB: { value: THREE.Texture | null };
	uMix: { value: number };
	uKeyDir: { value: THREE.Vector3 };
	uKeyColor: { value: THREE.Color };
	uKeyStrength: { value: number };
	uAmbient: { value: number };
	uRimColor: { value: THREE.Color };
	uRimStrength: { value: number };
	uTint: { value: THREE.Color };
	uOpacity: { value: number };
}

export const RIM_BASE = 0.35;
export const RIM_FLASH = 1.0;

export function createFaceMaterial(): THREE.ShaderMaterial & { uniforms: FaceUniforms } {
	const uniforms: FaceUniforms = {
		uMapA: { value: null },
		uMapB: { value: null },
		uMix: { value: 0 },
		// view space, which for a static camera at +Z is effectively world space:
		// upper-left and slightly in front
		uKeyDir: { value: new THREE.Vector3(-0.35, 0.45, 0.82).normalize() },
		uKeyColor: { value: new THREE.Color(1, 1, 1) },
		uKeyStrength: { value: 0.22 },
		uAmbient: { value: 0.92 },
		uRimColor: { value: new THREE.Color("#9ece6a") },
		uRimStrength: { value: RIM_BASE },
		uTint: { value: new THREE.Color(1, 1, 1) },
		uOpacity: { value: 1 },
	};

	const material = new THREE.ShaderMaterial({
		uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
		vertexShader,
		fragmentShader,
		transparent: true,
		premultipliedAlpha: true,
		depthWrite: true,
		depthTest: true,
		side: THREE.FrontSide,
		toneMapped: false,
	});

	return material as THREE.ShaderMaterial & { uniforms: FaceUniforms };
}
