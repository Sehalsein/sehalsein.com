"use client";

import { useEffect, useRef } from "react";
import { GAME_SCAFFOLD } from "./scaffold";
import "./playground.css";

/**
 * Mounts the folio-derived engine directly in React (no iframe). The engine is
 * imperative three.js/WebGPU + Rapier that queries a fixed DOM scaffold by class,
 * so we inject that scaffold, then boot the Game singleton against it on mount.
 */
export default function PlaygroundCanvas() {
	const hostRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let disposed = false;
		// dynamic import keeps the engine (and three/webgpu) client-only
		import("@/src/playground/boot.js").then((mod) => {
			if (disposed) return;
			mod.bootPlayground();
		});
		return () => {
			disposed = true;
			import("@/src/playground/boot.js").then((mod) => mod.disposePlayground());
		};
	}, []);

	// biome-ignore lint/security/noDangerouslySetInnerHtml: static engine scaffold
	return <div ref={hostRef} dangerouslySetInnerHTML={{ __html: GAME_SCAFFOLD }} />;
}
