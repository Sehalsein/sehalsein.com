"use client";

import { CanvasTexture } from "three";
import { STATION_LIST } from "../stations";
import { ROADS, WORLD_HALF, WORLD_SIZE } from "./height";

const ZONE_PX = 1024;

let zoneMap: CanvasTexture | null = null;

/**
 * The ground's painted color zones, read by the terrain shader by world
 * position: R = dirt paths from spawn to each station, G = sandy ground
 * (station aprons, the spawn plaza, the pond beach). Painted from the same
 * station list as `flattenMask`, so the visuals and the level ground can't
 * desync.
 */
export function getZoneMap(): CanvasTexture {
	if (zoneMap) return zoneMap;
	const canvas = document.createElement("canvas");
	canvas.width = ZONE_PX;
	canvas.height = ZONE_PX;
	const g = canvas.getContext("2d");
	if (!g) throw new Error("2d context unavailable");
	const px = (v: number) => ((v + WORLD_HALF) / WORLD_SIZE) * ZONE_PX;
	const cx = (x: number) => px(x);
	const cy = (z: number) => ZONE_PX - px(z); // flipY upload

	g.fillStyle = "#000";
	g.fillRect(0, 0, ZONE_PX, ZONE_PX);
	// additive so the red paths and green aprons don't erase each other
	g.globalCompositeOperation = "lighter";

	const unit = ZONE_PX / WORLD_SIZE;
	g.lineCap = "round";
	g.lineJoin = "round";
	// paths: a faint shoulder, then the stone-flag core
	for (const [alpha, width] of [
		[0.4, 3.8],
		[1, 2.2],
	] as const) {
		g.strokeStyle = `rgba(255,0,0,${alpha})`;
		g.lineWidth = width * unit;
		for (const road of ROADS) {
			g.beginPath();
			g.moveTo(cx(road.pts[0][0]), cy(road.pts[0][1]));
			for (const [x, z] of road.pts.slice(1)) g.lineTo(cx(x), cy(z));
			g.stroke();
		}
	}
	// visible sand: station aprons, the spawn plaza, the beaches
	const aprons: [number, number, number][] = [
		[0, 0, 3.2],
		[-4.2, 1.4, 2.4], // pond beach
		[-18, 38, 4], // spring pool beach
		...STATION_LIST.map(
			(s) => [s.map[0], s.map[1], 5] as [number, number, number],
		),
	];
	for (const [x, z, r] of aprons) {
		const grad = g.createRadialGradient(cx(x), cy(z), 0, cx(x), cy(z), r * unit);
		grad.addColorStop(0, "rgba(0,255,0,1)");
		grad.addColorStop(0.6, "rgba(0,255,0,0.85)");
		grad.addColorStop(1, "rgba(0,255,0,0)");
		g.fillStyle = grad;
		g.beginPath();
		g.arc(cx(x), cy(z), r * unit, 0, Math.PI * 2);
		g.fill();
	}

	zoneMap = new CanvasTexture(canvas);
	zoneMap.anisotropy = 4;
	return zoneMap;
}
