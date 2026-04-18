"use client";

import { useEffect, useState, useRef } from "react";
import {
	BOOT_LINES,
	TAGLINE,
	ASCII_BANNER,
	NEOFETCH_LOGO,
	NEOFETCH_DATA,
} from "@/src/data/terminal";

type Props = {
	onComplete: () => void;
};

export default function BootSequence({ onComplete }: Props) {
	const [visibleLines, setVisibleLines] = useState<number>(0);
	const [showHero, setShowHero] = useState(false);
	const [typedText, setTypedText] = useState("");
	const [showCursor, setShowCursor] = useState(false);
	const [typingDone, setTypingDone] = useState(false);
	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;

	useEffect(() => {
		let cancelled = false;

		async function run() {
			// Boot lines
			for (let i = 0; i < BOOT_LINES.length; i++) {
				if (cancelled) return;
				await sleep(80 + Math.random() * 100);
				setVisibleLines(i + 1);
			}

			await sleep(150);
			if (cancelled) return;
			setShowHero(true);
			setShowCursor(true);

			// Typewriter
			for (let i = 0; i < TAGLINE.length; i++) {
				if (cancelled) return;
				const delay = TAGLINE[i] === " " ? 5 : 8 + Math.random() * 18;
				await sleep(delay);
				setTypedText(TAGLINE.slice(0, i + 1));
			}

			await sleep(300);
			if (cancelled) return;
			setShowCursor(false);
			setTypingDone(true);
			onCompleteRef.current();
		}

		run();
		return () => {
			cancelled = true;
		};
	}, []);

	const colorSwatches = [
		"var(--term-bg2)",
		"var(--term-red)",
		"var(--term-green)",
		"var(--term-amber)",
		"var(--term-blue)",
		"var(--term-mag)",
		"var(--term-cyan)",
		"var(--term-ink)",
	];

	return (
		<div>
			{/* Boot lines */}
			<div className="text-[12px]" style={{ color: "var(--term-dim)" }}>
				{BOOT_LINES.slice(0, visibleLines).map(([t, line], i) => (
					<div key={i} className="animate-[fi_180ms_ease-out]">
						<span style={{ color: "var(--term-faint)" }}>{t}</span>{" "}
						<span
							className="font-medium"
							style={{ color: "var(--term-green)" }}
						>
							[ OK ]
						</span>{" "}
						<BootBar />{" "}
						<BootLineText text={line} />
					</div>
				))}
			</div>

			{/* Hero */}
			{showHero && (
				<div>
					{/* Neofetch */}
					<div className="grid grid-cols-[220px_1fr] gap-8 my-3.5 text-[12.5px] max-md:grid-cols-1 max-md:gap-3.5">
						<pre
							className="whitespace-pre text-[10px] leading-[1.05]"
							style={{ color: "var(--term-amber)" }}
						>
							{NEOFETCH_LOGO}
						</pre>
						<div>
							<div className="py-[1px]">
								<span
									className="font-semibold"
									style={{ color: "var(--term-mag)" }}
								>
									sehal
								</span>
								<span style={{ color: "var(--term-dim)" }}>
									@
								</span>
								<span
									className="font-semibold"
									style={{ color: "var(--term-mag)" }}
								>
									home
								</span>
							</div>
							<div className="py-[1px]">─────────────</div>
							{Object.entries(NEOFETCH_DATA).map(
								([key, value]) => (
									<div key={key} className="py-[1px]">
										<span
											className="font-semibold"
											style={{
												color: "var(--term-green)",
											}}
										>
											{key.charAt(0).toUpperCase() +
												key.slice(1)}
										</span>
										{padTo(key, 9)}: {key === "status" ? (
											<span
												style={{
													color: "var(--term-green)",
												}}
											>
												● {value}
											</span>
										) : (
											value
										)}
									</div>
								),
							)}
							<div className="flex gap-0 mt-1.5">
								{colorSwatches.map((bg, i) => (
									<span
										key={i}
										className="block w-[22px] h-[14px]"
										style={{ background: bg }}
									/>
								))}
							</div>
						</div>
					</div>

					{/* ASCII Banner */}
					<pre
						className="font-medium whitespace-pre text-[11px] leading-[1.05] my-3.5 max-sm:text-[6.8px]"
						style={{ color: "var(--term-green)" }}
					>
						{ASCII_BANNER}
					</pre>

					{/* Tagline with typewriter */}
					<p className="mb-4 max-w-[72ch]">
						{typedText}
						{showCursor && (
							<span
								className="inline-block w-[9px] h-[16px] align-[-3px] ml-[2px] animate-[blink_1.05s_steps(1)_infinite]"
								style={{ background: "var(--term-ink)" }}
							/>
						)}
					</p>

					{/* Help hint */}
					{typingDone && (
						<p
							className="text-[14px] mt-2"
							style={{ color: "var(--term-dim)" }}
						>
							type{" "}
							<span style={{ color: "var(--term-green)" }}>
								help
							</span>{" "}
							or{" "}
							<span style={{ color: "var(--term-green)" }}>
								?
							</span>{" "}
							·{" "}
							<span style={{ color: "var(--term-green)" }}>
								Tab
							</span>{" "}
							complete ·{" "}
							<span style={{ color: "var(--term-green)" }}>
								↑/↓
							</span>{" "}
							history ·{" "}
							<span style={{ color: "var(--term-green)" }}>
								:colorscheme &lt;name&gt;
							</span>{" "}
							·{" "}
							<span style={{ color: "var(--term-green)" }}>
								:set crt
							</span>
						</p>
					)}
				</div>
			)}
		</div>
	);
}

function BootBar() {
	return (
		<span
			className="inline-block w-[180px] h-[6px] rounded-[1px] align-[0] mx-2 overflow-hidden relative"
			style={{ background: "var(--term-faint)" }}
		>
			<span
				className="absolute inset-0 animate-[barfill_0.8s_ease-out_forwards]"
				style={{
					background: "var(--term-green)",
					right: "100%",
				}}
			/>
		</span>
	);
}

function BootLineText({ text }: { text: string }) {
	// The boot lines contain a <span class='ok'> for the username highlight.
	// Since the content is fully hardcoded (not user input), we parse it safely.
	if (text.includes("<span class='ok'>")) {
		const match = text.match(/^(.*)<span class='ok'>(.*)<\/span>(.*)$/);
		if (match) {
			return (
				<span>
					{match[1]}
					<span style={{ color: "var(--term-green)" }}>{match[2]}</span>
					{match[3]}
				</span>
			);
		}
	}
	return <span>{text}</span>;
}

function padTo(key: string, len: number): string {
	return " ".repeat(Math.max(0, len - key.length));
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
