"use client";

import { useEffect, useState } from "react";
import type { ContributionsResponse } from "@/app/api/github/contributions/route";

type State =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "ready"; data: ContributionsResponse };

const LEVEL_COLORS = [
	"#1a1f26", // 0
	"#0e4429", // 1-3
	"#006d32", // 4-6
	"#26a641", // 7-9
	"#39d353", // 10+
];

function level(count: number): 0 | 1 | 2 | 3 | 4 {
	if (count <= 0) return 0;
	if (count <= 3) return 1;
	if (count <= 6) return 2;
	if (count <= 9) return 3;
	return 4;
}

export default function ContributionHeatmap() {
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
			<div className="text-[11px]" style={{ color: "#6a7078" }}>
				loading contributions…
			</div>
		);
	}
	if (state.status === "error") {
		return (
			<div className="text-[11px]" style={{ color: "#a05060" }}>
				could not load contributions: {state.message}
			</div>
		);
	}

	const { data } = state;
	const cell = 11;
	const gap = 3;
	const cols = data.weeks.length;
	const width = cols * (cell + gap);
	const height = 7 * (cell + gap);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-baseline justify-between">
				<div
					className="text-[11px] tracking-[0.08em] uppercase"
					style={{ color: "#f5b041" }}
				>
					GitHub · {data.login}
				</div>
				<div className="text-[11px]" style={{ color: "#6a7078" }}>
					{data.total.toLocaleString()} contributions · last year
				</div>
			</div>
			<div className="overflow-x-auto">
				<svg
					width={width}
					height={height}
					role="img"
					aria-label={`${data.total} GitHub contributions in the last year`}
				>
					{data.weeks.map((week, wi) =>
						week.contributionDays.map((day) => (
							<rect
								key={`${wi}-${day.date}`}
								x={wi * (cell + gap)}
								y={day.weekday * (cell + gap)}
								width={cell}
								height={cell}
								rx={2}
								ry={2}
								fill={LEVEL_COLORS[level(day.contributionCount)]}
							>
								<title>
									{day.date}: {day.contributionCount}{" "}
									contribution
									{day.contributionCount === 1 ? "" : "s"}
								</title>
							</rect>
						)),
					)}
				</svg>
			</div>
			<div
				className="flex items-center gap-2 text-[10px]"
				style={{ color: "#6a7078" }}
			>
				<span>less</span>
				{LEVEL_COLORS.map((c) => (
					<span
						key={c}
						className="inline-block rounded-[2px]"
						style={{ width: 10, height: 10, background: c }}
					/>
				))}
				<span>more</span>
			</div>
		</div>
	);
}
