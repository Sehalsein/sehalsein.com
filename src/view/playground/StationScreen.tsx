"use client";

import { Html } from "@react-three/drei";
import type { ReactNode } from "react";
import type { Station } from "./constants";

/**
 * Live DOM surface projected onto a station, sized so that
 * world width = pxWidth * distanceFactor / 400 (drei transform mode).
 */
export function StationScreen({
	station,
	worldWidth,
	pxWidth,
	children,
	lift = 0.01,
}: {
	station: Station;
	worldWidth: number;
	pxWidth: number;
	children: ReactNode;
	/** small forward offset to avoid z-fighting with the bezel */
	lift?: number;
}) {
	return (
		<Html
			transform
			position={[0, station.surface.up, station.surface.forward + lift]}
			distanceFactor={(400 * worldWidth) / pxWidth}
			zIndexRange={[5, 0]}
		>
			{children}
		</Html>
	);
}

/**
 * Floating window-chrome panel used by stations whose content lives on a
 * detached board (resume, guestbook, now) rather than a built-in screen.
 */
export function StationPanel({
	station,
	pxWidth = 760,
	pxHeight = 500,
}: {
	station: Station;
	pxWidth?: number;
	pxHeight?: number;
}) {
	return (
		<div className="overflow-hidden rounded-lg border border-term-rule bg-term-bg shadow-2xl">
			<div className="flex items-center gap-1.5 border-b border-term-rule bg-term-bg2 px-3 py-1.5">
				<span className="h-2 w-2 rounded-full bg-[#ff5f56]" />
				<span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
				<span className="h-2 w-2 rounded-full bg-[#27c93f]" />
				<span className="ml-2 text-[11px] text-term-dim">
					{station.title}
				</span>
				<span className="ml-auto text-[10px] text-term-faint">
					esc to step back
				</span>
			</div>
			<iframe
				src={station.href}
				title={station.title}
				style={{
					width: pxWidth,
					height: pxHeight,
					border: 0,
					display: "block",
					background: "var(--color-term-bg)",
				}}
			/>
		</div>
	);
}
