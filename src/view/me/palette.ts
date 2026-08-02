/**
 * Reads the active terminal palette off the document's CSS custom properties.
 *
 * Same shape as the existing readers in `src/view/os/apps/Snake.tsx` and
 * `src/view/terminal/MatrixOverlay.tsx`, with two additions: a fallback to the
 * legacy `--term-*` aliases, and a re-read when the palette actually changes.
 *
 * Change detection is a MutationObserver rather than `useTheme()`, because the
 * stage lives outside React's tree entirely. An observer keeps it self-contained
 * and catches every writer of the attribute — the palette strip on this page,
 * another route's switcher, next-themes' cross-tab sync, or a probe calling
 * `setAttribute` — instead of only the one React subtree we happen to wire up.
 */

import type { MePalette } from "./types";

type Entry = readonly [modern: string, legacy: string, fallback: string];

const KEYS: Record<keyof MePalette, Entry> = {
	bg: ["--color-term-bg", "--term-bg", "#0a0b09"],
	bg2: ["--color-term-bg2", "--term-bg2", "#0f110e"],
	ink: ["--color-term-ink", "--term-ink", "#d6d3c4"],
	dim: ["--color-term-dim", "--term-dim", "#9aa0a8"],
	rule: ["--color-term-rule", "--term-rule", "#2a2f36"],
	accent: ["--color-term-green", "--term-green", "#9ece6a"],
	alt: ["--color-term-blue", "--term-blue", "#7aa2f7"],
};

export function readPalette(): MePalette {
	const cs = getComputedStyle(document.documentElement);
	const out = {} as MePalette;
	for (const key of Object.keys(KEYS) as (keyof MePalette)[]) {
		const [modern, legacy, fallback] = KEYS[key];
		out[key] =
			cs.getPropertyValue(modern).trim() ||
			cs.getPropertyValue(legacy).trim() ||
			fallback;
	}
	return out;
}

/** Calls back on every `data-palette` change. Returns an unsubscribe. */
export function watchPalette(onChange: (palette: MePalette) => void): () => void {
	let frame = 0;
	const observer = new MutationObserver(() => {
		// next-themes writes the attribute synchronously and swaps a style node
		// alongside it; deferring a frame collapses that churn into one read
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => onChange(readPalette()));
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["data-palette"],
	});
	return () => {
		cancelAnimationFrame(frame);
		observer.disconnect();
	};
}
