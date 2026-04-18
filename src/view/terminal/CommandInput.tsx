"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
	COMMAND_REGISTRY,
	PALETTE_NAMES,
	PROJECTS,
	HOME_FILES,
	VIM_FILES,
	MOBILE_CHIPS,
} from "@/src/data/terminal";

type Props = {
	cwd: string;
	ps1: string | null;
	onCommand: (cmd: string) => void;
	onClear: () => void;
};

const COMMAND_LIST = Object.keys(COMMAND_REGISTRY);
const DIR_NAMES = ["projects", "experience", "~"];
const FILE_NAMES = HOME_FILES.filter(
	([, , n]) => !n.endsWith("/"),
).map(([, , n]) => n as string);
const EDITABLE_FILES = Object.keys(VIM_FILES);

export default function CommandInput({ cwd, ps1, onCommand, onClear }: Props) {
	const [value, setValue] = useState("");
	const [ghost, setGhost] = useState("");
	const [history, setHistory] = useState<string[]>([]);
	const [historyIdx, setHistoryIdx] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		try {
			const saved = JSON.parse(
				localStorage.getItem("terminal-history") || "[]",
			);
			setHistory(saved);
			setHistoryIdx(saved.length);
		} catch {
			/* ignore */
		}
	}, []);

	const saveHistory = useCallback((newHistory: string[]) => {
		const trimmed = newHistory.slice(-200);
		setHistory(trimmed);
		setHistoryIdx(trimmed.length);
		try {
			localStorage.setItem("terminal-history", JSON.stringify(trimmed));
		} catch {
			/* ignore */
		}
	}, []);

	const computeGhost = useCallback(
		(val: string): string => {
			if (!val) return "";

			// :colorscheme / theme <partial>
			const cs = val.match(/^(:colorscheme|theme)\s+(\S*)$/i);
			if (cs) {
				const partial = cs[2].toLowerCase();
				const hit = PALETTE_NAMES.find(
					(p) => p.startsWith(partial) && p !== partial,
				);
				return hit ? hit.slice(partial.length) : "";
			}

			// project <partial>
			const pr = val.match(/^project\s+(\S*)$/);
			if (pr) {
				const partial = pr[1].toLowerCase();
				const hit = PROJECTS.map((p) => p.slug).find(
					(s) => s.startsWith(partial) && s !== partial,
				);
				return hit ? hit.slice(partial.length) : "";
			}

			// cd <partial>
			const cd = val.match(/^cd\s+(\S*)$/);
			if (cd) {
				const partial = cd[1].toLowerCase();
				const hit = DIR_NAMES.find(
					(s) => s.startsWith(partial) && s !== partial,
				);
				return hit ? hit.slice(partial.length) : "";
			}

			// ls <partial>
			const ls = val.match(/^ls\s+(\S*)$/);
			if (ls) {
				const partial = ls[1];
				if (partial.startsWith("-")) {
					const flags = ["-la", "-l", "-lh", "--sort=date"];
					const hit = flags.find(
						(f) => f.startsWith(partial) && f !== partial,
					);
					return hit ? hit.slice(partial.length) : "";
				}
				const hit = DIR_NAMES.find(
					(s) => s.startsWith(partial) && s !== partial,
				);
				return hit ? hit.slice(partial.length) : "";
			}

			// cat <partial>
			const cat = val.match(/^cat\s+(\S*)$/);
			if (cat) {
				const partial = cat[1].toLowerCase();
				const files =
					cwd === "~"
						? FILE_NAMES
						: cwd === "~/projects"
							? PROJECTS.map((p) => p.slug)
							: [];
				const hit = files.find(
					(f) => f.startsWith(partial) && f !== partial,
				);
				return hit ? hit.slice(partial.length) : "";
			}

			// vim / nvim <partial>
			const vim = val.match(/^(vim|nvim)\s+(\S*)$/);
			if (vim) {
				const partial = vim[2].toLowerCase();
				const hit = EDITABLE_FILES.find(
					(f) => f.startsWith(partial) && f !== partial,
				);
				return hit ? hit.slice(partial.length) : "";
			}

			// git <partial>
			const git = val.match(/^git\s+(\S*)$/);
			if (git) {
				const partial = git[1].toLowerCase();
				const hit = ["log", "status", "diff"].find(
					(s) => s.startsWith(partial) && s !== partial,
				);
				return hit ? hit.slice(partial.length) : "";
			}

			// :set <partial>
			const set = val.match(/^:set\s+(\S*)$/);
			if (set) {
				const partial = set[1].toLowerCase();
				const hit = ["crt", "nocrt", "ps1"].find(
					(s) => s.startsWith(partial) && s !== partial,
				);
				return hit ? hit.slice(partial.length) : "";
			}

			// Command name completion
			const [first, ...rest] = val.split(/\s+/);
			if (rest.length > 0) return "";
			const hit = COMMAND_LIST.find(
				(c) =>
					c.toLowerCase().startsWith(first.toLowerCase()) &&
					c.toLowerCase() !== first.toLowerCase(),
			);
			return hit ? hit.slice(first.length) : "";
		},
		[cwd],
	);

	useEffect(() => {
		setGhost(computeGhost(value));
	}, [value, computeGhost]);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			const cmd = value;
			setValue("");
			setGhost("");
			if (cmd.trim()) {
				saveHistory([...history, cmd]);
			}
			onCommand(cmd);
		} else if (e.key === "Tab") {
			e.preventDefault();
			const comp = computeGhost(value);
			if (comp) {
				setValue(value + comp);
			}
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (history.length && historyIdx > 0) {
				const newIdx = historyIdx - 1;
				setHistoryIdx(newIdx);
				setValue(history[newIdx]);
			}
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			if (historyIdx < history.length - 1) {
				const newIdx = historyIdx + 1;
				setHistoryIdx(newIdx);
				setValue(history[newIdx]);
			} else {
				setHistoryIdx(history.length);
				setValue("");
			}
		} else if ((e.ctrlKey || e.metaKey) && e.key === "l") {
			e.preventDefault();
			onClear();
		} else if (e.ctrlKey && e.key === "c") {
			setValue("");
			setGhost("");
		}
	};

	return (
		<>
			<form
				className="flex gap-2.5 mt-5 items-baseline"
				autoComplete="off"
				onSubmit={(e) => e.preventDefault()}
				data-lpignore="true"
			>
				<PromptDisplay ps1={ps1} cwd={cwd} />
				<div className="flex-1 relative">
					<input
						ref={inputRef}
						type="search"
						name="terminal-search-input"
						className="w-full bg-transparent border-none outline-none p-0 appearance-none"
						style={{
							color: "var(--term-ink)",
							caretColor: "var(--term-green)",
							fontFamily: "inherit",
							fontSize: "inherit",
							WebkitAppearance: "none",
						}}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={handleKeyDown}
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck={false}
						data-1p-ignore
						data-lpignore="true"
						data-form-type="other"
						role="combobox"
						aria-autocomplete="none"
						aria-expanded={false}
					/>
					{ghost && (
						<div
							className="absolute left-0 top-0 pointer-events-none whitespace-pre"
							style={{ color: "var(--term-faint)" }}
						>
							{value}
							{ghost}
						</div>
					)}
				</div>
			</form>

			{/* Mobile chips */}
			<div
				className="fixed bottom-0 left-0 right-0 px-3.5 py-2.5 flex gap-2 overflow-x-auto z-[100] md:hidden"
				style={{
					background: `linear-gradient(to top, var(--term-bg2) 70%, transparent)`,
					scrollbarWidth: "none",
				}}
			>
				{MOBILE_CHIPS.map((cmd) => (
					<button
						key={cmd}
						type="button"
						className="whitespace-nowrap text-[11.5px] px-3 py-[7px] rounded-full cursor-pointer transition-all shrink-0"
						style={{
							background: "var(--term-bg2)",
							border: "1px solid var(--term-rule)",
							color: "var(--term-ink)",
							fontFamily: "inherit",
						}}
						onClick={() => onCommand(cmd)}
					>
						{cmd}
					</button>
				))}
			</div>
		</>
	);
}

function PromptDisplay({ ps1, cwd }: { ps1: string | null; cwd: string }) {
	if (ps1) {
		// Parse simple PS1 format tokens into spans
		const formatted = ps1
			.replace(/%n/g, "sehal")
			.replace(/%m/g, "home")
			.replace(/%~/g, cwd)
			.replace(/%#/g, "$")
			.replace(/%F\{[^}]+\}/g, "")
			.replace(/%f/g, "");
		return <span className="shrink-0">{formatted}</span>;
	}

	return (
		<span className="shrink-0">
			<span style={{ color: "var(--term-green)" }}>sehal</span>
			<span style={{ color: "var(--term-dim)" }}>@</span>
			<span style={{ color: "var(--term-blue)" }}>home</span>
			<span style={{ color: "var(--term-dim)" }}>:</span>
			<span style={{ color: "var(--term-mag)" }}>{cwd}</span>
			<span style={{ color: "var(--term-dim)" }}>$</span>
		</span>
	);
}
