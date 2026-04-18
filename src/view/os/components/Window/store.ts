"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";

export type Position = { x: number; y: number };
export type Size = { width: number; height: number };

export type WindowState = {
	instanceId: string;
	appId: string;
	position: Position;
	size: Size;
	minimized: boolean;
	maximized: boolean;
	opening: boolean;
	closing: boolean;
};

export type OpenAppOpts = {
	position?: Partial<Position>;
	size?: Partial<Size>;
};

type Store = {
	windows: Record<string, WindowState>;
	order: string[];
	focused: string | null;
	openApp: (appId: string, defaults: Size, opts?: OpenAppOpts) => string;
	closeWindow: (instanceId: string) => void;
	focusWindow: (instanceId: string) => void;
	minimize: (instanceId: string) => void;
	toggleMax: (instanceId: string) => void;
	setPosition: (instanceId: string, position: Position) => void;
	setSize: (instanceId: string, size: Size) => void;
	findByApp: (appId: string) => WindowState | undefined;
};

export const useOSStore = create<Store>()((set, get) => ({
	windows: {},
	order: [],
	focused: null,

	openApp: (appId, defaults, opts = {}) => {
		const instanceId = nanoid(6);
		const size: Size = {
			width: opts.size?.width ?? defaults.width,
			height: opts.size?.height ?? defaults.height,
		};
		const position: Position = {
			x: opts.position?.x ?? 60 + Math.random() * 100,
			y: opts.position?.y ?? 60 + Math.random() * 80,
		};
		set((s) => ({
			windows: {
				...s.windows,
				[instanceId]: {
					instanceId,
					appId,
					position,
					size,
					minimized: false,
					maximized: false,
					opening: true,
					closing: false,
				},
			},
			order: [...s.order, instanceId],
			focused: instanceId,
		}));
		setTimeout(() => {
			set((s) => {
				const w = s.windows[instanceId];
				if (!w) return s;
				return {
					windows: { ...s.windows, [instanceId]: { ...w, opening: false } },
				};
			});
		}, 220);
		return instanceId;
	},

	closeWindow: (instanceId) => {
		const w = get().windows[instanceId];
		if (!w) return;
		set((s) => ({
			windows: { ...s.windows, [instanceId]: { ...w, closing: true } },
		}));
		setTimeout(() => {
			set((s) => {
				const next = { ...s.windows };
				delete next[instanceId];
				const order = s.order.filter((id) => id !== instanceId);
				const focused =
					s.focused === instanceId
						? (order[order.length - 1] ?? null)
						: s.focused;
				return { windows: next, order, focused };
			});
		}, 150);
	},

	focusWindow: (instanceId) => {
		set((s) => {
			if (!s.windows[instanceId]) return s;
			const w = s.windows[instanceId];
			return {
				order: [...s.order.filter((id) => id !== instanceId), instanceId],
				focused: instanceId,
				windows: w.minimized
					? { ...s.windows, [instanceId]: { ...w, minimized: false } }
					: s.windows,
			};
		});
	},

	minimize: (instanceId) => {
		set((s) => {
			const w = s.windows[instanceId];
			if (!w) return s;
			return {
				windows: { ...s.windows, [instanceId]: { ...w, minimized: true } },
			};
		});
	},

	toggleMax: (instanceId) => {
		set((s) => {
			const w = s.windows[instanceId];
			if (!w) return s;
			return {
				windows: {
					...s.windows,
					[instanceId]: { ...w, maximized: !w.maximized },
				},
			};
		});
	},

	setPosition: (instanceId, position) => {
		set((s) => {
			const w = s.windows[instanceId];
			if (!w) return s;
			return {
				windows: { ...s.windows, [instanceId]: { ...w, position } },
			};
		});
	},

	setSize: (instanceId, size) => {
		set((s) => {
			const w = s.windows[instanceId];
			if (!w) return s;
			return {
				windows: { ...s.windows, [instanceId]: { ...w, size } },
			};
		});
	},

	findByApp: (appId) => {
		const { windows, order } = get();
		for (let i = order.length - 1; i >= 0; i--) {
			const w = windows[order[i]];
			if (w?.appId === appId) return w;
		}
		return undefined;
	},
}));
