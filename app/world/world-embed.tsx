"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * Embeds the built folio app full-screen. The folio binds keydown/keyup on its
 * own window, so the iframe must hold focus for driving to work — we focus it
 * on load and whenever the user interacts.
 */
export default function WorldEmbed() {
	const ref = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		const focusFrame = () => {
			try {
				ref.current?.contentWindow?.focus();
			} catch {
				// same-origin, but guard just in case
			}
		};
		focusFrame();
		// keep nudging focus to the frame for the first few seconds while it boots
		const interval = window.setInterval(focusFrame, 1200);
		const stop = window.setTimeout(() => window.clearInterval(interval), 12000);
		// any click on the page chrome should hand focus back to the game
		window.addEventListener("pointerdown", focusFrame);
		return () => {
			window.clearInterval(interval);
			window.clearTimeout(stop);
			window.removeEventListener("pointerdown", focusFrame);
		};
	}, []);

	return (
		<main className="relative h-screen w-screen overflow-hidden bg-black">
			<iframe
				ref={ref}
				src="/world-app/index.html?webgl"
				title="world"
				className="absolute inset-0 h-full w-full border-0"
				allow="autoplay; fullscreen; gamepad; xr-spatial-tracking; accelerometer; gyroscope"
				onLoad={() => {
					try {
						ref.current?.contentWindow?.focus();
					} catch {
						// noop
					}
				}}
			/>
			<Link
				href="/"
				className="absolute left-4 top-4 z-10 rounded border border-white/20 bg-black/40 px-2 py-1 text-[12px] text-white/80 backdrop-blur transition-colors hover:border-white/60 hover:text-white"
			>
				← home
			</Link>
		</main>
	);
}
