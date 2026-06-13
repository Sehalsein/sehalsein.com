"use client";

import { useProgress } from "@react-three/drei";
import { useEffect } from "react";
import clsx from "clsx";
import { startAmbience } from "./audio/ambience";
import { unlockAudio } from "./audio/audio";
import { useWorldStore } from "./store";

/**
 * Terminal-styled boot screen over the canvas: live asset progress, then a
 * "press W to start" gate whose first gesture also unlocks WebAudio, then a
 * fade-out while the camera sweeps down to the truck.
 */
export default function IntroOverlay({
	reducedMotion,
}: {
	reducedMotion: boolean;
}) {
	const { progress, active, loaded, total } = useProgress();
	const phase = useWorldStore((s) => s.phase);
	const setPhase = useWorldStore((s) => s.setPhase);

	// deep links and the probe skip the ceremony entirely
	useEffect(() => {
		const q = new URLSearchParams(window.location.search);
		if (q.has("skip-intro") || q.get("focus")) setPhase("play");
	}, [setPhase]);

	useEffect(() => {
		if (phase === "loading" && progress >= 100 && !active) {
			setPhase("ready");
		}
	}, [phase, progress, active, setPhase]);

	// the start gate: first W / click / tap unlocks audio and rolls the intro
	useEffect(() => {
		if (phase !== "ready") return;
		const start = () => {
			unlockAudio();
			startAmbience();
			setPhase(reducedMotion ? "play" : "intro");
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === "w" || e.key === "Enter" || e.key === " ") {
				start();
			}
		};
		window.addEventListener("keydown", onKey);
		window.addEventListener("pointerdown", start);
		return () => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("pointerdown", start);
		};
	}, [phase, reducedMotion, setPhase]);

	// any gesture mid-sweep hands the wheel over immediately
	useEffect(() => {
		if (phase !== "intro") return;
		const skip = () => setPhase("play");
		window.addEventListener("keydown", skip);
		window.addEventListener("pointerdown", skip);
		return () => {
			window.removeEventListener("keydown", skip);
			window.removeEventListener("pointerdown", skip);
		};
	}, [phase, setPhase]);

	const gone = phase === "intro" || phase === "play";

	return (
		<div
			className={clsx(
				"absolute inset-0 z-20 flex items-center justify-center bg-term-bg font-mono text-[13px] transition-opacity duration-500",
				gone && "pointer-events-none opacity-0",
			)}
			aria-hidden={gone}
		>
			<div className="flex w-72 flex-col gap-1.5 text-term-dim">
				<p className="text-term-green">› sehalsein.com/playground</p>
				<p>› mounting terrain… ok</p>
				<p>
					› loading assets…{" "}
					<span className="text-term-ink">{Math.floor(progress)}%</span>
					<span className="text-term-faint">
						{" "}
						({loaded}/{Math.max(total, loaded)})
					</span>
				</p>
				<div className="h-px w-full overflow-hidden bg-term-rule">
					<div
						className="h-px bg-term-green transition-[width] duration-300"
						style={{ width: `${Math.floor(progress)}%` }}
					/>
				</div>
				{phase === "ready" ? (
					<p className="mt-3 animate-pulse text-term-ink">
						press <span className="text-term-green">W</span> or click to start
					</p>
				) : (
					<p className="mt-3">
						<span className="inline-block h-3.5 w-2 animate-pulse bg-term-green align-middle" />
					</p>
				)}
			</div>
		</div>
	);
}
