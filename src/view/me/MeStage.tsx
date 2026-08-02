"use client";

import { useEffect, useRef, useState } from "react";
import type { PoseId } from "./poses";
import "./me.css";

/**
 * Mounts the Memoji stage into a plain host div. React owns the host and
 * nothing inside it — the stage builds its own canvas — mirroring
 * `src/view/racer/RacerCanvas.tsx`.
 *
 * `?nogl=1` forces the 2D fallback. Blocking WebGL in headless Chromium is
 * unreliable, so this is a deliberate seam that lets the probe assert the
 * fallback actually renders.
 */
export default function MeStage({ availablePoses }: { availablePoses: PoseId[] }) {
	const hostRef = useRef<HTMLDivElement>(null);
	const fallbackRef = useRef<HTMLCanvasElement>(null);
	const poses = useRef(availablePoses);
	const booted = useRef(false);
	const [mode, setMode] = useState<"pending" | "gl" | "fallback">("pending");

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		let disposed = false;

		void (async () => {
			const { hasWebGL, bootMe } = await import("./boot");
			if (disposed) return;
			if (new URLSearchParams(window.location.search).has("nogl") || !hasWebGL()) {
				setMode("fallback");
				return;
			}
			setMode("gl");
			booted.current = true;
			await bootMe(host, poses.current);
		})();

		return () => {
			disposed = true;
			if (!booted.current) return;
			booted.current = false;
			void import("./boot").then((m) => m.disposeMe());
		};
	}, []);

	// The no-WebGL path paints the same stand-in artwork with Canvas2D, so there
	// is never a second implementation of the face to keep in sync.
	useEffect(() => {
		if (mode !== "fallback") return;
		const canvas = fallbackRef.current;
		if (!canvas) return;
		let cancelled = false;
		void import("./standin").then(({ drawStandin }) => {
			if (cancelled) return;
			const size = Math.min(640, Math.round(canvas.clientWidth * (window.devicePixelRatio || 1)));
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext("2d");
			if (ctx) drawStandin(ctx, "neutral", size, { pupils: true });
		});
		return () => {
			cancelled = true;
		};
	}, [mode]);

	return (
		<figure className="me-figure">
			<div
				ref={hostRef}
				className={`me-host${mode === "fallback" ? " is-fallback" : ""}`}
			>
				{mode === "fallback" ? (
					<canvas ref={fallbackRef} className="me-fallback" aria-hidden="true" />
				) : null}
			</div>
			<figcaption className="me-caption">
				{mode === "fallback"
					? "a memoji sticker — the 3D version needs WebGL, which this browser isn't giving us"
					: "a memoji sticker on a domed mesh — it's watching your cursor"}
			</figcaption>
			{mode === "fallback" ? null : (
				<p className="me-status" data-el="me-status" aria-hidden="true">
					state: booting
				</p>
			)}
		</figure>
	);
}
