"use client";

import { useEffect } from "react";
import type { AppId } from "../apps/registry";
import { useOSStore } from "../components/Window/store";

type Handlers = {
	enabled: boolean;
	toggleSpotlight: () => void;
	closeSpotlight: () => void;
	closeContextMenu: () => void;
	toggleCrt: () => void;
	launch: (appId: AppId) => void;
};

export function useKeyboardShortcuts({
	enabled,
	toggleSpotlight,
	closeSpotlight,
	closeContextMenu,
	toggleCrt,
	launch,
}: Handlers) {
	const focused = useOSStore((s) => s.focused);
	const order = useOSStore((s) => s.order);
	const focusWindow = useOSStore((s) => s.focusWindow);
	const closeWindow = useOSStore((s) => s.closeWindow);

	useEffect(() => {
		if (!enabled) return;
		const onKey = (e: KeyboardEvent) => {
			const cmd = e.metaKey || e.ctrlKey;
			if (cmd && e.key === "k") {
				e.preventDefault();
				toggleSpotlight();
				return;
			}
			if (cmd && e.shiftKey && (e.key === "C" || e.key === "c")) {
				e.preventDefault();
				toggleCrt();
				return;
			}
			if (cmd && e.key === "t") {
				e.preventDefault();
				launch("terminal");
				return;
			}
			if (cmd && e.key === "w" && focused) {
				e.preventDefault();
				closeWindow(focused);
				return;
			}
			if (cmd && e.key === "Tab") {
				e.preventDefault();
				if (order.length < 2) return;
				const [, ...rest] = [...order].reverse();
				if (rest[0]) focusWindow(rest[0]);
				return;
			}
			if (e.key === "?") {
				const target = e.target as HTMLElement | null;
				if (target?.matches("input,textarea")) return;
				launch("about");
				return;
			}
			if (e.key === "Escape") {
				closeSpotlight();
				closeContextMenu();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [
		enabled,
		focused,
		order,
		focusWindow,
		closeWindow,
		toggleSpotlight,
		closeSpotlight,
		closeContextMenu,
		toggleCrt,
		launch,
	]);
}
