import type { PaletteName } from "@/src/data/terminal";

export type PaletteVars = {
	"--term-bg": string;
	"--term-bg2": string;
	"--term-ink": string;
	"--term-dim": string;
	"--term-faint": string;
	"--term-rule": string;
	"--term-green": string;
	"--term-amber": string;
	"--term-red": string;
	"--term-blue": string;
	"--term-mag": string;
	"--term-cyan": string;
};

export const PALETTES: Record<PaletteName, PaletteVars> = {
	default: {
		"--term-bg": "#0a0b09",
		"--term-bg2": "#0f110e",
		"--term-ink": "#d6d3c4",
		"--term-dim": "#7a7869",
		"--term-faint": "#3c3b33",
		"--term-rule": "#1e1f1b",
		"--term-green": "#9ece6a",
		"--term-amber": "#d9a05b",
		"--term-red": "#e46767",
		"--term-blue": "#7aa2f7",
		"--term-mag": "#c98ed6",
		"--term-cyan": "#7dcfff",
	},
	tokyonight: {
		"--term-bg": "#1a1b26",
		"--term-bg2": "#16161e",
		"--term-ink": "#c0caf5",
		"--term-dim": "#565f89",
		"--term-faint": "#3b4261",
		"--term-rule": "#292e42",
		"--term-green": "#9ece6a",
		"--term-amber": "#e0af68",
		"--term-red": "#f7768e",
		"--term-blue": "#7aa2f7",
		"--term-mag": "#bb9af7",
		"--term-cyan": "#7dcfff",
	},
	solarized: {
		"--term-bg": "#002b36",
		"--term-bg2": "#073642",
		"--term-ink": "#eee8d5",
		"--term-dim": "#839496",
		"--term-faint": "#586e75",
		"--term-rule": "#073642",
		"--term-green": "#859900",
		"--term-amber": "#b58900",
		"--term-red": "#dc322f",
		"--term-blue": "#268bd2",
		"--term-mag": "#d33682",
		"--term-cyan": "#2aa198",
	},
	gruvbox: {
		"--term-bg": "#282828",
		"--term-bg2": "#1d2021",
		"--term-ink": "#ebdbb2",
		"--term-dim": "#a89984",
		"--term-faint": "#665c54",
		"--term-rule": "#3c3836",
		"--term-green": "#b8bb26",
		"--term-amber": "#fabd2f",
		"--term-red": "#fb4934",
		"--term-blue": "#83a598",
		"--term-mag": "#d3869b",
		"--term-cyan": "#8ec07c",
	},
	nord: {
		"--term-bg": "#2e3440",
		"--term-bg2": "#3b4252",
		"--term-ink": "#e5e9f0",
		"--term-dim": "#81a1c1",
		"--term-faint": "#4c566a",
		"--term-rule": "#434c5e",
		"--term-green": "#a3be8c",
		"--term-amber": "#ebcb8b",
		"--term-red": "#bf616a",
		"--term-blue": "#81a1c1",
		"--term-mag": "#b48ead",
		"--term-cyan": "#88c0d0",
	},
	dracula: {
		"--term-bg": "#282a36",
		"--term-bg2": "#21222c",
		"--term-ink": "#f8f8f2",
		"--term-dim": "#6272a4",
		"--term-faint": "#44475a",
		"--term-rule": "#44475a",
		"--term-green": "#50fa7b",
		"--term-amber": "#ffb86c",
		"--term-red": "#ff5555",
		"--term-blue": "#8be9fd",
		"--term-mag": "#ff79c6",
		"--term-cyan": "#8be9fd",
	},
	catppuccin: {
		"--term-bg": "#1e1e2e",
		"--term-bg2": "#181825",
		"--term-ink": "#cdd6f4",
		"--term-dim": "#7f849c",
		"--term-faint": "#45475a",
		"--term-rule": "#313244",
		"--term-green": "#a6e3a1",
		"--term-amber": "#f9e2af",
		"--term-red": "#f38ba8",
		"--term-blue": "#89b4fa",
		"--term-mag": "#cba6f7",
		"--term-cyan": "#94e2d5",
	},
	mono: {
		"--term-bg": "#0a0a0a",
		"--term-bg2": "#111111",
		"--term-ink": "#e6e6e6",
		"--term-dim": "#888888",
		"--term-faint": "#3a3a3a",
		"--term-rule": "#222222",
		"--term-green": "#e6e6e6",
		"--term-amber": "#bbbbbb",
		"--term-red": "#ffffff",
		"--term-blue": "#aaaaaa",
		"--term-mag": "#cccccc",
		"--term-cyan": "#dddddd",
	},
	// GitHub Dark. Source: ghostty-themes / github-dark.
	"github-dark": {
		"--term-bg": "#010409",
		"--term-bg2": "#0d1117",
		"--term-ink": "#e6edf3",
		"--term-dim": "#6e7681",
		"--term-faint": "#484f58",
		"--term-rule": "#30363d",
		"--term-green": "#3fb950",
		"--term-amber": "#e3b341",
		"--term-red": "#ff7b72",
		"--term-blue": "#58a6ff",
		"--term-mag": "#d2a8ff",
		"--term-cyan": "#56d4dd",
	},
	// GitHub Dark (colorblind-accessible): red/green replaced with orange/blue.
	// Source: ghostty-themes / github-dark-colorblind.
	"github-dark-colorblind": {
		"--term-bg": "#010409",
		"--term-bg2": "#0d1117",
		"--term-ink": "#c9d1d9",
		"--term-dim": "#6e7681",
		"--term-faint": "#484f58",
		"--term-rule": "#30363d",
		"--term-green": "#79c0ff",
		"--term-amber": "#e3b341",
		"--term-red": "#fdac54",
		"--term-blue": "#58a6ff",
		"--term-mag": "#d2a8ff",
		"--term-cyan": "#56d4dd",
	},
};
