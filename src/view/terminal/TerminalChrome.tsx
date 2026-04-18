"use client";

import { useEffect, useState } from "react";

type Props = {
	cwd: string;
};

export default function TerminalChrome({ cwd }: Props) {
	const [time, setTime] = useState("--:--:--");

	useEffect(() => {
		function tick() {
			setTime(
				new Date().toLocaleTimeString("en-US", { hour12: false }),
			);
		}
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, []);

	return (
		<div
			className="flex items-center gap-2.5 px-4 py-2.5 sticky top-0 z-10"
			style={{
				borderBottom: "1px solid var(--term-rule)",
				background: "var(--term-bg2)",
			}}
		>
			<div className="flex gap-[7px]">
				<span className="w-[11px] h-[11px] rounded-full bg-[#ff5f56] block" />
				<span className="w-[11px] h-[11px] rounded-full bg-[#ffbd2e] block" />
				<span className="w-[11px] h-[11px] rounded-full bg-[#27c93f] block" />
			</div>
			<div
				className="flex-1 text-center text-[11px] tracking-[0.05em]"
				style={{ color: "var(--term-dim)" }}
			>
				sehal@home:{cwd} — zsh — {time}
			</div>
			<div
				className="text-[10px] flex gap-3.5"
				style={{ color: "var(--term-faint)" }}
			>
				<span style={{ color: "var(--term-green)" }}>● live</span>
				<span>{time}</span>
			</div>
		</div>
	);
}
