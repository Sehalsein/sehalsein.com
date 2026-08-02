"use client";

import { useEffect, useRef } from "react";
import "./doom.css";

/**
 * Mounts the software renderer into a plain host div. The engine builds its own
 * canvas and (on touch devices) its own on-screen buttons inside the host, so
 * React never re-renders anything the game owns.
 */
export default function DoomCanvas() {
	const hostRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		let disposed = false;
		import("@/src/doom/boot").then((mod) => {
			if (disposed) return;
			mod.bootDoom(host);
		});
		return () => {
			disposed = true;
			import("@/src/doom/boot").then((mod) => mod.disposeDoom());
		};
	}, []);

	return <div ref={hostRef} className="dm-host" />;
}
