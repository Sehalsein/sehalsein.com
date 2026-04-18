"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { create } from "zustand";

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
	const { theme: palette, setTheme: setPalette } = useTheme();
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
			return "linear-gradient(135deg, color-mix(in srgb, var(--blue) 25%, var(--bg)), var(--bg) 70%)";
		case "2":
			return "var(--bg)";
		case "3":
			return "radial-gradient(ellipse at center, color-mix(in srgb, var(--amber) 20%, var(--bg)), var(--bg))";
		default:
			return "radial-gradient(1200px 700px at 78% 22%, color-mix(in srgb, var(--green) 10%, transparent), transparent 60%), radial-gradient(900px 600px at 10% 90%, color-mix(in srgb, var(--mag) 12%, transparent), transparent 60%), radial-gradient(600px 500px at 50% 55%, color-mix(in srgb, var(--blue) 8%, transparent), transparent 60%), var(--bg)";
	}
}
