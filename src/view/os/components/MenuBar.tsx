"use client";

import { BatteryMedium, Search, Wifi } from "lucide-react";
import { APPS } from "../apps/registry";
import { useClock } from "../hooks/useClock";
import { useOSStore } from "./Window/store";

type Props = { onHelp: () => void };

function pad(n: number): string {
	return String(n).padStart(2, "0");
}

export default function MenuBar({ onHelp }: Props) {
	const now = useClock();
	const focused = useOSStore((s) => s.focused);
	const windows = useOSStore((s) => s.windows);
	const focusedApp = focused ? windows[focused]?.appId : undefined;
	const appName = focusedApp
		? APPS[focusedApp as keyof typeof APPS].name
		: "Desktop";

	const time = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : "—";
	const date = now
		? now.toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
			})
		: "—";

	return (
		<header className="menubar" role="banner">
			<span className="logo" aria-label="sehalOS">
				<span className="logo-mark" aria-hidden="true">S</span>
				<span>sehalOS</span>
			</span>
			<span className="brand-sep" aria-hidden="true" />
			<span className="app-name" aria-label="Focused application">
				{appName}
			</span>
			<span className="spacer" />
			<div className="status" aria-label="System status">
				<button type="button" className="menu search-menu" onClick={onHelp}>
					<Search aria-hidden="true" />
					<span>Search</span>
					<kbd className="kbd">⌘ K</kbd>
				</button>
				<span className="status-icon" aria-label="Network connected">
					<Wifi aria-hidden="true" />
				</span>
				<span className="status-icon" aria-label="Battery at 72 percent">
					<BatteryMedium aria-hidden="true" />
				</span>
				<time className="menubar-date" dateTime={now?.toISOString()}>{date}</time>
				<time className="menubar-time" dateTime={now?.toISOString()}>{time}</time>
			</div>
		</header>
	);
}
