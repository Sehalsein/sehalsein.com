"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import TerminalChrome from "./TerminalChrome";
import BootSequence from "./BootSequence";
import CommandInput from "./CommandInput";
import VimOverlay from "./VimOverlay";
import MatrixOverlay from "./MatrixOverlay";
import AiChatMode from "./AiChatMode";
import ContributionsInline from "./ContributionsInline";
import GuestbookInline from "./GuestbookInline";
import Copyable from "./Copyable";
import { authClient } from "@/src/lib/authClient";
import { useTheme } from "next-themes";
import type { PaletteName } from "@/src/data/terminal";
import {
	PROJECTS,
	EXPERIENCE,
	ABOUT_PARAS,
	NEOFETCH_LOGO,
	NEOFETCH_DATA,
	ASCII_BANNER,
	FORTUNES,
	GIT_COMMITS,
	PALETTE_NAMES,
	COMMAND_GROUPS,
	COMMAND_REGISTRY,
	HOME_FILES,
	VIM_FILES,
} from "@/src/data/terminal";
import { RESUME_DATA } from "@/src/data/resume";
import { NOW_LAST_UPDATED, NOW_SECTIONS } from "@/src/data/now";

type OutputEntry = {
	id: number;
	content: ReactNode;
};

let entryId = Date.now();
function nextId() {
	return entryId++;
}

export default function TerminalPage() {
	const { theme, setTheme } = useTheme();
	const palette = (theme as PaletteName | undefined) ?? "default";
	const [crt, setCrtState] = useState(false);
	const [cwd, setCwd] = useState("~");
	const [ps1, setPs1] = useState<string | null>(null);
	const [output, setOutput] = useState<OutputEntry[]>([]);
	const [bootDone, setBootDone] = useState(false);
	const [overlay, setOverlay] = useState<
		null | { type: "vim"; file: string } | { type: "matrix" }
	>(null);
	const [aiChatActive, setAiChatActive] = useState(false);
	const [aiOutputIds, setAiOutputIds] = useState<number[]>([]);
	const [fileStore, setFileStore] = useState<Record<string, string[]>>(() => {
		const store: Record<string, string[]> = {};
		for (const [name, lines] of Object.entries(VIM_FILES)) {
			store[name] = lines.map(([text]) => text);
		}
		return store;
	});

	const bottomRef = useRef<HTMLDivElement>(null);
	const screenRef = useRef<HTMLDivElement>(null);

	// Restore non-palette preferences (palette itself is managed by next-themes).
	useEffect(() => {
		const savedCrt = localStorage.getItem("terminal-crt");
		if (savedCrt === "true") setCrtState(true);
		const savedPs1 = localStorage.getItem("terminal-ps1");
		if (savedPs1) setPs1(savedPs1);
	}, []);

	const setPalette = useCallback(
		(p: PaletteName) => {
			setTheme(p);
		},
		[setTheme],
	);

	const setCrt = useCallback((on: boolean) => {
		setCrtState(on);
		localStorage.setItem("terminal-crt", String(on));
	}, []);

	// Auto-scroll
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [output]);

	// Click to focus
	const handleScreenClick = useCallback(() => {
		if (window.getSelection()?.toString()) return;
		if (overlay) return;
		const input = document.querySelector(
			'input[autocomplete="off"]',
		) as HTMLInputElement;
		input?.focus();
	}, [overlay]);

	// Prompt HTML builder
	const promptNode = useCallback(
		(cmd: string) => (
			<div className="flex gap-2.5 flex-wrap mt-4.5">
				<span style={{ color: "var(--term-green)" }}>sehal</span>
				<span style={{ color: "var(--term-dim)" }}>@</span>
				<span style={{ color: "var(--term-blue)" }}>home</span>
				<span style={{ color: "var(--term-dim)" }}>:</span>
				<span style={{ color: "var(--term-mag)" }}>{cwd}</span>
				<span style={{ color: "var(--term-dim)" }}>$</span>
				<span style={{ color: "var(--term-ink)" }}>{cmd}</span>
			</div>
		),
		[cwd],
	);

	const print = useCallback(
		(...nodes: ReactNode[]) => {
			setOutput((prev) => [
				...prev,
				...nodes.map((n) => ({ id: nextId(), content: n })),
			]);
		},
		[],
	);

	const clearOutput = useCallback(() => {
		setOutput([]);
	}, []);

	// ── COMMAND HANDLERS ──
	const runCommand = useCallback(
		(raw: string) => {
			const cmd = raw.trim();
			if (cmd === "") {
				print(promptNode(""));
				return;
			}

			print(promptNode(cmd));

			// PS1= assignment
			const ps1Match = cmd.match(/^PS1\s*=\s*['"]?(.+?)['"]?\s*$/);
			if (ps1Match) {
				setPs1(ps1Match[1]);
				localStorage.setItem("terminal-ps1", ps1Match[1]);
				print(<Ok text="PS1 set" />);
				return;
			}

			// :colorscheme / theme
			const csMatch = cmd.match(
				/^(?::colorscheme|theme)\s+(\S+)/i,
			);
			if (csMatch) {
				doColorscheme(csMatch[1]);
				return;
			}
			if (/^(?::colorscheme|theme)$/i.test(cmd)) {
				doColorscheme(null);
				return;
			}

			const [name, ...args] = cmd.split(/\s+/);
			const lower = name.toLowerCase();

			const handler = HANDLERS[lower] || HANDLERS[name];
			if (handler) {
				handler(args);
				return;
			}

			print(
				<span>
					<span style={{ color: "var(--term-red)" }}>
						zsh: command not found: {escapeText(name)}
					</span>{" "}
					— try{" "}
					<span style={{ color: "var(--term-green)" }}>help</span>
				</span>,
			);
			updateHash(cmd);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[cwd, ps1, fileStore],
	);

	function doColorscheme(name: string | null) {
		if (!name) {
			print(
				<span>
					<Dim>current:</Dim>{" "}
					<Ok text={palette} />
				</span>,
				<span>
					<Dim>available:</Dim>{" "}
					{PALETTE_NAMES.map((p, i) => (
						<span key={p}>
							{i > 0 && " · "}
							<span style={{ color: "var(--term-green)" }}>
								{p}
							</span>
						</span>
					))}
				</span>,
			);
			return;
		}
		const lower = name.toLowerCase() as PaletteName;
		if (!PALETTE_NAMES.includes(lower)) {
			print(
				<span style={{ color: "var(--term-red)" }}>
					unknown colorscheme: {escapeText(name)} — try:{" "}
					{PALETTE_NAMES.join(", ")}
				</span>,
			);
			return;
		}
		setPalette(lower);
		print(
			<span>
				<Ok text="✓" /> colorscheme set to <Ok text={lower} />
			</span>,
		);
	}

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const HANDLERS: Record<string, (args: string[]) => void> = {
		help: () => {
			print(
				<div
					className="py-2.5 px-4 my-1.5 text-[12.5px]"
					style={{
						background: "var(--term-bg)",
						borderLeft: "2px solid var(--term-blue)",
					}}
				>
					<h5
						className="mb-1.5 text-[11px] tracking-[0.08em] uppercase font-medium"
						style={{ color: "var(--term-amber)" }}
					>
						available commands
					</h5>
					{COMMAND_GROUPS.map(([group, cmds]) => (
						<div key={group}>
							<div
								className="text-[10px] tracking-[0.1em] uppercase my-2"
								style={{ color: "var(--term-dim)" }}
							>
								── {group}
							</div>
							{cmds.map((c) => (
								<div key={c}>
									<span
										className="inline-block min-w-[130px]"
										style={{
											color: "var(--term-green)",
										}}
									>
										{c}
									</span>
									<span
										style={{
											color: "var(--term-dim)",
										}}
									>
										{COMMAND_REGISTRY[c] || ""}
									</span>
								</div>
							))}
						</div>
					))}
					<div
						className="mt-2.5 text-[11px]"
						style={{ color: "var(--term-faint)" }}
					>
						Tab completes · ↑/↓ history · Ctrl+L clear · ? help
					</div>
				</div>,
			);
		},
		"?": function (args) { HANDLERS.help(args); },
		about: () => {
			print(
				<SectionHeader text="About" />,
				<div className="max-w-[74ch]">
					{ABOUT_PARAS.map((p, i) => (
						<p key={i} className="mb-[0.95em]">
							<FormattedText text={p} />
						</p>
					))}
				</div>,
			);
			updateHash("about");
		},
		work: function (args) { HANDLERS.projects(args); },
		projects: () => {
			print(
				<table
					className="w-full border-collapse my-1.5 text-[12.5px]"
					style={{ borderSpacing: 0 }}
				>
					<thead>
						<tr>
							{["year", "project", "description", "role"].map(
								(h) => (
									<th
										key={h}
										className="text-left pr-3.5 pb-2 text-[10px] tracking-[0.08em] uppercase font-normal"
										style={{
											color: "var(--term-dim)",
											borderBottom:
												"1px solid var(--term-rule)",
										}}
									>
										{h}
									</th>
								),
							)}
						</tr>
					</thead>
					<tbody>
						{PROJECTS.map((p) => (
							<tr
								key={p.slug}
								className="cursor-pointer transition-colors"
							>
								<td
									className="pr-3.5 py-2 whitespace-nowrap"
									style={{
										color: "var(--term-dim)",
										borderBottom:
											"1px dashed var(--term-rule)",
									}}
								>
									{p.year}
								</td>
								<td
									className="pr-3.5 py-2 font-medium"
									style={{
										color: "var(--term-blue)",
										borderBottom:
											"1px dashed var(--term-rule)",
									}}
								>
									<span
										style={{
											color: "var(--term-faint)",
										}}
									>
										./
									</span>
									{p.slug}/
								</td>
								<td
									className="pr-3.5 py-2"
									style={{
										borderBottom:
											"1px dashed var(--term-rule)",
									}}
								>
									{p.desc}
								</td>
								<td
									className="py-2 text-[10px] tracking-[0.06em] uppercase whitespace-nowrap"
									style={{
										color: "var(--term-amber)",
										borderBottom:
											"1px dashed var(--term-rule)",
									}}
								>
									{p.role}
								</td>
							</tr>
						))}
					</tbody>
				</table>,
				<Dim>
					→ try:{" "}
					<span style={{ color: "var(--term-green)" }}>
						project {PROJECTS[0]?.slug}
					</span>
				</Dim>,
			);
			updateHash("work");
		},
		project: (args) => {
			const slug = args[0]?.toLowerCase();
			if (!slug) {
				print(
					<span style={{ color: "var(--term-red)" }}>
						usage: project &lt;slug&gt; — one of:{" "}
						{PROJECTS.map((p) => p.slug).join(", ")}
					</span>,
				);
				return;
			}
			const p = PROJECTS.find((x) => x.slug === slug);
			if (!p) {
				print(
					<span style={{ color: "var(--term-red)" }}>
						no such project: {escapeText(slug)}
					</span>,
				);
				return;
			}
			print(
				<div>
					<SectionHeader text={p.company} />
					<Dim>
						{p.year} · {p.role}
					</Dim>
					<p className="mt-2 max-w-[74ch]">{p.desc}</p>
				</div>,
			);
			updateHash(p.slug);
		},
		experience: function (args) { HANDLERS.xp(args); },
		xp: () => {
			print(
				<div className="text-[12.5px] my-1.5" style={{ color: "var(--term-dim)" }}>
					<div>
						<span style={{ color: "var(--term-faint)" }}>
							experience/
						</span>
					</div>
					{EXPERIENCE.map((e, i) => {
						const last = i === EXPERIENCE.length - 1;
						const conn = last ? "└── " : "├── ";
						const child = last ? "    " : "│   ";
						return (
							<div key={e.company}>
								<div>
									<span
										style={{
											color: "var(--term-faint)",
										}}
									>
										{conn}
									</span>
									<span
										style={{
											color: "var(--term-blue)",
											fontWeight: 500,
										}}
									>
										{e.company}
									</span>
									{"  "}
									<span
										style={{
											color: "var(--term-amber)",
										}}
									>
										@ {e.duration}
									</span>
								</div>
								<div>
									<span
										style={{
											color: "var(--term-faint)",
										}}
									>
										{child}└── {" "}
									</span>
									<span
										style={{
											color: "var(--term-ink)",
										}}
									>
										{e.position}
									</span>
								</div>
							</div>
						);
					})}
				</div>,
			);
			updateHash("experience");
		},
		contact: () => {
			print(
				<div
					className="py-2.5 px-4 my-1.5 text-[12.5px]"
					style={{
						background: "var(--term-bg)",
						borderLeft: "2px solid var(--term-blue)",
					}}
				>
					<h5
						className="mb-1.5 text-[11px] tracking-[0.08em] uppercase font-medium"
						style={{ color: "var(--term-amber)" }}
					>
						contact
					</h5>
					<div>
						<CmdName>email</CmdName>{" "}
						<a
							href={`mailto:${RESUME_DATA.email}`}
							style={{ color: "var(--term-blue)" }}
						>
							{RESUME_DATA.email}
						</a>
					</div>
					{RESUME_DATA.social.map((s) => (
						<div key={s.name}>
							<CmdName>{s.name.toLowerCase()}</CmdName>{" "}
							<a
								href={s.url}
								target="_blank"
								rel="noopener noreferrer"
								style={{ color: "var(--term-blue)" }}
							>
								{s.url.replace("https://www.", "")}
							</a>
						</div>
					))}
					<div
						className="mt-2.5 text-[11px]"
						style={{ color: "var(--term-dim)" }}
					>
						# replies within 1–2 business days
					</div>
				</div>,
			);
			updateHash("contact");
		},
		gpg: () => {
			print(
				<div
					className="my-2 p-3 text-[11.5px] rounded max-w-[640px]"
					style={{
						border: "1px solid var(--term-rule)",
						color: "var(--term-dim)",
					}}
				>
					<div
						className="text-[10px] tracking-[0.08em] uppercase mb-1.5"
						style={{ color: "var(--term-amber)" }}
					>
						PGP public key · ed25519
					</div>
					<div style={{ wordBreak: "break-all", letterSpacing: "0.05em" }}>
						<span style={{ color: "var(--term-green)", fontWeight: 500 }}>pub</span>
						{"   "}ed25519/
						<span style={{ color: "var(--term-green)", fontWeight: 500 }}>
							7E3F A12D 9C4B 0A85
						</span>
						{"  "}2024-03-11 [SC]
						<br />
						Key fingerprint ={" "}
						<span style={{ color: "var(--term-green)", fontWeight: 500 }}>
							7E3F A12D 9C4B 0A85 · 3D1F 28C0 E711 9AB4 · 5C02
							FF6A
						</span>
						<br />
						<span style={{ color: "var(--term-green)", fontWeight: 500 }}>uid</span>
						{"   "}Sehal Sein &lt;{RESUME_DATA.email}&gt;
					</div>
				</div>,
			);
		},
		ssh: () => {
			print(
				<div
					className="my-2 p-3 text-[11.5px] rounded max-w-[640px]"
					style={{
						border: "1px solid var(--term-rule)",
						color: "var(--term-dim)",
					}}
				>
					<div
						className="text-[10px] tracking-[0.08em] uppercase mb-1.5"
						style={{ color: "var(--term-amber)" }}
					>
						SSH public key · ed25519
					</div>
					<div style={{ wordBreak: "break-all" }}>
						<span style={{ color: "var(--term-green)", fontWeight: 500 }}>
							SHA256:
						</span>
						kL9zQX3f7nP2vW6xY1bJ8hA4rT0mE5cUoI+D2K/sVpg
						<br />
						<Dim>
							ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKp...x8f2{" "}
							{RESUME_DATA.email}
						</Dim>
					</div>
				</div>,
			);
		},
		whoami: function (args) { HANDLERS.neofetch(args); },
		neofetch: () => {
			print(
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
							<span style={{ color: "var(--term-dim)" }}>@</span>
							<span
								className="font-semibold"
								style={{ color: "var(--term-mag)" }}
							>
								home
							</span>
						</div>
						<div className="py-[1px]">─────────────</div>
						{Object.entries(NEOFETCH_DATA).map(([key, value]) => (
							<div key={key} className="py-[1px]">
								<span
									className="font-semibold"
									style={{ color: "var(--term-green)" }}
								>
									{key.charAt(0).toUpperCase() + key.slice(1)}
								</span>
								{" ".repeat(Math.max(0, 9 - key.length))}:{" "}
								{key === "status" ? (
									<span style={{ color: "var(--term-green)" }}>
										● {value}
									</span>
								) : (
									value
								)}
							</div>
						))}
					</div>
				</div>,
			);
		},
		resume: () => {
			print(
				<span>
					<span style={{ color: "var(--term-green)" }}>→</span>{" "}
					<a
						href="/resume.pdf"
						download
						style={{ color: "var(--term-blue)" }}
					>
						downloading resume.pdf
					</a>{" "}
					<Dim>(246 KB)</Dim>
				</span>,
				<Dim>or try: experience</Dim>,
			);
			// Trigger download
			const a = document.createElement("a");
			a.href = "/resume.pdf";
			a.download = "sehal-sein-resume.pdf";
			a.click();
		},
		socials: () => {
			print(
				<span>
					{RESUME_DATA.social.map((s, i) => (
						<span key={s.name}>
							{i > 0 && " · "}
							<a
								href={s.url}
								target="_blank"
								rel="noopener noreferrer"
								style={{ color: "var(--term-blue)" }}
							>
								{s.url.replace("https://www.", "")}
							</a>
						</span>
					))}
				</span>,
			);
		},
		pwd: () => {
			print(
				<Dim>
					/home/sehal{cwd === "~" ? "" : cwd.replace(/^~/, "")}
				</Dim>,
			);
		},
		cd: (args) => {
			const dest = (args[0] || "~").trim();
			if (dest === "~" || dest === "" || dest === "/") {
				setCwd("~");
			} else if (dest === "..") {
				setCwd("~");
			} else if (dest === "projects" || dest === "~/projects") {
				setCwd("~/projects");
			} else if (dest === "experience" || dest === "~/experience") {
				setCwd("~/experience");
			} else {
				print(
					<span style={{ color: "var(--term-red)" }}>
						cd: no such file or directory: {escapeText(dest)}
					</span>,
				);
			}
		},
		ls: (args) => {
			const flags = (args.join(" ") || "").toLowerCase();
			if (cwd === "~/projects") {
				if (flags.includes("-l")) {
					print(
						<table className="border-collapse my-1.5 text-[12.5px]">
							<tbody>
								{PROJECTS.map((p) => (
									<tr key={p.slug}>
										<td
											className="pr-3.5 py-1 whitespace-nowrap text-[11.5px]"
											style={{ color: "var(--term-faint)" }}
										>
											{p.perm}
										</td>
										<td
											className="pr-3.5 py-1 whitespace-nowrap"
											style={{ color: "var(--term-dim)" }}
										>
											{p.size}
										</td>
										<td
											className="pr-3.5 py-1 whitespace-nowrap"
											style={{ color: "var(--term-dim)" }}
										>
											{p.year}
										</td>
										<td
											className="pr-3.5 py-1 font-medium"
											style={{ color: "var(--term-blue)" }}
										>
											<span style={{ color: "var(--term-faint)" }}>
												./
											</span>
											{p.slug}/
										</td>
										<td className="pr-3.5 py-1">
											{p.desc}
										</td>
									</tr>
								))}
							</tbody>
						</table>,
					);
					return;
				}
				HANDLERS.projects([]);
				return;
			}
			if (cwd === "~/experience") {
				HANDLERS.xp([]);
				return;
			}
			// Home directory
			if (flags.includes("-l")) {
				print(
					<table className="border-collapse my-1.5 text-[12.5px]">
						<tbody>
							{HOME_FILES.map(([perm, sz, name]) => (
								<tr key={name}>
									<td
										className="pr-3.5 py-1 whitespace-nowrap text-[11.5px]"
										style={{ color: "var(--term-faint)" }}
									>
										{perm}
									</td>
									<td
										className="pr-3.5 py-1 whitespace-nowrap"
										style={{ color: "var(--term-dim)" }}
									>
										{sz}
									</td>
									<td
										className="pr-3.5 py-1"
										style={{
											color: name.endsWith("/")
												? "var(--term-blue)"
												: "var(--term-ink)",
										}}
									>
										{name}
									</td>
								</tr>
							))}
						</tbody>
					</table>,
				);
				return;
			}
			print(
				<span>
					{HOME_FILES.map(([, , n], i) => (
						<span key={n}>
							{i > 0 && "   "}
							<span
								style={{
									color: n.endsWith("/")
										? "var(--term-blue)"
										: undefined,
								}}
							>
								{n}
							</span>
						</span>
					))}
				</span>,
			);
		},
		cat: (args) => {
			const f = (args[0] || "").toLowerCase();
			if (!f) {
				print(
					<span style={{ color: "var(--term-red)" }}>
						cat: missing file operand
					</span>,
				);
				return;
			}
			if (f === "about.md") {
				HANDLERS.about([]);
				return;
			}
			if (f === "contact.md") {
				HANDLERS.contact([]);
				return;
			}
			if (fileStore[f]) {
				print(
					<div className="max-w-[74ch]">
						{fileStore[f].map((line, i) => (
							<div key={i}>{line || "\u00A0"}</div>
						))}
					</div>,
				);
				return;
			}
			if (f === "pubkey.asc") {
				HANDLERS.gpg([]);
				return;
			}
			if (f === "id_ed25519.pub") {
				HANDLERS.ssh([]);
				return;
			}
			print(
				<span style={{ color: "var(--term-red)" }}>
					cat: {escapeText(f)}: No such file or directory
				</span>,
			);
		},
		vim: (args) => {
			const file = args[0] || "readme.md";
			setOverlay({ type: "vim", file });
		},
		nvim: function (args) { HANDLERS.vim(args); },
		git: (args) => {
			if (args[0] && args[0] !== "log") {
				print(
					<Dim>
						only{" "}
						<span style={{ color: "var(--term-green)" }}>
							git log
						</span>{" "}
						is implemented here.
					</Dim>,
				);
				return;
			}
			print(
				<div className="text-[12.5px] my-1.5">
					{GIT_COMMITS.map(([hash, ref, when, msg]) => (
						<div key={hash} className="py-1">
							<span style={{ color: "var(--term-amber)" }}>
								{hash}
							</span>
							{ref && (
								<span>
									{" "}
									<span style={{ color: "var(--term-red)" }}>
										(
										{ref.includes("HEAD") ? (
											<>
												<span
													style={{
														color: "var(--term-cyan)",
													}}
												>
													HEAD →
												</span>{" "}
												{ref.replace("HEAD → ", "")}
											</>
										) : (
											ref
										)}
										)
									</span>
								</span>
							)}
							<span style={{ color: "var(--term-dim)" }}>
								{" "}
								· {when}
							</span>
							<span
								className="ml-[2ch] block"
								style={{ color: "var(--term-ink)" }}
							>
								{msg}
							</span>
						</div>
					))}
				</div>,
			);
		},
		fortune: () => {
			const f =
				FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
			print(
				<span style={{ color: "var(--term-amber)" }}>{f}</span>,
			);
		},
		cowsay: (args) => {
			const msg =
				args.length > 0
					? args.join(" ")
					: FORTUNES[
							Math.floor(Math.random() * FORTUNES.length)
						];
			const top = " " + "_".repeat(msg.length + 2);
			const mid = `< ${msg} >`;
			const bot = " " + "‾".repeat(msg.length + 2);
			const cow = `         \\   ^__^
          \\  (oo)\\_______
             (__)\\       )\\/\\
                 ||----w |
                 ||     ||`;
			print(
				<pre
					className="whitespace-pre text-[12px] leading-[1.2] my-2.5"
					style={{ color: "var(--term-ink)" }}
				>
					{top}
					{"\n"}
					{mid}
					{"\n"}
					{bot}
					{"\n"}
					{cow}
				</pre>,
			);
		},
		matrix: () => {
			setOverlay({ type: "matrix" });
		},
		themes: () => {
			print(
				<span>
					<Dim>available:</Dim>{" "}
					{PALETTE_NAMES.map((p, i) => (
						<span key={p}>
							{i > 0 && " · "}
							<span style={{ color: "var(--term-green)" }}>
								{p}
							</span>
						</span>
					))}
				</span>,
				<Dim>
					usage: :colorscheme &lt;name&gt; or theme &lt;name&gt;
				</Dim>,
			);
		},
		":colorscheme": (args) => {
			doColorscheme(args[0] || null);
		},
		theme: (args) => {
			doColorscheme(args[0] || null);
		},
		":set": (args) => {
			const key = (args[0] || "").toLowerCase();
			if (!key) {
				print(
					<Dim>
						usage: :set crt | :set nocrt | :set ps1
						&apos;&lt;prompt&gt;&apos;
					</Dim>,
				);
				return;
			}
			if (key === "crt") {
				setCrt(true);
				print(<Ok text="✓ CRT mode ON" />);
				return;
			}
			if (key === "nocrt") {
				setCrt(false);
				print(<Ok text="✓ CRT mode OFF" />);
				return;
			}
			if (key === "ps1") {
				const rest = args
					.slice(1)
					.join(" ")
					.replace(/^['"]|['"]$/g, "");
				if (!rest) {
					setPs1(null);
					localStorage.removeItem("terminal-ps1");
					print(<Ok text="✓ PS1 reset" />);
				} else {
					setPs1(rest);
					localStorage.setItem("terminal-ps1", rest);
					print(<Ok text="✓ PS1 set" />);
				}
				return;
			}
			print(
				<span style={{ color: "var(--term-red)" }}>
					unknown :set {escapeText(key)}
				</span>,
			);
		},
		PS1: () => {
			print(
				<Dim>
					usage: :set ps1 &apos;%F&#123;green&#125;%n%f@%F&#123;blue&#125;%m%f:%F&#123;mag&#125;%~%f$
					&apos;
				</Dim>,
			);
		},
		clear: () => {
			clearOutput();
		},
		banner: () => {
			print(
				<pre
					className="font-medium whitespace-pre text-[11px] leading-[1.05] my-3.5 max-sm:text-[6.8px]"
					style={{ color: "var(--term-green)" }}
				>
					{ASCII_BANNER}
				</pre>,
			);
		},
		date: () => {
			print(<Dim>{new Date().toString()}</Dim>);
		},
		uptime: () => {
			print(
				<span>
					<span style={{ color: "var(--term-green)" }}>
						7+ years shipping code
					</span>{" "}
					· load avg 0.12, 0.08, 0.05 ·{" "}
					<span style={{ color: "var(--term-amber)" }}>
						caffeine: high
					</span>
				</span>,
			);
		},
		coffee: () => {
			print(
				<span>
					<span style={{ color: "var(--term-amber)" }}>☕</span>{" "}
					<Dim>brewing... done. ready.</Dim>
				</span>,
			);
		},
		sudo: (args) => {
			const rest = args.join(" ").toLowerCase().trim();
			if (rest === "make me a sandwich") {
				print(
					<span>
						<span style={{ color: "var(--term-green)" }}>
							Okay.
						</span>{" "}
						<Dim>🥪 (obligatory xkcd 149)</Dim>
					</span>,
				);
				return;
			}
			if (rest === "rm -rf /" || rest === "rm -rf --no-preserve-root /") {
				print(
					<span style={{ color: "var(--term-red)" }}>
						nice try. this is a staticpage, there is nothing to
						delete.
					</span>,
				);
				return;
			}
			print(
				<span style={{ color: "var(--term-red)" }}>
					sehal is not in the sudoers file. This incident will be
					reported.
				</span>,
			);
		},
		hack: () => {
			const targets = [
				["scanning 192.168.0.0/16", "432 hosts up"],
				["bruteforcing root@mainframe", "access granted"],
				["bypassing firewall", "done"],
				["downloading 3TB of files", "done"],
				["encrypting traces", "done"],
				["exiting matrix", "done"],
			];
			print(
				<div className="my-2 text-[12.5px]">
					{targets.map(([task, result]) => (
						<div key={task} className="py-[1px]">
							<span style={{ color: "var(--term-amber)" }}>
								[
								<span style={{ color: "var(--term-green)" }}>
									████████████
								</span>
								]
							</span>{" "}
							<span style={{ color: "var(--term-ink)" }}>
								{task}
							</span>
							{" — "}
							<span style={{ color: "var(--term-green)" }}>
								{result}
							</span>
						</div>
					))}
					<div
						className="mt-2 text-[11px]"
						style={{ color: "var(--term-dim)" }}
					>
						I&apos;m in. (this was a joke, please don&apos;t call
						the FBI)
					</div>
				</div>,
			);
		},
		curl: (args) => {
			const target = (args[0] || "").toLowerCase();
			if (!target) {
				print(
					<span style={{ color: "var(--term-red)" }}>
						curl: try one of:{" "}
						<span style={{ color: "var(--term-green)" }}>
							curl parrot
						</span>
						,{" "}
						<span style={{ color: "var(--term-green)" }}>
							curl cowsay &lt;msg&gt;
						</span>
					</span>,
				);
				return;
			}
			if (target === "parrot" || target === "party" || target === "partyparrot") {
				const parrot = String.raw`             _____________
        .-'"             "'-.
       /                     \
      /    .---.   .---.      \
     |    |  o  | |  o  |      |
     |     \___/   \___/       |
      \        .---.          /
       '.    \_____/        .'
         '-.__         __.-'
              \\'"'"'"'"'//
               \\       //
                \\     //`;
				print(
					<pre
						className="whitespace-pre text-[11.5px] leading-[1.15] my-2.5"
						style={{ color: "var(--term-green)" }}
					>
						{parrot}
					</pre>,
					<Dim>
						🎉 party on (animate in the terminal of your heart)
					</Dim>,
				);
				return;
			}
			if (target === "cowsay") {
				HANDLERS.cowsay(args.slice(1));
				return;
			}
			if (target === "localhost" || target.startsWith("http")) {
				print(
					<Dim>
						curl: (7) Failed to connect — this is a browser, not a
						shell. nice try though.
					</Dim>,
				);
				return;
			}
			print(
				<span style={{ color: "var(--term-red)" }}>
					curl: (6) Could not resolve host: {escapeText(target)}
				</span>,
			);
		},
		man: () => {
			print(
				<Dim>
					RTFM yourself. try{" "}
					<span style={{ color: "var(--term-green)" }}>help</span>.
				</Dim>,
			);
		},
		exit: () => {
			print(<Dim>there is no exit. keep scrolling.</Dim>);
		},
		ai: () => {
			setAiChatActive(true);
		},
		contributions: () => {
			print(<ContributionsInline />);
		},
		guestbook: () => {
			print(<GuestbookInline />);
		},
		login: async () => {
			const { data: session } = await authClient.getSession();
			if (session) {
				const login =
					(session.user as { githubLogin?: string | null })
						.githubLogin ?? session.user.name;
				print(
					<span>
						<Ok text="✓" /> already signed in as{" "}
						<span style={{ color: "var(--term-green)" }}>
							@{login}
						</span>
					</span>,
				);
				return;
			}
			print(
				<Dim>
					<span style={{ color: "var(--term-amber)" }}>→</span>{" "}
					redirecting to github for oauth…
				</Dim>,
			);
			await authClient.signIn.social({
				provider: "github",
				callbackURL: "/terminal",
			});
		},
		logout: async () => {
			const { data: session } = await authClient.getSession();
			if (!session) {
				print(<Dim>not signed in.</Dim>);
				return;
			}
			await authClient.signOut();
			print(
				<span>
					<Ok text="✓" /> signed out.
				</span>,
			);
		},
		me: async () => {
			const { data: session } = await authClient.getSession();
			if (!session) {
				print(
					<span>
						<Dim>not signed in — try</Dim>{" "}
						<span style={{ color: "var(--term-green)" }}>
							login
						</span>
					</span>,
				);
				return;
			}
			const user = session.user as {
				id: string;
				name: string;
				email: string;
				image?: string | null;
				githubLogin?: string | null;
			};
			const fields: [string, string][] = [
				["user", `@${user.githubLogin ?? user.name}`],
				["name", user.name],
				["email", user.email],
				["id", user.id],
				[
					"expires",
					new Date(session.session.expiresAt).toLocaleString(),
				],
			];
			print(
				<div
					className="py-2.5 px-4 my-1.5 text-[12.5px]"
					style={{
						background: "var(--term-bg)",
						borderLeft: "2px solid var(--term-blue)",
					}}
				>
					<div
						className="text-[11px] tracking-[0.08em] uppercase mb-1.5 font-medium"
						style={{ color: "var(--term-amber)" }}
					>
						current session
					</div>
					{fields.map(([k, v]) => (
						<div key={k}>
							<CmdName>{k}</CmdName>
							<span style={{ color: "var(--term-ink)" }}>{v}</span>
						</div>
					))}
				</div>,
			);
		},
		mcp: (args) => {
			const origin =
				typeof window !== "undefined"
					? window.location.origin
					: "https://sehalsein.com";
			const endpoint = `${origin}/api/mcp`;
			const verbose = args.some((a) =>
				["-v", "--verbose", "-h", "--help", "setup"].includes(
					a.toLowerCase(),
				),
			);

			const desktopSnippet = JSON.stringify(
				{ mcpServers: { sehal: { url: endpoint } } },
				null,
				2,
			);
			const codeCommand = `claude mcp add --transport http sehal ${endpoint}`;
			const cursorSnippet = JSON.stringify(
				{ mcpServers: { sehal: { url: endpoint } } },
				null,
				2,
			);

			if (!verbose) {
				// Short summary + one-liner setup command
				print(
					<div className="my-2 text-[12.5px] max-w-[74ch]">
						<div
							className="text-[11px] tracking-[0.08em] uppercase mb-2"
							style={{ color: "var(--term-amber)" }}
						>
							remote mcp server
						</div>
						<div className="mb-1">
							endpoint:{" "}
							<Copyable
								as="span"
								value={endpoint}
								style={{ color: "var(--term-green)" }}
								title="click to copy endpoint"
							>
								{endpoint}
							</Copyable>
						</div>
						<div
							className="mb-2 text-[11.5px]"
							style={{ color: "var(--term-dim)" }}
						>
							public:{" "}
							<span style={{ color: "var(--term-ink)" }}>
								get_resume · get_experience · get_skills ·
								get_projects · get_now
							</span>
							{" — "}authed:{" "}
							<span style={{ color: "var(--term-ink)" }}>
								ask_sehal
							</span>
						</div>
						<div
							className="text-[11.5px] mb-1"
							style={{ color: "var(--term-dim)" }}
						>
							add it in Claude Code:
						</div>
						<Copyable
							value={codeCommand}
							className="whitespace-pre text-[11px] leading-[1.3] p-2.5 pr-16"
							style={{
								background: "var(--term-bg2)",
								border: "1px solid var(--term-rule)",
								color: "var(--term-green)",
							}}
						>
							{codeCommand}
						</Copyable>
						<div
							className="mt-2 text-[11.5px]"
							style={{ color: "var(--term-dim)" }}
						>
							→ Claude Desktop, Cursor, or the full OAuth flow:{" "}
							<span style={{ color: "var(--term-green)" }}>
								mcp --help
							</span>
						</div>
					</div>,
				);
				return;
			}

			// Verbose: full setup guide
			print(
				<div className="my-2 text-[12.5px] max-w-[74ch]">
					<div
						className="text-[11px] tracking-[0.08em] uppercase mb-2"
						style={{ color: "var(--term-amber)" }}
					>
						remote mcp server · setup
					</div>
					<div className="mb-2">
						endpoint:{" "}
						<Copyable
							as="span"
							value={endpoint}
							style={{ color: "var(--term-green)" }}
							title="click to copy endpoint"
						>
							{endpoint}
						</Copyable>
					</div>
					<div
						className="mb-3 text-[11.5px]"
						style={{ color: "var(--term-dim)" }}
					>
						streamable HTTP · OAuth 2.1 dynamic client registration
						(RFC 7591) · no bearer token needed — your client does the
						dance.
					</div>

					{/* Tools */}
					<div
						className="text-[10px] tracking-[0.1em] uppercase my-2"
						style={{ color: "var(--term-dim)" }}
					>
						── tools
					</div>
					<div style={{ color: "var(--term-ink)" }}>
						<div>
							<span style={{ color: "var(--term-green)" }}>
								get_resume
							</span>
							,{" "}
							<span style={{ color: "var(--term-green)" }}>
								get_experience
							</span>
							,{" "}
							<span style={{ color: "var(--term-green)" }}>
								get_skills
							</span>
							,{" "}
							<span style={{ color: "var(--term-green)" }}>
								get_projects
							</span>
							,{" "}
							<span style={{ color: "var(--term-green)" }}>
								get_now
							</span>{" "}
							<span style={{ color: "var(--term-dim)" }}>
								— public, no auth
							</span>
						</div>
						<div>
							<span style={{ color: "var(--term-green)" }}>
								ask_sehal
							</span>{" "}
							<span style={{ color: "var(--term-dim)" }}>
								— ask an LLM that knows me · OAuth-gated ·
								rate-limited
							</span>
						</div>
					</div>
					<div
						className="text-[10px] tracking-[0.1em] uppercase my-2 mt-3"
						style={{ color: "var(--term-dim)" }}
					>
						── resources
					</div>
					<div style={{ color: "var(--term-ink)" }}>
						<span style={{ color: "var(--term-green)" }}>
							resume://sehal
						</span>
						{", "}
						<span style={{ color: "var(--term-green)" }}>
							now://sehal
						</span>
					</div>

					{/* Claude Desktop */}
					<div
						className="text-[10px] tracking-[0.1em] uppercase my-2 mt-4"
						style={{ color: "var(--term-dim)" }}
					>
						── claude desktop
					</div>
					<div
						className="mb-1"
						style={{ color: "var(--term-dim)" }}
					>
						edit{" "}
						<span style={{ color: "var(--term-amber)" }}>
							~/Library/Application Support/Claude/claude_desktop_config.json
						</span>{" "}
						(macOS) or{" "}
						<span style={{ color: "var(--term-amber)" }}>
							%APPDATA%\Claude\claude_desktop_config.json
						</span>{" "}
						(Windows):
					</div>
					<Copyable
						value={desktopSnippet}
						className="whitespace-pre text-[11px] leading-[1.3] p-2.5 pr-16"
						style={{
							background: "var(--term-bg2)",
							border: "1px solid var(--term-rule)",
							color: "var(--term-ink)",
						}}
					>
						{desktopSnippet}
					</Copyable>
					<div
						className="text-[11px] mt-1"
						style={{ color: "var(--term-dim)" }}
					>
						then restart Claude Desktop.
					</div>

					{/* Claude Code */}
					<div
						className="text-[10px] tracking-[0.1em] uppercase my-2 mt-4"
						style={{ color: "var(--term-dim)" }}
					>
						── claude code (cli)
					</div>
					<Copyable
						value={codeCommand}
						className="whitespace-pre text-[11px] leading-[1.3] p-2.5 pr-16"
						style={{
							background: "var(--term-bg2)",
							border: "1px solid var(--term-rule)",
							color: "var(--term-green)",
						}}
					>
						{codeCommand}
					</Copyable>

					{/* Cursor / VS Code */}
					<div
						className="text-[10px] tracking-[0.1em] uppercase my-2 mt-4"
						style={{ color: "var(--term-dim)" }}
					>
						── cursor / vs code (mcp.json)
					</div>
					<Copyable
						value={cursorSnippet}
						className="whitespace-pre text-[11px] leading-[1.3] p-2.5 pr-16"
						style={{
							background: "var(--term-bg2)",
							border: "1px solid var(--term-rule)",
							color: "var(--term-ink)",
						}}
					>
						{cursorSnippet}
					</Copyable>

					{/* First-run flow */}
					<div
						className="text-[10px] tracking-[0.1em] uppercase my-2 mt-4"
						style={{ color: "var(--term-dim)" }}
					>
						── first connection
					</div>
					<ol
						className="list-decimal pl-5"
						style={{ color: "var(--term-ink)" }}
					>
						<li>client fetches the MCP endpoint → gets 401</li>
						<li>
							follows{" "}
							<span style={{ color: "var(--term-amber)" }}>
								www-authenticate
							</span>{" "}
							to discover OAuth metadata
						</li>
						<li>
							dynamically registers itself as an OAuth app with
							sehalsein.com
						</li>
						<li>
							opens your browser → GitHub sign-in → consent screen
							at{" "}
							<a
								href="/consent"
								style={{ color: "var(--term-blue)" }}
							>
								/consent
							</a>
						</li>
						<li>
							receives a short-lived JWT, which unlocks{" "}
							<span style={{ color: "var(--term-green)" }}>
								ask_sehal
							</span>
						</li>
					</ol>

					{/* Verify */}
					<div
						className="text-[10px] tracking-[0.1em] uppercase my-2 mt-4"
						style={{ color: "var(--term-dim)" }}
					>
						── verify
					</div>
					<div style={{ color: "var(--term-dim)" }}>
						<span style={{ color: "var(--term-green)" }}>curl</span>{" "}
						<span style={{ color: "var(--term-amber)" }}>
							{`${origin}/.well-known/oauth-protected-resource/api/mcp`}
						</span>{" "}
						— should return JSON with resource + authorization_servers.
					</div>
				</div>,
			);
		},
		contrib: function (args) {
			HANDLERS.contributions(args);
		},
		now: () => {
			print(
				<div className="my-2 text-[12.5px] max-w-[74ch]">
					<div
						className="text-[11px] tracking-[0.08em] uppercase mb-2.5"
						style={{ color: "var(--term-amber)" }}
					>
						/now · updated {NOW_LAST_UPDATED}
					</div>
					{NOW_SECTIONS.map((s) => (
						<div key={s.id} className="mb-3">
							<div
								className="text-[10px] tracking-[0.1em] uppercase"
								style={{ color: "var(--term-dim)" }}
							>
								── {s.title}
							</div>
							{s.items.map((item, i) => (
								<div key={i} className="pl-3">
									<span style={{ color: "var(--term-faint)" }}>
										▸
									</span>{" "}
									<span style={{ color: "var(--term-ink)" }}>
										{item}
									</span>
								</div>
							))}
						</div>
					))}
					<Dim>
						→ full page:{" "}
						<a
							href="/now"
							style={{ color: "var(--term-blue)" }}
						>
							/now
						</a>
					</Dim>
				</div>,
			);
			updateHash("now");
		},
	};

	// Deep linking — run once after boot only
	const deepLinkHandled = useRef(false);
	useEffect(() => {
		if (!bootDone || deepLinkHandled.current) return;
		deepLinkHandled.current = true;
		const params = new URLSearchParams(window.location.search);
		if (params.has("cmd")) {
			runCommand(params.get("cmd")!);
			return;
		}
		const hash = window.location.hash.replace(/^#\/?/, "");
		if (hash) {
			const project = PROJECTS.find((p) => p.slug === hash);
			if (project) {
				runCommand(`project ${project.slug}`);
			} else {
				runCommand(hash);
			}
		}
	}, [bootDone, runCommand]);

	// Vim close handler
	const handleVimClose = useCallback(
		(savedContent: string[] | null) => {
			if (overlay?.type === "vim" && savedContent) {
				setFileStore((prev) => ({
					...prev,
					[overlay.file]: savedContent,
				}));
			}
			setOverlay(null);
		},
		[overlay],
	);

	return (
		<div
			className="h-full w-full flex flex-col overflow-hidden terminal-selection bg-term-bg text-term-ink antialiased"
			style={{ fontSize: "14px", lineHeight: "1.65" }}
			onClick={handleScreenClick}
		>
			{/* CRT overlay */}
			{crt && (
				<>
					<div
						className="fixed inset-0 pointer-events-none z-[9998]"
						style={{
							background:
								"repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
						}}
					/>
					<div
						className="fixed inset-0 pointer-events-none z-[9999]"
						style={{
							background:
								"radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)",
						}}
					/>
				</>
			)}

			{/* Chrome */}
			<TerminalChrome cwd={cwd} />

			{/* Screen */}
			<div
				ref={screenRef}
				className="flex-1 overflow-y-auto px-8 pt-6 pb-[120px] max-sm:px-4 max-sm:pb-[140px] terminal-scrollbar"
				style={{
					textShadow: crt ? "0 0 2px currentColor" : undefined,
				}}
			>
				<BootSequence onComplete={() => setBootDone(true)} />

				{/* Output history */}
				{output.map((entry) => (
					<div
						key={entry.id}
						className="animate-[fi_180ms_ease-out]"
					>
						{entry.content}
					</div>
				))}

				{/* Input line */}
				{bootDone && !aiChatActive && (
					<CommandInput
						cwd={cwd}
						ps1={ps1}
						onCommand={runCommand}
						onClear={clearOutput}
					/>
				)}
				{bootDone && aiChatActive && (
					<AiChatMode
						onExit={() => {
							setAiChatActive(false);
							// Clear AI chat entries from output
							setOutput((prev) =>
								prev.filter(
									(e) => !aiOutputIds.includes(e.id),
								),
							);
							setAiOutputIds([]);
						}}
					/>
				)}

				<div ref={bottomRef} />
			</div>

			{/* Overlays */}
			{overlay?.type === "vim" && (
				<VimOverlay
					filename={overlay.file}
					lines={
						fileStore[overlay.file] ||
						fileStore["readme.md"] ||
						[]
					}
					onClose={handleVimClose}
				/>
			)}
			{overlay?.type === "matrix" && (
				<MatrixOverlay onClose={() => setOverlay(null)} />
			)}

			{/* ? hint */}
			{bootDone && (
				<div
					className="fixed bottom-4 right-5 text-[11px] px-3 py-2 rounded-full z-[60] pointer-events-none max-md:hidden"
					style={{
						background: "var(--term-bg2)",
						border: "1px solid var(--term-rule)",
						color: "var(--term-dim)",
						animation:
							"hint-in 0.4s ease-out 3s both, hint-out 0.5s ease-in 14s forwards",
					}}
				>
					press{" "}
					<kbd
						className="px-1.5 rounded text-[10px] mx-[2px]"
						style={{
							background: "var(--term-faint)",
							color: "var(--term-ink)",
						}}
					>
						?
					</kbd>{" "}
					for help ·{" "}
					<kbd
						className="px-1.5 rounded text-[10px] mx-[2px]"
						style={{
							background: "var(--term-faint)",
							color: "var(--term-ink)",
						}}
					>
						Tab
					</kbd>{" "}
					to complete
				</div>
			)}
		</div>
	);
}

// ── Helper Components ──

function Dim({ children }: { children: ReactNode }) {
	return <span style={{ color: "var(--term-dim)" }}>{children}</span>;
}

function Ok({ text }: { text: string }) {
	return <span style={{ color: "var(--term-green)" }}>{text}</span>;
}

function CmdName({ children }: { children: ReactNode }) {
	return (
		<span
			className="inline-block min-w-[130px]"
			style={{ color: "var(--term-green)" }}
		>
			{children}
		</span>
	);
}

function SectionHeader({ text }: { text: string }) {
	return (
		<div className="my-4.5">
			<span style={{ color: "var(--term-faint)" }} className="mr-2">
				##
			</span>
			<span className="font-semibold">{text}</span>
		</div>
	);
}

function FormattedText({ text }: { text: string }) {
	// Parse simple <b>, <em> tags from ABOUT_PARAS
	const parts: ReactNode[] = [];
	let remaining = text;
	let key = 0;

	while (remaining.length > 0) {
		const boldMatch = remaining.match(/<b>(.*?)<\/b>/);
		const emMatch = remaining.match(/<em>(.*?)<\/em>/);

		let first: { match: RegExpMatchArray; type: "b" | "em" } | null = null;

		if (
			boldMatch?.index !== undefined &&
			(emMatch?.index === undefined || boldMatch.index <= emMatch.index)
		) {
			first = { match: boldMatch, type: "b" };
		} else if (emMatch?.index !== undefined) {
			first = { match: emMatch, type: "em" };
		}

		if (!first || first.match.index === undefined) {
			parts.push(remaining);
			break;
		}

		if (first.match.index > 0) {
			parts.push(remaining.slice(0, first.match.index));
		}

		if (first.type === "b") {
			parts.push(
				<span
					key={key++}
					style={{ color: "var(--term-green)", fontWeight: 500 }}
				>
					{first.match[1]}
				</span>,
			);
		} else {
			parts.push(
				<span key={key++} style={{ color: "var(--term-amber)" }}>
					_{first.match[1]}_
				</span>,
			);
		}

		remaining = remaining.slice(
			first.match.index + first.match[0].length,
		);
	}

	return <>{parts}</>;
}

function escapeText(s: string) {
	return s.replace(/</g, "<").replace(/>/g, ">");
}

function updateHash(cmd: string) {
	const slug = cmd.trim().split(/\s+/)[0];
	if (
		[
			"about",
			"work",
			"projects",
			"experience",
			"xp",
			"contact",
			"gpg",
			"ssh",
		].includes(slug)
	) {
		history.replaceState(null, "", "#/" + slug);
	}
}
