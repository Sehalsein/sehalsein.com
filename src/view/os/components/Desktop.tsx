"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContributionsResponse } from "@/app/api/github/contributions/route";
import { useClock } from "../hooks/useClock";
import { useDraggable } from "../hooks/useDraggable";

export default function Desktop() {
	return (
		<>
			<div className="wallgrid" />
			<div className="wallmark">sehal</div>
			<GithubWidget />
			<ClockWidget />
			<NowPlayingWidget />
			<UptimeWidget />
		</>
	);
}

function ClockWidget() {
	const drag = useDraggable("clock");
	const now = useClock();
	const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
	const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
	const date = now
		? now.toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
			})
		: "loading";
	const zone = now
		? (() => {
				const offset = -now.getTimezoneOffset() / 60;
				const sign = offset >= 0 ? "+" : "−";
				const abs = Math.abs(offset);
				const h = String(Math.floor(abs)).padStart(2, "0");
				const m = String(Math.round((abs - Math.floor(abs)) * 60)).padStart(
					2,
					"0",
				);
				return `UTC${sign}${h}:${m}`;
			})()
		: "—";
	return (
		<div
			ref={drag.ref}
			className="widget clock d2 draggable"
			style={drag.style}
			{...drag.dragHandlers}
		>
			<div className="h">local time</div>
			<div className="time">
				{hh}:{mm}
			</div>
			<div className="date">{date}</div>
			<div className="zone">{zone} · montreal</div>
		</div>
	);
}

type GraphCell = { intensity: 0 | 1 | 2 | 3 | 4 };

function intensityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
	if (count <= 0) return 0;
	if (count <= 3) return 1;
	if (count <= 6) return 2;
	if (count <= 9) return 3;
	return 4;
}

function cellBg(intensity: 0 | 1 | 2 | 3 | 4): string {
	if (intensity === 0) return "var(--rule)";
	if (intensity === 1) return "color-mix(in srgb, var(--green) 25%, var(--rule))";
	if (intensity === 2) return "color-mix(in srgb, var(--green) 50%, var(--rule))";
	if (intensity === 3) return "color-mix(in srgb, var(--green) 75%, var(--rule))";
	return "var(--green)";
}

function GithubWidget() {
	const drag = useDraggable("github");
	const [data, setData] = useState<ContributionsResponse | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		let cancelled = false;
		fetch("/api/github/contributions")
			.then((r) => (r.ok ? r.json() : null))
			.then((json: ContributionsResponse | null) => {
				if (!cancelled) setData(json);
			})
			.catch(() => {
				/* ignore — fall back to static */
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const cells = useMemo<GraphCell[]>(() => {
		if (!data) {
			if (!mounted) {
				return Array.from({ length: 140 }, () => ({ intensity: 0 }));
			}
			return Array.from({ length: 140 }, () => {
				const r = Math.random();
				const intensity: 0 | 1 | 2 | 3 | 4 =
					r < 0.3 ? 0 : r < 0.55 ? 1 : r < 0.8 ? 2 : r < 0.92 ? 3 : 4;
				return { intensity };
			});
		}
		const weeks = data.weeks.slice(-20);
		const flat: GraphCell[] = [];
		for (let w = 0; w < 7; w++) {
			for (const week of weeks) {
				const day = week.contributionDays.find((d) => d.weekday === w);
				flat.push({
					intensity: intensityLevel(day?.contributionCount ?? 0),
				});
			}
		}
		return flat;
	}, [data]);

	const total = data ? data.total : null;
	const windowTotal = data
		? data.weeks
				.slice(-20)
				.reduce(
					(sum, w) =>
						sum +
						w.contributionDays.reduce(
							(d, day) => d + day.contributionCount,
							0,
						),
					0,
				)
		: null;

	return (
		<div
			ref={drag.ref}
			className="widget github d1 draggable"
			style={drag.style}
			{...drag.dragHandlers}
		>
			<div className="h">github · last 20 wks</div>
			<div className="stats">
				<div>
					<div className="k">{windowTotal ?? "—"}</div>
					<div className="v">contribs</div>
				</div>
				<div>
					<div className="k">
						{total !== null ? (
							<>
								<span className="u">{total.toLocaleString()}</span>
							</>
						) : (
							"—"
						)}
					</div>
					<div className="v">year total</div>
				</div>
				<div>
					<div className="k">sehalsein</div>
					<div className="v">@gh</div>
				</div>
			</div>
			<div className="graph">
				{cells.map((c, i) => (
					<span key={i} style={{ background: cellBg(c.intensity) }} />
				))}
			</div>
		</div>
	);
}

function NowPlayingWidget() {
	const drag = useDraggable("now");
	return (
		<div
			ref={drag.ref}
			className="widget now d3 draggable"
			style={drag.style}
			{...drag.dragHandlers}
		>
			<div className="h">currently</div>
			<div className="t">lo-fi + ambient · focus mix</div>
			<div className="s">deep work · headphones on</div>
			<div className="bar" />
			<div className="times">
				<span>—</span>
				<span>loop</span>
			</div>
		</div>
	);
}

function UptimeWidget() {
	const drag = useDraggable("uptime");
	return (
		<div
			ref={drag.ref}
			className="widget uptime d4 draggable"
			style={drag.style}
			{...drag.dragHandlers}
		>
			<div className="h">system</div>
			<div className="rows">
				<div className="row">
					<span className="l">uptime</span>
					<span className="v">7+ yrs shipping</span>
				</div>
				<div className="row">
					<span className="l">location</span>
					<span className="v">montreal, ca</span>
				</div>
				<div className="row">
					<span className="l">status</span>
					<span className="v ok">open to chats</span>
				</div>
				<div className="row">
					<span className="l">network</span>
					<span className="v ok">connected</span>
				</div>
			</div>
		</div>
	);
}
