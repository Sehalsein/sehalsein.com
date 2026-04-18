"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Props = {
	filename: string;
	lines: string[];
	onClose: (savedContent: string[] | null) => void;
};

export default function VimOverlay({ filename, lines, onClose }: Props) {
	const [text, setText] = useState(lines.join("\n"));
	const [cmdValue, setCmdValue] = useState("");
	const [statusMsg, setStatusMsg] = useState("");
	const [mode, setMode] = useState<"normal" | "insert">("normal");
	const cmdRef = useRef<HTMLInputElement>(null);
	const textRef = useRef<HTMLTextAreaElement>(null);
	const lineNumRef = useRef<HTMLDivElement>(null);

	const lineCount = text.split("\n").length;

	useEffect(() => {
		textRef.current?.focus();
	}, []);

	// Sync scroll between line numbers and textarea
	const handleScroll = useCallback(() => {
		if (textRef.current && lineNumRef.current) {
			lineNumRef.current.scrollTop = textRef.current.scrollTop;
		}
	}, []);

	const handleCmdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			const v = cmdValue.trim();
			if (v === ":q" || v === ":q!" || v === "q") {
				onClose(null);
			} else if (v === ":wq" || v === ":x" || v === ":w") {
				onClose(text.split("\n"));
			} else {
				setStatusMsg("not a real vim. try :q to quit, :wq to save.");
				setCmdValue("");
			}
		} else if (e.key === "Escape") {
			// Back to textarea
			textRef.current?.focus();
			setMode("insert");
		}
	};

	const handleTextKeyDown = (
		e: React.KeyboardEvent<HTMLTextAreaElement>,
	) => {
		if (e.key === "Escape") {
			setMode("normal");
			cmdRef.current?.focus();
		}
	};

	const handleTextFocus = () => {
		setMode("insert");
	};

	return (
		<div
			className="fixed inset-0 z-[10000] flex flex-col"
			style={{
				background: "var(--term-bg)",
				color: "var(--term-ink)",
				fontFamily: "inherit",
				fontSize: "13.5px",
				lineHeight: "1.65",
			}}
		>
			{/* Editor body — line numbers + textarea side by side */}
			<div className="flex-1 flex overflow-hidden">
				{/* Line numbers */}
				<div
					ref={lineNumRef}
					className="overflow-hidden select-none py-2 pl-2 pr-1 text-right shrink-0"
					style={{
						color: "var(--term-faint)",
						width: "48px",
						lineHeight: "1.65",
					}}
				>
					{Array.from({ length: lineCount }, (_, i) => (
						<div key={i}>{i + 1}</div>
					))}
				</div>

				{/* Editable textarea */}
				<textarea
					ref={textRef}
					className="flex-1 bg-transparent border-none outline-none resize-none py-2 px-2 overflow-auto"
					style={{
						color: "var(--term-ink)",
						caretColor: "var(--term-green)",
						fontFamily: "inherit",
						fontSize: "inherit",
						lineHeight: "1.65",
						tabSize: 4,
					}}
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={handleTextKeyDown}
					onScroll={handleScroll}
					onFocus={handleTextFocus}
					spellCheck={false}
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
				/>
			</div>

			{/* Status bar */}
			<div
				className="px-3 py-[2px] text-[12px] font-semibold flex justify-between shrink-0"
				style={{
					background: "var(--term-green)",
					color: "var(--term-bg)",
				}}
			>
				<span>
					{mode === "insert" ? "-- INSERT --" : "NORMAL"} ·{" "}
					{filename}
				</span>
				<span>{lineCount}L · utf-8 · markdown</span>
			</div>

			{/* Command line */}
			<div
				className="px-3 py-1 text-[12.5px] flex gap-1.5 items-center shrink-0"
				style={{
					background: "var(--term-bg)",
					borderTop: "1px solid var(--term-rule)",
				}}
			>
				{statusMsg ? (
					<span
						className="text-[11px] flex-1"
						style={{ color: "var(--term-red)" }}
					>
						{statusMsg}
					</span>
				) : (
					<span
						className="text-[11px] flex-1"
						style={{ color: "var(--term-dim)" }}
					>
						Esc → command mode · :q quit · :wq save &amp; quit
					</span>
				)}
				<span style={{ color: "var(--term-dim)" }}>:</span>
				<input
					ref={cmdRef}
					type="text"
					name="vim-cmd-input"
					className="bg-transparent border-none outline-none p-0 w-32"
					style={{
						color: "var(--term-ink)",
						fontFamily: "inherit",
						fontSize: "inherit",
					}}
					value={cmdValue}
					onChange={(e) => {
						setCmdValue(e.target.value);
						setStatusMsg("");
					}}
					onKeyDown={handleCmdKeyDown}
					placeholder=":q or :wq"
					spellCheck={false}
					autoComplete="off"
					data-1p-ignore
					data-lpignore="true"
					data-form-type="other"
				/>
			</div>
		</div>
	);
}
