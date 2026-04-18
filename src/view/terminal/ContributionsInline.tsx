"use client";

import { useEffect, useState } from "react";
import type { ContributionsResponse } from "@/app/api/github/contributions/route";

const BLOCKS = [" ", "░", "▒", "▓", "█"];

function level(count: number): 0 | 1 | 2 | 3 | 4 {
	if (count <= 0) return 0;
	if (count <= 3) return 1;
	if (count <= 6) return 2;
	if (count <= 9) return 3;
	return 4;
}

const LEVEL_COLOR = [
	"var(--term-faint)",
	"var(--term-dim)",
	"var(--term-green)",
	"var(--term-green)",
	"var(--term-green)",
];

type State =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "ready"; data: ContributionsResponse };

export default function ContributionsInline() {
	const [state, setState] = useState<State>({ status: "loading" });

	useEffect(() => {
		let cancelled = false;
		fetch("/api/github/contributions")
			.then(async (res) => {
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					throw new Error(body?.error || `status ${res.status}`);
				}
				return (await res.json()) as ContributionsResponse;
			})
			.then((data) => {
				if (!cancelled) setState({ status: "ready", data });
			})
			.catch((err: Error) => {
				if (!cancelled)
					setState({ status: "error", message: err.message });
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (state.status === "loading") {
		return (
			<span style={{ color: "var(--term-dim)" }}>
				fetching github contributions…
			</span>
		);
	}
	if (state.status === "error") {
		return (
			<span style={{ color: "var(--term-red)" }}>
				could not load contributions: {state.message}
			</span>
		);
	}

	const { data } = state;
	const rows: { level: number; weight: number }[][] = Array.from(
		{ length: 7 },
		() => [],
	);
	for (const week of data.weeks) {
		const byWeekday: Record<number, number> = {};
		for (const d of week.contributionDays) {
			byWeekday[d.weekday] = d.contributionCount;
		}
		for (let w = 0; w < 7; w++) {
			const count = byWeekday[w] ?? 0;
			rows[w].push({ level: level(count), weight: count });
		}
	}

	return (
		<div className="my-2">
			<div
				className="text-[11px] mb-2"
				style={{ color: "var(--term-amber)" }}
			>
				GitHub · {data.login} · {data.total.toLocaleString()}{" "}
				contributions · last year
			</div>
			<pre
				className="whitespace-pre text-[11px] leading-[1.05] font-mono"
				style={{ color: "var(--term-ink)" }}
			>
				{rows.map((row, ri) => (
					<div key={ri}>
						{row.map((c, ci) => (
							<span key={ci} style={{ color: LEVEL_COLOR[c.level] }}>
								{BLOCKS[c.level]}
							</span>
						))}
					</div>
				))}
			</pre>
			<div
				className="text-[10px] mt-2"
				style={{ color: "var(--term-dim)" }}
			>
				less{" "}
				{BLOCKS.map((b, i) => (
					<span key={i} style={{ color: LEVEL_COLOR[i] }}>
						{b}
					</span>
				))}{" "}
				more · see /now for the full grid
			</div>
		</div>
	);
}
