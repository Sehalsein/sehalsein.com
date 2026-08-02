"use client";

import { useEffect, useRef } from "react";
import "./racer.css";

/**
 * Mounts the isometric racing engine (imperative three.js + Rapier) into a
 * plain host div. The engine builds its own canvas and DOM UI inside the
 * host; boot/dispose are guarded against strict-mode double effects.
 */
export default function RacerCanvas() {
	const hostRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		let disposed = false;
		import("@/src/racer/boot").then((mod) => {
			if (disposed) return;
			mod.bootRacer(host);
		});
		return () => {
			disposed = true;
			import("@/src/racer/boot").then((mod) => mod.disposeRacer());
		};
	}, []);

	return <div ref={hostRef} className="rg-host" />;
}
