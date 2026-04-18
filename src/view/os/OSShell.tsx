"use client";

import { type MouseEvent, useCallback, useState } from "react";
import { APPS, type AppId } from "./apps/registry";
import BootScreen from "./components/BootScreen";
import ContextMenu, { type CtxAction } from "./components/ContextMenu";
import Desktop from "./components/Desktop";
import Dock from "./components/Dock";
import MenuBar from "./components/MenuBar";
import Spotlight from "./components/Spotlight";
import Window from "./components/Window";
import { useOSStore } from "./components/Window/store";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useSystemPrefs, wallpaperFor } from "./hooks/useSystemPrefs";
import "./os.css";

export default function OSShell() {
	const [booted, setBooted] = useState(false);
	const [spotlightOpen, setSpotlightOpen] = useState(false);
	const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
	const { crt, toggleCrt, wall } = useSystemPrefs();

	const windows = useOSStore((s) => s.windows);
	const order = useOSStore((s) => s.order);
	const openApp = useOSStore((s) => s.openApp);
	const focusWindow = useOSStore((s) => s.focusWindow);
	const findByApp = useOSStore((s) => s.findByApp);

	const launch = useCallback<
		(appId: AppId, opts?: Parameters<typeof openApp>[2]) => string
	>(
		(appId, opts) => {
			const existing = findByApp(appId);
			if (existing) {
				focusWindow(existing.instanceId);
				return existing.instanceId;
			}
			return openApp(appId, APPS[appId].defaultSize, opts);
		},
		[findByApp, focusWindow, openApp],
	);

	const onBootDone = useCallback(() => {
		setBooted(true);
		setTimeout(() => {
			openApp("about", APPS.about.defaultSize, {
				position: { x: 80, y: 70 },
			});
			openApp("finder", APPS.finder.defaultSize, {
				position: { x: 220, y: 120 },
			});
		}, 600);
	}, [openApp]);

	const closeSpotlight = useCallback(() => setSpotlightOpen(false), []);
	const toggleSpotlight = useCallback(() => setSpotlightOpen((s) => !s), []);
	const closeContextMenu = useCallback(() => setCtx(null), []);

	useKeyboardShortcuts({
		enabled: booted,
		toggleSpotlight,
		closeSpotlight,
		closeContextMenu,
		toggleCrt,
		launch,
	});

	const onCtxAction = useCallback(
		(a: CtxAction) => {
			if (a === "spotlight") setSpotlightOpen(true);
			else if (a === "terminal") launch("terminal");
			else if (a === "settings") launch("settings");
			else if (a === "about") launch("about");
			else if (a === "crt") toggleCrt();
		},
		[launch, toggleCrt],
	);

	const onDesktopContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
		const target = e.target as HTMLElement;
		if (target.closest(".os-window")) return;
		e.preventDefault();
		setCtx({ x: e.clientX, y: e.clientY });
	}, []);

	return (
		<div
			className="os-root"
			data-crt={crt}
			onContextMenu={onDesktopContextMenu}
		>
			<div
				className="desktop"
				id="desktop"
				style={{ background: wallpaperFor(wall) }}
			>
				<Desktop />
			</div>
			{booted && <MenuBar onHelp={() => setSpotlightOpen(true)} />}
			{booted && <Dock onOpen={launch} />}
			{booted &&
				order.map((id) => {
					const w = windows[id];
					if (!w) return null;
					const app = APPS[w.appId as AppId];
					const Icon = app.icon;
					const Component = app.Component;
					return (
						<Window
							key={id}
							window={w}
							title={app.name}
							icon={<Icon aria-hidden="true" />}
						>
							<Component instanceId={id} />
						</Window>
					);
				})}
			{spotlightOpen && (
				<Spotlight onClose={closeSpotlight} onOpen={launch} />
			)}
			{ctx && (
				<ContextMenu
					x={ctx.x}
					y={ctx.y}
					onClose={closeContextMenu}
					onAction={onCtxAction}
				/>
			)}
			{!booted && <BootScreen onDone={onBootDone} />}
		</div>
	);
}
