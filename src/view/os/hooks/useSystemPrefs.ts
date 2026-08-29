"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { usePalette } from "@/src/view/ThemeProvider";

const CRT_KEY = "os-crt";
const WALL_KEY = "os-wall";

export type WallId = "0" | "1" | "2" | "3";
export type CrtMode = "on" | "off";

type PrefsStore = {
	crt: CrtMode;
	wall: WallId;
	hydrated: boolean;
	hydrate: () => void;
	setCrt: (v: CrtMode) => void;
	setWall: (v: WallId) => void;
	toggleCrt: () => void;
};

const usePrefsStore = create<PrefsStore>((set, get) => ({
	crt: "off",
	wall: "0",
	hydrated: false,
	hydrate: () => {
		if (get().hydrated) return;
		if (typeof window === "undefined") return;
		const crt = (localStorage.getItem(CRT_KEY) ?? "off") as CrtMode;
		const wall = (localStorage.getItem(WALL_KEY) ?? "0") as WallId;
		set({ crt, wall, hydrated: true });
	},
	setCrt: (v) => {
		set({ crt: v });
		if (typeof window !== "undefined") localStorage.setItem(CRT_KEY, v);
	},
	setWall: (v) => {
		set({ wall: v });
		if (typeof window !== "undefined") localStorage.setItem(WALL_KEY, v);
	},
	toggleCrt: () => {
		const next: CrtMode = get().crt === "on" ? "off" : "on";
		get().setCrt(next);
	},
}));

export function useSystemPrefs() {
	const { theme: palette, setTheme: setPalette } = usePalette();
	const crt = usePrefsStore((s) => s.crt);
	const wall = usePrefsStore((s) => s.wall);
	const hydrated = usePrefsStore((s) => s.hydrated);
	const setCrt = usePrefsStore((s) => s.setCrt);
	const setWall = usePrefsStore((s) => s.setWall);
	const toggleCrt = usePrefsStore((s) => s.toggleCrt);

	useEffect(() => {
		if (!hydrated) usePrefsStore.getState().hydrate();
	}, [hydrated]);

	return {
		palette: palette ?? "default",
		setPalette,
		crt,
		setCrt,
		toggleCrt,
		wall,
		setWall,
	};
}

export function wallpaperFor(wall: WallId): string {
	switch (wall) {
		case "1":
			return "radial-gradient(900px 640px at 72% 18%, color-mix(in srgb, var(--blue) 30%, transparent), transparent 66%), linear-gradient(145deg, color-mix(in srgb, var(--bg) 90%, #172440), var(--bg))";
		case "2":
			return "linear-gradient(145deg, color-mix(in srgb, var(--bg) 94%, #ffffff), var(--bg))";
		case "3":
			return "radial-gradient(1000px 720px at 86% 12%, color-mix(in srgb, var(--amber) 24%, transparent), transparent 64%), radial-gradient(760px 620px at 8% 96%, color-mix(in srgb, var(--mag) 18%, transparent), transparent 68%), var(--bg)";
		default:
			return "radial-gradient(1100px 700px at 82% 14%, color-mix(in srgb, var(--blue) 22%, transparent), transparent 62%), radial-gradient(820px 660px at 7% 96%, color-mix(in srgb, var(--mag) 14%, transparent), transparent 68%), linear-gradient(145deg, color-mix(in srgb, var(--bg) 92%, #17233c), var(--bg))";
	}
}
