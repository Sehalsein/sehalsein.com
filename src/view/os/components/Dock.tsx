"use client";

import { APPS, DOCK_ORDER, type AppId } from "../apps/registry";
import { useOSStore } from "./Window/store";

type Props = { onOpen: (appId: AppId) => void };

export default function Dock({ onOpen }: Props) {
	const windows = useOSStore((s) => s.windows);
	const runningApps = new Set(Object.values(windows).map((w) => w.appId));

	return (
		<nav className="dock" aria-label="Applications dock">
			{DOCK_ORDER.map((id, i) => {
				if (id === "sep") {
					return <span key={`sep-${i}`} className="dock-sep" aria-hidden="true" />;
				}
				const app = APPS[id];
				const Icon = app.icon;
				const running = runningApps.has(id);
				return (
					<button
						type="button"
						key={id}
						className={`dock-icon${running ? " running" : ""}`}
						onClick={() => onOpen(id)}
						aria-label={`Open ${app.name}${running ? " (running)" : ""}`}
					>
						<Icon aria-hidden="true" />
						<span className="dot" aria-hidden="true" />
						<span className="tip" aria-hidden="true">
							{app.name}
						</span>
					</button>
				);
			})}
		</nav>
	);
}
