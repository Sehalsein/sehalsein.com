"use client";

import { Command, Wifi } from "lucide-react";
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
		: "Finder";

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
			<span className="logo" aria-hidden="true">
				<Command />
			</span>
			<span className="app-name" aria-label="Focused application">
				{appName}
			</span>
			<nav aria-label="Application menu" className="contents">
				<button type="button" className="menu">
					File
				</button>
				<button type="button" className="menu">
					Edit
				</button>
				<button type="button" className="menu">
					View
				</button>
				<button type="button" className="menu" onClick={onHelp}>
					Help
				</button>
			</nav>
			<span className="spacer" />
			<div className="status" aria-label="System status">
				<span className="batt" aria-label="Battery at 72 percent">
					<span className="cell" aria-hidden="true">
						<span className="fill" />
					</span>
					72%
				</span>
				<span aria-label="Network connected">
					<Wifi aria-hidden="true" />
				</span>
				<span>
					<span className="dot" aria-hidden="true" />
					online
				</span>
				<kbd className="kbd">⌘&nbsp;K</kbd>
				<span className="sep" aria-hidden="true" />
				<time dateTime={now?.toISOString()}>{date}</time>
				<time dateTime={now?.toISOString()}>{time}</time>
			</div>
		</header>
	);
}
