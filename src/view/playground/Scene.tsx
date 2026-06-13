"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { Physics } from "@react-three/rapier";
import {
	type ComponentRef,
	type RefObject,
	Suspense,
	useRef,
	useState,
} from "react";
import {
	CatmullRomCurve3,
	type DirectionalLight,
	Object3D,
	Vector3,
} from "three";
import {
	HOME_VIEW,
	STATION_LIST,
	type StationId,
	stationView,
} from "./constants";
import Animals, { type AnimalSpec } from "./Animals";
import { usePlayground } from "./context";
import { preloadModels } from "./GLB";
import { useWorldStore } from "./store";
import Critters from "./Critters";
import Flora from "./Flora";
import Arcade from "./objects/Arcade";
import City from "./City";
import Dust from "./particles/Dust";
import Bookshelf from "./objects/Bookshelf";
import Desk from "./objects/Desk";
import Mailbox from "./objects/Mailbox";
import Monitor from "./objects/Monitor";
import Signpost from "./objects/Signpost";
import SkyDome, { HORIZON, SUN_DIR } from "./SkyDome";
import Forest from "./terrain/Forest";
import Terrain from "./terrain/Terrain";
import Vehicles, { carTelemetry } from "./Vehicles";
import World from "./World";

type Controls = ComponentRef<typeof OrbitControls>;

// kick off every GLB download immediately so the loading screen's progress
// covers the real total and nothing pops in later
preloadModels([
	"/models/adventurer.glb",
	"/models/animated-woman-2.glb",
	"/models/animated-woman.glb",
	"/models/atm.glb",
	"/models/bicycle.glb",
	"/models/big-building.glb",
	"/models/box.glb",
	"/models/brown-building.glb",
	"/models/building-green.glb",
	"/models/building-red-corner.glb",
	"/models/building-red.glb",
	"/models/bus-stop-sign.glb",
	"/models/bus-stop.glb",
	"/models/car-2.glb",
	"/models/car.glb",
	"/models/cloud.glb",
	"/models/cone.glb",
	"/models/cow.glb",
	"/models/dumpster.glb",
	"/models/fence.glb",
	"/models/fire-exit.glb",
	"/models/flower-pot-2.glb",
	"/models/flower-pot.glb",
	"/models/greenhouse.glb",
	"/models/lizard.glb",
	"/models/mailbox.glb",
	"/models/manhole-cover.glb",
	"/models/motorcycle.glb",
	"/models/planter.glb",
	"/models/power-box.glb",
	"/models/rabbit.glb",
	"/models/rock-band-poster.glb",
	"/models/suv.glb",
	"/models/traffic-light.glb",
	"/models/trash-can.glb",
	"/models/truck.glb",
	"/models/van.glb",
	"/models/wolf.glb",
]);

const VIEWS = Object.fromEntries(
	STATION_LIST.map((s) => {
		const v = stationView(s);
		return [
			s.id,
			{ cam: new Vector3(...v.cam), target: new Vector3(...v.target) },
		];
	}),
) as Record<StationId, { cam: Vector3; target: Vector3 }>;

const HERD: AnimalSpec[] = [
	// home meadow cows + a far pair near the campsite
	{ src: "/models/cow.glb", size: 1.3, speed: 0.5, home: [16, 6], range: 5 },
	{ src: "/models/cow.glb", size: 1.2, speed: 0.45, home: [17.5, 4], range: 5 },
	{ src: "/models/cow.glb", size: 1.35, speed: 0.4, home: [14, 8], range: 5 },
	{ src: "/models/cow.glb", size: 1.25, speed: 0.42, home: [-22, -16], range: 5 },
	{ src: "/models/cow.glb", size: 1.28, speed: 0.45, home: [-12, 44], range: 6 },
	{ src: "/models/rabbit.glb", size: 0.35, speed: 1.5, home: [-10, -9], range: 4 },
	{ src: "/models/rabbit.glb", size: 0.32, speed: 1.7, home: [-8.5, -10.5], range: 4 },
	{ src: "/models/rabbit.glb", size: 0.36, speed: 1.4, home: [7, 18], range: 4.5 },
	{ src: "/models/rabbit.glb", size: 0.3, speed: 1.6, home: [8.5, 16], range: 4 },
	{ src: "/models/rabbit.glb", size: 0.33, speed: 1.5, home: [-30, 46], range: 5 },
	{ src: "/models/rabbit.glb", size: 0.31, speed: 1.8, home: [-28, 48], range: 5 },
	{ src: "/models/wolf.glb", size: 1.0, speed: 1.2, home: [-20, 18], range: 9 },
	{ src: "/models/wolf.glb", size: 1.05, speed: 1.1, home: [40, 14], range: 9 },
	{ src: "/models/lizard.glb", size: 0.45, speed: 0.9, home: [5, -12], range: 3 },
	{ src: "/models/lizard.glb", size: 0.4, speed: 0.8, home: [3.5, -13.5], range: 3 },
	{ src: "/models/lizard.glb", size: 0.42, speed: 0.85, home: [50, -42], range: 3.5 }, // sunning on the summit
	// villagers out for a stroll
	{ src: "/models/animated-woman.glb", size: 1.05, speed: 0.7, home: [5, 7], range: 7 },
	{ src: "/models/animated-woman-2.glb", size: 1.05, speed: 0.65, home: [22, 34], range: 6 },
	{ src: "/models/adventurer.glb", size: 1.05, speed: 0.75, home: [-32, 48], range: 6 },
];

const HOME = {
	cam: new Vector3(...HOME_VIEW.cam),
	target: new Vector3(...HOME_VIEW.target),
};

export default function Scene() {
	const { reducedMotion, focused } = usePlayground();
	const phase = useWorldStore((s) => s.phase);
	const [interacted, setInteracted] = useState(false);
	const controls = useRef<Controls>(null);
	const returning = useRef(false);
	const dragging = useRef(false);
	const lastDragEnd = useRef(0);
	// ?nofx skips post-processing; ?no-... flags bisect subsystems
	const q =
		typeof window !== "undefined"
			? new URLSearchParams(window.location.search)
			: new URLSearchParams();
	const nofx = q.has("nofx");

	return (
		<>
			<color attach="background" args={[HORIZON]} />
			{/* ?far pushes the fog out for visual-audit screenshots */}
			<fog
				attach="fog"
				args={q.has("far") ? [HORIZON, 80, 420] : [HORIZON, 30, 105]}
			/>
			<ambientLight intensity={0.5} color="#e8f4ff" />
			<hemisphereLight color="#d6ecff" groundColor="#86b66a" intensity={0.45} />
			<SunLight />
			<directionalLight
				position={[-30, 18, -20]}
				intensity={0.12}
				color="#bcd9f5"
			/>
			{/* SkyDome loads GLB clouds — keep it inside a Suspense boundary, or
			    its suspension mid-flight kills the render loop */}
			{!q.has("no-sky") && (
				<Suspense fallback={null}>
					<SkyDome />
				</Suspense>
			)}
			<OrbitControls
				ref={controls}
				target={[0, 0.5, 0]}
				enabled={!focused && phase === "play"}
				enablePan={false}
				minDistance={1.2}
				maxDistance={34}
				minPolarAngle={0.2}
				maxPolarAngle={Math.PI / 2 - 0.02}
				autoRotate={
					!reducedMotion && !interacted && !focused && phase === "play"
				}
				autoRotateSpeed={0.3}
				onStart={() => {
					setInteracted(true);
					// user grabbed the camera — stop any scripted flight
					returning.current = false;
					dragging.current = true;
				}}
				onEnd={() => {
					dragging.current = false;
					lastDragEnd.current = Date.now();
				}}
			/>
			<CameraRig
				controlsRef={controls}
				returningRef={returning}
				draggingRef={dragging}
				lastDragEndRef={lastDragEnd}
			/>
			<Suspense fallback={null}>
				<Physics gravity={[0, -22, 0]} debug={q.has("dbg-phys")}>
					<Terrain />
					<World />
					<Desk />
					<Monitor />
					<Arcade />
					<Bookshelf />
					<Mailbox />
					<Signpost />
					{!q.has("no-flora") && <Flora />}
					{!q.has("no-city") && <City />}
					<Vehicles />
				</Physics>
				{!q.has("no-animals") && <Animals herd={HERD} />}
			</Suspense>
			{!q.has("no-flora") && <Forest />}
			<Critters />
			<Dust />
			{(nofx || q.has("dbg")) && <DebugStats />}
			{!nofx && (
				<EffectComposer multisampling={4}>
					<Bloom
						mipmapBlur
						intensity={0.65}
						luminanceThreshold={0.85}
						luminanceSmoothing={0.25}
					/>
					<Vignette offset={0.26} darkness={0.55} eskil={false} />
					<Noise premultiply opacity={0.05} />
				</EffectComposer>
			)}
		</>
	);
}

/**
 * Soft key light following the player, aligned with the dome's visible sun
 * so shadows and the sun agree.
 */
function SunLight() {
	const { playerPosRef } = usePlayground();
	const light = useRef<DirectionalLight>(null);
	const target = useRef(new Object3D());

	useFrame(() => {
		const l = light.current;
		if (!l) return;
		const p = playerPosRef.current;
		l.position.set(
			p.x + SUN_DIR.x * 42,
			p.y + SUN_DIR.y * 42 + 6,
			p.z + SUN_DIR.z * 42,
		);
		target.current.position.set(p.x, p.y, p.z);
		target.current.updateMatrixWorld();
		l.target = target.current;
	});

	return (
		<directionalLight
			ref={light}
			position={[23, 36, -23]}
			intensity={1.25}
			color="#fff6e0"
			castShadow
			shadow-mapSize={[2048, 2048]}
			shadow-camera-left={-28}
			shadow-camera-right={28}
			shadow-camera-top={28}
			shadow-camera-bottom={-28}
			shadow-camera-near={2}
			shadow-camera-far={110}
			shadow-bias={-0.0004}
		/>
	);
}

const tmpTarget = new Vector3();
const tmpUp = new Vector3();
const tmpFwd = new Vector3();
const tmpCam = new Vector3();
const lastPlayerPos = new Vector3();

/** ?cam=x,y,z,tx,ty,tz pins the camera for visual audits (probe only) */
const FIXED_CAM: number[] | null = (() => {
	if (typeof window === "undefined") return null;
	const raw = new URLSearchParams(window.location.search).get("cam");
	if (!raw) return null;
	const n = raw.split(",").map(Number);
	return n.length === 6 && n.every((v) => Number.isFinite(v)) ? n : null;
})();

/** the cinematic descent: high over the world, swinging down to the truck */
const INTRO_CURVE = new CatmullRomCurve3([
	new Vector3(0, 55, 70),
	new Vector3(26, 24, 34),
	new Vector3(8, 6, 14),
	new Vector3(...HOME_VIEW.cam),
]);
const INTRO_LOOK_FROM = new Vector3(0, 6, 0);
const INTRO_SECONDS = 3.2;
const easeInOutCubic = (t: number) =>
	t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/**
 * Docks the camera at a focused station, returns it to wherever the user
 * was before (cancellable by grabbing the controls), and chases the active
 * vehicle while it's moving — grab the camera any time, the chase resumes
 * a moment after you let go.
 */
function CameraRig({
	controlsRef,
	returningRef,
	draggingRef,
	lastDragEndRef,
}: {
	controlsRef: RefObject<Controls | null>;
	returningRef: RefObject<boolean>;
	draggingRef: RefObject<boolean>;
	lastDragEndRef: RefObject<number>;
}) {
	const { focused, reducedMotion, playerPosRef, playerFwdRef } =
		usePlayground();
	const prev = useRef<StationId | null>(null);
	const preFocus = useRef<{ cam: Vector3; target: Vector3 } | null>(null);
	const fovKick = useRef(0);
	const introT = useRef(0);
	const phase = useWorldStore((s) => s.phase);
	const setPhase = useWorldStore((s) => s.setPhase);

	useFrame(({ camera }, delta) => {
		const controls = controlsRef.current;
		if (!controls) return;

		if (FIXED_CAM) {
			camera.position.set(FIXED_CAM[0], FIXED_CAM[1], FIXED_CAM[2]);
			camera.lookAt(FIXED_CAM[3], FIXED_CAM[4], FIXED_CAM[5]);
			return;
		}

		if (phase === "intro") {
			introT.current = Math.min(1, introT.current + delta / INTRO_SECONDS);
			const t = easeInOutCubic(introT.current);
			camera.position.copy(INTRO_CURVE.getPoint(t));
			const p = playerPosRef.current;
			tmpTarget.set(p.x, p.y + 0.5, p.z);
			controls.target.lerpVectors(INTRO_LOOK_FROM, tmpTarget, t);
			controls.update();
			if (introT.current >= 1) setPhase("play");
			return;
		}

		// the world rushes a little wider at speed
		if (!reducedMotion && "fov" in camera) {
			const want = focused
				? 0
				: 9 * carTelemetry.speedNorm +
					(carTelemetry.drifting ? 2 : 0) +
					(carTelemetry.airborne ? 3 : 0);
			fovKick.current += (want - fovKick.current) * Math.min(1, 3.5 * delta);
			const fov = 42 + fovKick.current;
			if (Math.abs((camera.fov as number) - fov) > 0.01) {
				camera.fov = fov;
				camera.updateProjectionMatrix();
			}
		}
		if (focused !== prev.current) {
			if (focused && !prev.current) {
				// remember where the user was so "back" doesn't teleport home
				preFocus.current = {
					cam: camera.position.clone(),
					target: controls.target.clone(),
				};
			}
			if (!focused) returningRef.current = true;
			prev.current = focused;
		}
		const back = preFocus.current ?? HOME;
		const view = focused
			? VIEWS[focused]
			: returningRef.current
				? back
				: null;
		if (view) {
			const k = reducedMotion ? 1 : 1 - Math.exp(-5 * delta);
			camera.position.lerp(view.cam, k);
			controls.target.lerp(view.target, k);
			controls.update();
			if (
				returningRef.current &&
				camera.position.distanceTo(view.cam) < 0.05
			) {
				returningRef.current = false;
			}
			return;
		}

		const p = playerPosRef.current;
		tmpTarget.set(p.x, p.y, p.z);
		const speed = lastPlayerPos.distanceTo(tmpTarget) / Math.max(delta, 1e-4);
		lastPlayerPos.copy(tmpTarget);
		if (speed >= 60) return; // teleport/reset frame, don't chase it

		// target always tracks the vehicle once it's moving
		if (speed > 0.8) {
			controls.target.lerp(tmpTarget, Math.min(1, 3 * delta));
			controls.update();
		}

		// chase from behind unless the user is (or just was) orbiting
		const userBusy =
			draggingRef.current || Date.now() - lastDragEndRef.current < 1400;
		if (!userBusy && speed > 1.2) {
			const f = playerFwdRef.current;
			tmpFwd.set(f.x, f.y, f.z);
			tmpUp.set(0, 1, 0);
			tmpCam
				.copy(tmpTarget)
				.addScaledVector(tmpFwd, -5.5)
				.addScaledVector(tmpUp, 2.2);
			// the chase tightens with speed — and hangs back during a jump
			// so the arc plays out in frame
			const stiffness = carTelemetry.airborne
				? 1.1
				: 1.8 + 1.4 * carTelemetry.speedNorm;
			camera.position.lerp(tmpCam, Math.min(1, stiffness * delta));
			controls.update();
		}
	});

	return null;
}

declare global {
	interface Window {
		__dbg?: {
			frames: number;
			t: number;
			player: { x: number; y: number; z: number };
			calls: number;
			tris: number;
			speed: number;
			airborne: boolean;
			throttle: number;
		};
	}
}

/** writes a tiny state snapshot for the headless probe (?dbg / ?nofx) */
function DebugStats() {
	const { playerPosRef } = usePlayground();
	const frames = useRef(0);

	useFrame(({ gl, clock }) => {
		frames.current++;
		window.__dbg = {
			frames: frames.current,
			t: clock.elapsedTime,
			player: { ...playerPosRef.current },
			calls: gl.info.render.calls,
			tris: gl.info.render.triangles,
			speed: carTelemetry.speed,
			airborne: carTelemetry.airborne,
			throttle: carTelemetry.throttle,
		};
	});

	return null;
}
