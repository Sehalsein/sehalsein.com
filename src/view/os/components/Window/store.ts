"use client";

import { useMemo } from "react";
import { create } from "zustand";

export type Position = {
    x: number;
    y: number;
    z: number;
};

export type Size = {
    width: number;
    height: number;
};

export type WindowState = {
    open: boolean;
    position: Position;
    size: Size;
};

type WindowsStore = {
    windows: Record<string, WindowState>;

    // Actions
    getWindowState: (id: string) => WindowState | undefined;
    setPosition: (id: string, position: Position) => void;
    setSize: (id: string, size: Size) => void;
    setActiveWindow: (id: string) => void;
    setWindow: (id: string, newState: WindowState) => void;
    closeWindow: (id: string) => void;
};

export const INITIAL_WINDOW_STATE: WindowState = {
    open: false,
    position: { x: 100, y: 100, z: 10 },
    size: { width: 800, height: 600 },
};

export const useGlobalWindowStore = create<WindowsStore>()((set, get) => ({
    windows: {},

    getWindowState: (id: string) => {
        return get().windows[id];
    },

    setWindow: (id: string, newState: WindowState) => {
        set((state) => {
            return {
                windows: {
                    ...state.windows,
                    [id]: newState,
                },
            };
        });
    },

    setPosition: (id: string, position: Position) => {
        set((state) => {
            const windowState = state.windows[id] || INITIAL_WINDOW_STATE;
            return {
                windows: {
                    ...state.windows,
                    [id]: {
                        ...windowState,
                        position,
                    },
                },
            };
        });
    },

    setSize: (id: string, size: Size) => {
        set((state) => {
            const windowState = state.windows[id] || INITIAL_WINDOW_STATE;
            return {
                windows: {
                    ...state.windows,
                    [id]: {
                        ...windowState,
                        size,
                    },
                },
            };
        });
    },

    setActiveWindow: (id: string) => {
        set((state) => {
            const updatedWindows = { ...state.windows };

            for (const windowId in updatedWindows) {
                updatedWindows[windowId] = {
                    ...updatedWindows[windowId],
                    position: {
                        ...updatedWindows[windowId].position,
                        z: 10,
                    },
                };
            }

            if (updatedWindows[id]) {
                updatedWindows[id] = {
                    ...updatedWindows[id],
                    position: {
                        ...updatedWindows[id].position,
                        z: 20,
                    },
                };
            }


            return { windows: updatedWindows };
        });
    },

    closeWindow: (id: string) => {
        set((state) => {
            const updatedWindows = { ...state.windows };
            delete updatedWindows[id];
            return { windows: updatedWindows };
        });
    },
}));

export function useWindowStore({
    id,
}: {
    id: string;
}) {
    const store = useGlobalWindowStore();

    const currentWindow = store.getWindowState(id);
    const windowState: WindowState = useMemo(() => ({
        open: currentWindow?.open || false,
        position: currentWindow?.position || INITIAL_WINDOW_STATE.position,
        size: currentWindow?.size || INITIAL_WINDOW_STATE.size,
    }), [currentWindow]);

    return {
        state: windowState,
        closeWindow: () => store.closeWindow(id),
        setPosition: (position: Position) => store.setPosition(id, position),
        setSize: (size: Size) => store.setSize(id, size),
        setActive: () => store.setActiveWindow(id),
        setWindow: (newState: WindowState) => store.setWindow(id, newState),
    };
}
