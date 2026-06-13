"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { AgXToneMapping } from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { blip } from "./audio/sfx";
import { HOME_VIEW, STATION_LIST, STATIONS, type StationId } from "./constants";
import { PlaygroundContext } from "./context";
import IntroOverlay from "./IntroOverlay";
import Scene from "./Scene";
import { useWorldStore } from "./store";
import { usePalette } from "./usePalette";

function useMediaQuery(query: string): boolean {
	const [match, setMatch] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia(query);
		setMatch(mq.matches);
		const onChange = (e: MediaQueryListEvent) => setMatch(e.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, [query]);
	return match;
}

function useWebglSupport(): boolean | null {
	const [ok, setOk] = useState<boolean | null>(null);
	useEffect(() => {
		try {
			const canvas = document.createElement("canvas");
			setOk(Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl")));
		} catch {
			setOk(false);
		}
	}, []);
	return ok;
}

export default function PlaygroundPage() {
	const palette = usePalette();
	const webgl = useWebglSupport();
	const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
	const coarse = useMediaQuery("(pointer: coarse)");
	const [focused, setFocused] = useState<StationId | null>(null);
	const playerPosRef = useRef({ x: 0, y: 0, z: 0 });
	const playerFwdRef = useRef({ x: 0, y: 0, z: 1 });
	const carPosRef = useRef({ x: 0, y: 0, z: 0 });

	const ctx = useMemo(
		() => ({
			palette,
			reducedMotion,
			focused,
			setFocused,
			playerPosRef,
			playerFwdRef,
			carPosRef,
		}),
		[palette, reducedMotion, focused],
	);

	// deep link: /playground?focus=terminal
	useEffect(() => {
		const want = new URLSearchParams(window.location.search).get("focus");
		if (want && want in STATIONS) setFocused(want as StationId);
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setFocused(null);
			if (e.key === "m" || e.key === "M") {
				useWorldStore.getState().toggleMuted();
				blip();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.cursor = "auto";
		};
	}, []);

	// a soft blip whenever a station takes focus
	useEffect(() => {
		if (focused) blip();
	}, [focused]);

	const muted = useWorldStore((s) => s.muted);

	if (webgl === false) return <WebglFallback />;

	const station = focused ? STATIONS[focused] : null;

	return (
		<main className="relative h-full w-full overflow-hidden bg-term-bg text-term-ink antialiased">
			{webgl && (
				<Canvas
					shadows
					dpr={[1, 2]}
					gl={{ toneMapping: AgXToneMapping }}
					camera={{ position: HOME_VIEW.cam, fov: 42 }}
				>
					<PlaygroundContext.Provider value={ctx}>
						<Scene />
					</PlaygroundContext.Provider>
				</Canvas>
			)}
			<div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5">
				<div className="flex items-baseline justify-between">
					<Link
						href="/"
						className="pointer-events-auto rounded border border-term-rule bg-term-bg2/70 px-2 py-1 text-[12px] text-term-blue transition-colors hover:border-term-green hover:text-term-green"
					>
						← home
					</Link>
					<span className="rounded border border-term-rule bg-term-bg2/70 px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-term-dim">
						/playground
					</span>
				</div>
				{station ? (
					<div className="flex items-center justify-center gap-3">
						<button
							type="button"
							onClick={() => setFocused(null)}
							className="pointer-events-auto rounded border border-term-rule bg-term-bg2/80 px-3 py-1.5 text-[11px] text-term-dim transition-colors hover:border-term-green hover:text-term-green"
						>
							← back to the world{" "}
							<span className="text-term-faint">[esc]</span>
						</button>
						<Link
							href={station.href}
							className="pointer-events-auto rounded border border-term-rule bg-term-bg2/80 px-3 py-1.5 text-[11px] text-term-blue transition-colors hover:border-term-green hover:text-term-green"
						>
							open /{station.title} ↗
						</Link>
					</div>
				) : (
					<div className="flex items-end justify-between gap-3">
						<span className="hidden rounded border border-term-rule bg-term-bg2/70 px-3 py-1.5 text-[11px] text-term-faint sm:block">
							{coarse
								? "drag to orbit · tap stations to use them"
								: "wasd drive · space drift · r reset · ram things, they respawn"}
						</span>
						<div className="flex items-center gap-2">
							<span className="rounded border border-term-rule bg-term-bg2/70 px-3 py-1.5 text-[11px] text-term-faint">
								{coarse
									? "pinch to zoom · tap stations"
									: "drag to orbit · click stations to use them"}
							</span>
							<button
								type="button"
								onClick={() => {
									useWorldStore.getState().toggleMuted();
									blip();
								}}
								className="pointer-events-auto rounded border border-term-rule bg-term-bg2/80 px-3 py-1.5 text-[11px] text-term-dim transition-colors hover:border-term-green hover:text-term-green"
							>
								sound: {muted ? "off" : "on"}{" "}
								<span className="text-term-faint">[m]</span>
							</button>
						</div>
					</div>
				)}
			</div>
			<IntroOverlay reducedMotion={reducedMotion} />
		</main>
	);
}

function WebglFallback() {
	return (
		<main className="flex h-full w-full items-center justify-center bg-term-bg p-6 text-term-ink antialiased">
			<div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-term-rule bg-term-bg2/40 p-5 text-[13px]">
				<p className="text-term-red">
					[playground] webgl unavailable on this device
				</p>
				<p className="text-term-dim">
					the world needs webgl. the stations still work the old way:
				</p>
				<ul className="flex flex-col gap-1">
					{STATION_LIST.map((s) => (
						<li key={s.href}>
							<Link
								href={s.href}
								className="text-term-blue underline-offset-4 hover:text-term-green hover:underline"
							>
								→ {s.href}
							</Link>
						</li>
					))}
				</ul>
				<Link
					href="/"
					className="mt-2 border-t border-dashed border-term-rule pt-3 text-[11px] text-term-blue underline-offset-4 hover:underline"
				>
					← home
				</Link>
			</div>
		</main>
	);
}
