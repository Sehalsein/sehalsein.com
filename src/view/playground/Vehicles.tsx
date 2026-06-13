"use client";

import { useFrame } from "@react-three/fiber";
import {
	CuboidCollider,
	type RapierRigidBody,
	RigidBody,
	useRapier,
} from "@react-three/rapier";
import { useEffect, useRef } from "react";
import type { Group, Object3D, SpotLight } from "three";
import { Quaternion, Vector3 } from "three";
import { createEngine, type Engine } from "./audio/engine";
import { horn, thud } from "./audio/sfx";
import { poseAt } from "./constants";
import { usePlayground } from "./context";
import GLB from "./GLB";
import { emitDust } from "./particles/Dust";
import { useWorldStore } from "./store";
import { sampleHeight, WORLD_BOUND } from "./terrain/height";
import { DAY } from "./usePalette";

/**
 * Raycast-suspension vehicle: a free-tumbling chassis on four sprung
 * wheel rays — engine force on the rear axle, ramped self-centering
 * steering, boost, coast drag, and an auto-flip when it lands on its
 * roof. Vehicle behaviour and tuning adapted from Bruno Simon's
 * folio-2019 (github.com/brunosimon/folio-2019, MIT © 2019 Bruno Simon),
 * re-implemented for rapier.
 */

type Keys = {
	w: boolean;
	s: boolean;
	a: boolean;
	d: boolean;
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
	r: boolean;
	brake: boolean;
	boost: boolean;
	horn: boolean;
};

const KEY_MAP: Record<string, keyof Keys> = {
	w: "w",
	W: "w",
	s: "s",
	S: "s",
	a: "a",
	A: "a",
	d: "d",
	D: "d",
	r: "r",
	R: "r",
	h: "horn",
	H: "horn",
	ArrowUp: "up",
	ArrowDown: "down",
	ArrowLeft: "left",
	ArrowRight: "right",
	" ": "brake",
	Shift: "boost",
};

function useDriveKeys() {
	const keys = useRef<Keys>({
		w: false,
		s: false,
		a: false,
		d: false,
		up: false,
		down: false,
		left: false,
		right: false,
		r: false,
		brake: false,
		boost: false,
		horn: false,
	});
	const { focused } = usePlayground();
	const focusedRef = useRef(focused);
	focusedRef.current = focused;

	useEffect(() => {
		const onKey = (down: boolean) => (e: KeyboardEvent) => {
			if (focusedRef.current) return; // a station has the keyboard
			const phase = useWorldStore.getState().phase;
			if (phase === "loading" || phase === "ready") return;
			const k = KEY_MAP[e.key];
			if (!k) return;
			keys.current[k] = down;
			if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
		};
		const onDown = onKey(true);
		const onUp = onKey(false);
		window.addEventListener("keydown", onDown);
		window.addEventListener("keyup", onUp);
		return () => {
			window.removeEventListener("keydown", onDown);
			window.removeEventListener("keyup", onUp);
		};
	}, []);

	return keys;
}

export default function Vehicles() {
	const keys = useDriveKeys();
	return <Car keys={keys} />;
}

export type CarTelemetry = {
	speed: number;
	speedNorm: number;
	throttle: number;
	drifting: boolean;
	airborne: boolean;
};

/** live driving state, read by the camera rig (fov kick) and audio/dust */
export const carTelemetry: CarTelemetry = {
	speed: 0,
	speedNorm: 0,
	throttle: 0,
	drifting: false,
	airborne: false,
};

/* ── tuning (adapted from folio-2019's vehicle options) ─────────── */
const CAR_MAP: [number, number] = [2.2, -0.6];
/** facing down the village road, not toward the river */
const CAR_YAW = 3.0;
const MASS = 30;
/** wheel anchors in chassis space: [x, y, z] — front is +z */
const WHEELS: [number, number, number][] = [
	[-0.26, -0.12, 0.38], // front left
	[0.26, -0.12, 0.38], // front right
	[-0.26, -0.12, -0.36], // back left
	[0.26, -0.12, -0.36], // back right
];
const WHEEL_RADIUS = 0.14;
const SUSPENSION_REST = 0.16;
const SUSPENSION_TRAVEL = 0.26;
const STIFFNESS = 2600; // spring k
const DAMPING = 150;
const STEER_MAX = Math.PI * 0.17; // ≈30°, folio-2019's controlsSteeringMax
const STEER_SPEED = 3.4; // rad/s ramp, self-centers at the same rate
const ENGINE_FORCE = 150;
const BOOST_FORCE = 260;
const MAX_SPEED = 9.5;
const BOOST_MAX_SPEED = 15;
const GRIP_FRONT = 0.7; // fraction of lateral velocity cancelled per step
const GRIP_REAR = 0.6;
const GRIP_REAR_BRAKE = 0.18; // handbrake loosens the rear — drift
const STEP = 1 / 60; // rapier's fixed timestep, for impulse scaling

/* scratch */
const qChassis = new Quaternion();
const vUp = new Vector3();
const vFwd = new Vector3();
const vRight = new Vector3();
const vAnchor = new Vector3();
const vVel = new Vector3();
const vTmp = new Vector3();
const vTmp2 = new Vector3();
const vImpulse = new Vector3();
const WORLD_UP = new Vector3(0, 1, 0);

function Car({ keys }: { keys: React.RefObject<Keys> }) {
	const { palette, focused, playerPosRef, playerFwdRef, carPosRef } =
		usePlayground();
	const { world, rapier } = useRapier();
	const body = useRef<RapierRigidBody>(null);
	const visual = useRef<Group>(null);
	const spot = useRef<SpotLight>(null);
	const spotTarget = useRef<Object3D>(null);
	const st = useRef({
		steering: 0,
		compressions: [0, 0, 0, 0],
		upsideDownSince: 0,
		hornHeld: false,
		landedAt: 0,
	});
	const dustBudget = useRef(0);
	const engine = useRef<Engine | null>(null);
	const spawn = poseAt(CAR_MAP[0], CAR_MAP[1], CAR_YAW, [0, 0.6, 0]);

	useEffect(() => {
		if (spot.current && spotTarget.current) {
			spot.current.target = spotTarget.current;
		}
		return () => {
			engine.current?.dispose();
			engine.current = null;
		};
	}, []);

	const reset = () => {
		const b = body.current;
		if (!b) return;
		b.setTranslation(
			{ x: spawn.position[0], y: spawn.position[1], z: spawn.position[2] },
			true,
		);
		b.setRotation(
			new Quaternion().setFromAxisAngle(WORLD_UP, CAR_YAW),
			true,
		);
		b.setLinvel({ x: 0, y: 0, z: 0 }, true);
		b.setAngvel({ x: 0, y: 0, z: 0 }, true);
		st.current.steering = 0;
		st.current.upsideDownSince = 0;
	};

	const honk = () => {
		horn();
		const b = body.current;
		if (b) {
			// a cheerful little hop, folio-2019 style
			b.applyImpulse({ x: 0, y: MASS * 0.9, z: 0 }, true);
		}
	};

	useFrame((frame, delta) => {
		const b = body.current;
		if (!b) return;
		const dt = Math.min(delta, 0.05);
		const k = keys.current;
		const s = st.current;
		const active = !focused;
		const t = frame.clock.elapsedTime;

		const p = b.translation();
		if (
			(active && k.r) ||
			Math.abs(p.x) > WORLD_BOUND ||
			Math.abs(p.z) > WORLD_BOUND ||
			p.y < -1.05 || // in the sea or the river
			p.y < sampleHeight(p.x, p.z) - 4 // tunnelled somehow
		) {
			reset();
			return;
		}

		if (active && k.horn && !s.hornHeld) honk();
		s.hornHeld = k.horn;

		const rot = b.rotation();
		qChassis.set(rot.x, rot.y, rot.z, rot.w);
		vUp.set(0, 1, 0).applyQuaternion(qChassis);
		vFwd.set(0, 0, 1).applyQuaternion(qChassis);
		vRight.set(1, 0, 0).applyQuaternion(qChassis);
		const linvel = b.linvel();
		const angvel = b.angvel();
		const speed = Math.hypot(linvel.x, linvel.z);
		const forwardSpeed =
			linvel.x * vFwd.x + linvel.y * vFwd.y + linvel.z * vFwd.z;
		const goingForward = forwardSpeed > 0;

		/* steering: ramp while held, self-center when released */
		const steerInput = active
			? (k.d || k.right ? 1 : 0) - (k.a || k.left ? 1 : 0)
			: 0;
		if (steerInput !== 0) {
			s.steering += steerInput * STEER_SPEED * dt;
		} else {
			const back = STEER_SPEED * dt;
			s.steering =
				Math.abs(s.steering) > back ? s.steering - back * Math.sign(s.steering) : 0;
		}
		s.steering = clampN(s.steering, -STEER_MAX, STEER_MAX);

		/* throttle, speed-gated like folio-2019 */
		const throttle = active
			? (k.w || k.up ? 1 : 0) - (k.s || k.down ? 1 : 0)
			: 0;
		const boost = active && k.boost;
		const maxSpeed = boost ? BOOST_MAX_SPEED : MAX_SPEED;
		const force = boost ? BOOST_FORCE : ENGINE_FORCE;
		let engineForce = 0;
		if (throttle > 0 && (speed < maxSpeed || !goingForward)) engineForce = force;
		if (throttle < 0 && (speed < maxSpeed * 0.5 || goingForward)) {
			engineForce = -force * 0.7;
		}

		/* wheels: suspension + friction + drive, one ray each */
		let wheelsOnGround = 0;
		let rearSlip = 0;
		for (let i = 0; i < 4; i++) {
			const [lx, ly, lz] = WHEELS[i];
			vAnchor
				.set(lx, ly, lz)
				.applyQuaternion(qChassis)
				.add(vTmp.set(p.x, p.y, p.z));
			vTmp2.copy(vUp).negate();
			const ray = new rapier.Ray(
				{ x: vAnchor.x, y: vAnchor.y, z: vAnchor.z },
				{ x: vTmp2.x, y: vTmp2.y, z: vTmp2.z },
			);
			const hit = world.castRay(
				ray,
				SUSPENSION_REST + WHEEL_RADIUS + SUSPENSION_TRAVEL,
				true,
				undefined,
				undefined,
				undefined,
				b,
			);
			if (!hit) {
				s.compressions[i] = 0;
				continue;
			}
			wheelsOnGround++;

			// velocity of the chassis at this wheel
			vVel
				.set(angvel.x, angvel.y, angvel.z)
				.cross(vTmp.copy(vAnchor).sub(vTmp2.set(p.x, p.y, p.z)));
			vVel.add(vTmp.set(linvel.x, linvel.y, linvel.z));

			// spring + damper along the chassis up
			const compression = clampN(
				SUSPENSION_REST + WHEEL_RADIUS - hit.timeOfImpact,
				0,
				SUSPENSION_TRAVEL,
			);
			const compressionSpeed = (compression - s.compressions[i]) / Math.max(dt, 1e-4);
			s.compressions[i] = compression;
			const springForce = clampN(
				STIFFNESS * compression + DAMPING * compressionSpeed,
				0,
				STIFFNESS * SUSPENSION_TRAVEL * 1.6,
			);
			vImpulse.copy(vUp).multiplyScalar(springForce * STEP);

			// steering rotates the front wheels' friction basis
			const steer = i < 2 ? -s.steering : 0;
			vTmp.copy(vRight);
			vTmp2.copy(vFwd);
			if (steer !== 0) {
				vTmp.applyAxisAngle(vUp, steer);
				vTmp2.applyAxisAngle(vUp, steer);
			}

			// lateral grip: cancel sideways velocity at the contact
			const handbrake = active && k.brake;
			const grip =
				i < 2 ? GRIP_FRONT : handbrake ? GRIP_REAR_BRAKE : GRIP_REAR;
			const lateral = vVel.dot(vTmp);
			vImpulse.addScaledVector(vTmp, -lateral * grip * (MASS / 4));
			if (i >= 2) rearSlip = Math.max(rearSlip, Math.abs(lateral));

			// rear axle drives; the handbrake also drags it
			if (i >= 2) {
				if (engineForce !== 0) {
					vImpulse.addScaledVector(vTmp2, engineForce * STEP * 0.5);
				}
				if (handbrake) {
					const along = vVel.dot(vTmp2);
					vImpulse.addScaledVector(vTmp2, -along * 0.18 * (MASS / 4));
				}
			}

			b.applyImpulseAtPoint(
				{ x: vImpulse.x, y: vImpulse.y, z: vImpulse.z },
				{ x: vAnchor.x, y: vAnchor.y, z: vAnchor.z },
				true,
			);
		}

		const grounded = wheelsOnGround > 0;

		/* coast drag, folio-2019's slow-down impulse */
		if (throttle === 0 && grounded && speed > 0.2) {
			vImpulse
				.set(linvel.x, 0, linvel.z)
				.multiplyScalar(-0.045 * MASS * (dt / STEP) * STEP);
			b.applyImpulse({ x: vImpulse.x, y: vImpulse.y, z: vImpulse.z }, true);
		}

		/* upside down? give it a second, then flip it back */
		if (vUp.dot(WORLD_UP) < 0.3 && grounded) {
			if (s.upsideDownSince === 0) s.upsideDownSince = t;
			if (t - s.upsideDownSince > 1.1) {
				b.applyImpulse({ x: 0, y: MASS * 5.5, z: 0 }, true);
				b.applyTorqueImpulse(
					{ x: vFwd.x * MASS * 0.9, y: 0, z: vFwd.z * MASS * 0.9 },
					true,
				);
				s.upsideDownSince = 0;
			}
		} else {
			s.upsideDownSince = 0;
		}

		/* landing feedback */
		if (grounded && carTelemetry.airborne && t - s.landedAt > 0.5) {
			s.landedAt = t;
			if (linvel.y < -4) {
				thud(Math.min(1, -linvel.y / 10));
				emitDust(p.x, p.y - 0.2, p.z, Math.min(10, Math.floor(-linvel.y)), 0.6);
			}
		}

		/* shared state */
		carPosRef.current = { x: p.x, y: p.y, z: p.z };
		if (active) {
			playerPosRef.current = { x: p.x, y: p.y, z: p.z };
			// horizontal heading for the chase camera
			const fl = Math.hypot(vFwd.x, vFwd.z) || 1;
			playerFwdRef.current = { x: vFwd.x / fl, y: 0, z: vFwd.z / fl };
		}
		const signedSpeed = goingForward ? speed : -speed;
		carTelemetry.speed = signedSpeed;
		carTelemetry.speedNorm = Math.min(1, speed / MAX_SPEED);
		carTelemetry.throttle = throttle;
		carTelemetry.drifting = grounded && rearSlip > 2.2 && speed > 3;
		carTelemetry.airborne = !grounded;

		/* engine + dust */
		if (!engine.current) engine.current = createEngine();
		engine.current?.update(
			Math.min(1, speed / MAX_SPEED) + (boost ? 0.15 : 0),
			throttle,
			carTelemetry.drifting,
		);
		if (grounded && speed > 2.5) {
			dustBudget.current +=
				carTelemetry.speedNorm * (carTelemetry.drifting ? 34 : 9) * dt;
			while (dustBudget.current >= 1) {
				dustBudget.current -= 1;
				const side = Math.random() < 0.5 ? -1 : 1;
				emitDust(
					p.x - vFwd.x * 0.5 + vRight.x * 0.26 * side,
					p.y - 0.22,
					p.z - vFwd.z * 0.5 + vRight.z * 0.26 * side,
					1,
					0.18,
				);
			}
		}
	});

	return (
		<RigidBody
			ref={body}
			position={spawn.position}
			rotation={spawn.rotation}
			colliders={false}
			angularDamping={1.2}
			linearDamping={0.05}
			userData={{ vehicle: true }}
		>
			<CuboidCollider args={[0.32, 0.18, 0.52]} mass={MASS} friction={0.4} />
			<group
				ref={visual}
				position={[0, -0.32, 0]}
				onClick={(e) => {
					e.stopPropagation();
					honk();
				}}
			>
				<GLB src="/models/truck.glb" size={1.35} />
				{/* headlights */}
				{[-0.18, 0.18].map((x) => (
					<mesh key={x} position={[x, 0.3, 0.66]}>
						<boxGeometry args={[0.09, 0.06, 0.02]} />
						<meshStandardMaterial
							color={palette.amber}
							emissive={palette.amber}
							emissiveIntensity={2}
						/>
					</mesh>
				))}
			</group>
			<spotLight
				ref={spot}
				position={[0, 0.1, 0.6]}
				color={DAY.cream}
				intensity={2}
				angle={0.55}
				penumbra={0.6}
				distance={6}
				decay={1.6}
			/>
			<object3D ref={spotTarget} position={[0, -0.2, 3]} />
		</RigidBody>
	);
}

const clampN = (v: number, lo: number, hi: number) =>
	Math.min(hi, Math.max(lo, v));
