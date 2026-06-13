"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * loading → assets streaming in (overlay shows the boot log)
 * ready   → everything loaded, waiting for the first W / click
 * intro   → cinematic sweep down to the truck
 * play    → player has the wheel
 */
export type WorldPhase = "loading" | "ready" | "intro" | "play";

type WorldStore = {
	phase: WorldPhase;
	setPhase: (p: WorldPhase) => void;
	muted: boolean;
	toggleMuted: () => void;
};

export const useWorldStore = create<WorldStore>()(
	persist(
		(set) => ({
			phase: "loading",
			setPhase: (phase) => set({ phase }),
			muted: false,
			toggleMuted: () => set((s) => ({ muted: !s.muted })),
		}),
		{
			name: "pg-audio",
			partialize: (s) => ({ muted: s.muted }),
		},
	),
);
