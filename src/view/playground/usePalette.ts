"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import { Color } from "three";

export type Palette = {
	bg: string;
	bg2: string;
	ink: string;
	dim: string;
	faint: string;
	rule: string;
	green: string;
	amber: string;
	red: string;
	blue: string;
	mag: string;
	cyan: string;
};

export const FALLBACK_PALETTE: Palette = {
	bg: "#0a0b09",
	bg2: "#0f110e",
	ink: "#d6d3c4",
	dim: "#9aa0a8",
	faint: "#6a7078",
	rule: "#2a2f36",
	green: "#9ece6a",
	amber: "#d9a05b",
	red: "#e46767",
	blue: "#7aa2f7",
	mag: "#c98ed6",
	cyan: "#7dcfff",
};

/** Blend two hex colors; t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
	return `#${new Color(a).lerp(new Color(b), t).getHexString()}`;
}

/**
 * Warm sunset scheme for the playground world — terracotta ground, autumn
 * foliage, purple water and shadows, golden grass. Site palette colors are
 * still used for accents and screens.
 */
export const DAY = {
	sky: "#ffb98d",
	sand: "#7eb356",
	sand2: "#74a84f",
	sandDark: "#699a48",
	cream: "#f6e7d7",
	creamDark: "#e5d2bd",
	tree: "#c9a14e",
	treeLight: "#d9b35e",
	trunk: "#8a5a3b",
	wood: "#b5713f",
	woodDark: "#9e6136",
	water: "#5fa3d9",
	metal: "#7d6b55", // weathered timber — lanterns/bench legs in daylight
} as const;

/**
 * Storybook-island scheme — vivid daylight greens, gray rock cliffs, deep
 * blue sea, stone-flag paths. The sky's horizon color is the single shared
 * constant for fog + background, exported from SkyDome.
 */
export const DREAM = {
	horizon: "#cdeaf6",
	zenith: "#4f97d8",
	sun: "#fff6dd",
	grassNear: "#62bb3d",
	grassHigh: "#8ed455",
	path: "#d9c9a4",
	sand: "#e9dab2",
	rock: "#a8a8a2",
	water: "#3f8fd6",
	shallows: "#6fc6e8",
	cloud: "#ffffff",
} as const;

/** foliage tones, picked deterministically per tree — greens + autumn pops */
export const FOLIAGE = [
	"#6fae4e",
	"#f08a3c",
	"#5e9c4f",
	"#e8b34b",
	"#86bb55",
	"#d96a4f",
] as const;

/**
 * Reads the site's --color-term-* tokens off <html> so the 3D scene uses
 * whatever palette is active. Re-reads when next-themes switches data-palette.
 */
export function usePalette(): Palette {
	const { theme } = useTheme();
	return useMemo(() => {
		if (typeof window === "undefined") return FALLBACK_PALETTE;
		void theme;
		const css = getComputedStyle(document.documentElement);
		const read = (key: keyof Palette) =>
			css.getPropertyValue(`--color-term-${key}`).trim() ||
			FALLBACK_PALETTE[key];
		return {
			bg: read("bg"),
			bg2: read("bg2"),
			ink: read("ink"),
			dim: read("dim"),
			faint: read("faint"),
			rule: read("rule"),
			green: read("green"),
			amber: read("amber"),
			red: read("red"),
			blue: read("blue"),
			mag: read("mag"),
			cyan: read("cyan"),
		};
	}, [theme]);
}
