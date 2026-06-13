"use client";

import { createContext, type RefObject, useContext } from "react";
import type { StationId } from "./constants";
import { FALLBACK_PALETTE, type Palette } from "./usePalette";

type Pos = { x: number; y: number; z: number };

export type PlaygroundCtx = {
	palette: Palette;
	reducedMotion: boolean;
	/** station the camera is currently docked at, null = free orbit */
	focused: StationId | null;
	setFocused: (id: StationId | null) => void;
	/** live position of the truck (the player) */
	playerPosRef: RefObject<Pos>;
	/** live forward direction of the truck, for the chase camera */
	playerFwdRef: RefObject<Pos>;
	/** parked truck position, for proximity checks */
	carPosRef: RefObject<Pos>;
};

const noopPos = () => ({ current: { x: 0, y: 0, z: 0 } });

export const PlaygroundContext = createContext<PlaygroundCtx>({
	palette: FALLBACK_PALETTE,
	reducedMotion: false,
	focused: null,
	setFocused: () => {},
	playerPosRef: noopPos(),
	playerFwdRef: { current: { x: 0, y: 0, z: 1 } },
	carPosRef: noopPos(),
});

export const usePlayground = () => useContext(PlaygroundContext);
