"use client";

import {
	Bell,
	Bug,
	ChevronDown,
	ChevronRight,
	FileCode2,
	FileJson,
	FileText,
	FileType,
	Files,
	GitBranch,
	MoreHorizontal,
	Package,
	Search,
	Settings as SettingsIcon,
	UserCircle2,
	X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
	DEFAULT_EXPANDED_DIRS,
	DEFAULT_FILE_PATH,
	type GithubTreeResponse,
	REPO,
	type RepoFile,
	type RepoLang,
	blobUrl,
	langFromPath,
	rawUrl,
	shouldShowPath,
	treeApiUrl,
} from "@/src/data/repoSources";
import {
	cachedFetchJson,
	cachedFetchText,
	fileCacheKey,
	treeCacheKey,
} from "./repoCache";
import { type Line, tokenize } from "./tokenize";

type FileState =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "ready"; text: string; lines: Line[] };

const LANG_LABEL: Record<RepoLang, string> = {
	ts: "TypeScript",
	tsx: "TypeScript React",
	js: "JavaScript",
	css: "CSS",
	md: "Markdown",
	json: "JSON",
};

function makeRepoFile(path: string): RepoFile {
	return { path, label: path, lang: langFromPath(path) };
}

type TreeFetchState =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "ready"; files: RepoFile[]; truncated: boolean };

export default function Editor() {
	const [tree, setTree] = useState<TreeFetchState>({ status: "loading" });
	const [cache, setCache] = useState<Record<string, FileState>>({});
	const [openTabs, setOpenTabs] = useState<string[]>([]);
	const [activePath, setActivePath] = useState<string>("");

	useEffect(() => {
		const controller = new AbortController();
		cachedFetchJson<GithubTreeResponse>(
			treeCacheKey(),
			treeApiUrl(),
			controller.signal,
		)
			.then((data) => {
				const files: RepoFile[] = data.tree
					.filter((e) => e.type === "blob" && shouldShowPath(e.path, e.size))
					.map((e) => makeRepoFile(e.path))
					.sort((a, b) => a.path.localeCompare(b.path));
				setTree({ status: "ready", files, truncated: data.truncated });
				const fallback =
					files.find((f) => f.path === DEFAULT_FILE_PATH)?.path ??
					files[0]?.path ??
					"";
				if (fallback) {
					setActivePath(fallback);
					setOpenTabs([fallback]);
				}
			})
			.catch((err: Error) => {
				if (err.name === "AbortError") return;
				setTree({ status: "error", message: err.message });
			});
		return () => controller.abort();
	}, []);

	const filesByPath = useMemo(() => {
		const map = new Map<string, RepoFile>();
		if (tree.status === "ready") {
			for (const f of tree.files) map.set(f.path, f);
		}
		return map;
	}, [tree]);

	const activeFile = filesByPath.get(activePath) ?? null;
	const activeState = activeFile
		? (cache[activeFile.path] ?? { status: "idle" })
		: ({ status: "idle" } as FileState);

	useEffect(() => {
		if (!activeFile) return;
		const existing = cache[activeFile.path];
		if (existing?.status === "ready" || existing?.status === "loading") return;

		const current = activeFile;
		setCache((prev) => ({ ...prev, [current.path]: { status: "loading" } }));
		const controller = new AbortController();
		cachedFetchText(
			fileCacheKey(current.path),
			rawUrl(current.path),
			controller.signal,
		)
			.then((text) => {
				const lines = tokenize(text, current.lang);
				setCache((prev) => ({
					...prev,
					[current.path]: { status: "ready", text, lines },
				}));
			})
			.catch((err: Error) => {
				if (err.name === "AbortError") return;
				setCache((prev) => ({
					...prev,
					[current.path]: { status: "error", message: err.message },
				}));
			});
		return () => controller.abort();
	}, [activeFile, cache]);

	const openFile = (path: string) => {
		setOpenTabs((tabs) => (tabs.includes(path) ? tabs : [...tabs, path]));
		setActivePath(path);
	};

	const closeTab = (path: string) => {
		setOpenTabs((tabs) => {
			const next = tabs.filter((t) => t !== path);
			if (activePath === path) {
				const idx = tabs.indexOf(path);
				const neighbor = next[idx] ?? next[idx - 1] ?? null;
				setActivePath(neighbor ?? "");
			}
			return next;
		});
	};

	const lineCount =
		activeState.status === "ready" ? activeState.lines.length : null;
	const charCount =
		activeState.status === "ready" ? activeState.text.length : null;

	const tabs = openTabs
		.map((p) => filesByPath.get(p))
		.filter((f): f is RepoFile => Boolean(f));

	return (
		<div className="app-editor vscode">
			<ActivityBar />
			<Sidebar
				tree={tree}
				activePath={activePath}
				onOpen={openFile}
			/>
			<main className="main">
				<TabBar
					tabs={tabs}
					activePath={activePath}
					onActivate={setActivePath}
					onClose={closeTab}
				/>
				{activeFile ? (
					<>
						<Breadcrumb file={activeFile} />
						<CodeArea state={activeState} />
					</>
				) : (
					<EmptyState treeStatus={tree.status} />
				)}
			</main>
			<StatusBar
				file={activeFile}
				lineCount={lineCount}
				charCount={charCount}
				loading={activeState.status === "loading"}
				error={activeState.status === "error"}
			/>
		</div>
	);
}

/* ─── Activity bar ─────────────────────────────────────────────── */

function ActivityBar() {
	return (
		<nav className="activity" aria-label="Activity bar">
			<div className="group">
				<button type="button" className="ic active" aria-label="Explorer" aria-current="page">
					<Files aria-hidden="true" />
				</button>
				<button type="button" className="ic" aria-label="Search">
					<Search aria-hidden="true" />
				</button>
				<button type="button" className="ic" aria-label="Source Control">
					<GitBranch aria-hidden="true" />
				</button>
				<button type="button" className="ic" aria-label="Run and Debug">
					<Bug aria-hidden="true" />
				</button>
				<button type="button" className="ic" aria-label="Extensions">
					<Package aria-hidden="true" />
				</button>
			</div>
			<div className="group">
				<button type="button" className="ic" aria-label="Accounts">
					<UserCircle2 aria-hidden="true" />
				</button>
				<button type="button" className="ic" aria-label="Settings">
					<SettingsIcon aria-hidden="true" />
				</button>
			</div>
		</nav>
	);
}

/* ─── Sidebar (file tree) ──────────────────────────────────────── */

type TreeNode =
	| { type: "file"; name: string; file: RepoFile }
	| { type: "dir"; name: string; path: string; children: TreeNode[] };

function buildTree(files: RepoFile[]): TreeNode[] {
	const root: TreeNode[] = [];
	for (const file of files) {
		const parts = file.path.split("/");
		let level = root;
		let prefix = "";
		for (let i = 0; i < parts.length - 1; i++) {
			const name = parts[i];
			prefix = prefix ? `${prefix}/${name}` : name;
			let dir = level.find(
				(n): n is Extract<TreeNode, { type: "dir" }> =>
					n.type === "dir" && n.name === name,
			);
			if (!dir) {
				dir = { type: "dir", name, path: prefix, children: [] };
				level.push(dir);
			}
			level = dir.children;
		}
		level.push({ type: "file", name: parts[parts.length - 1], file });
	}
	sortTree(root);
	return root;
}

function sortTree(nodes: TreeNode[]) {
	nodes.sort((a, b) => {
		if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
	for (const n of nodes) {
		if (n.type === "dir") sortTree(n.children);
	}
}

type SidebarProps = {
	tree: TreeFetchState;
	activePath: string;
	onOpen: (path: string) => void;
};

function Sidebar({ tree, activePath, onOpen }: SidebarProps) {
	const nodes = useMemo(
		() => (tree.status === "ready" ? buildTree(tree.files) : []),
		[tree],
	);
	const [expanded, setExpanded] = useState<Set<string>>(
		() => new Set(DEFAULT_EXPANDED_DIRS),
	);

	const toggle = (path: string) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(path)) next.delete(path);
			else next.add(path);
			return next;
		});

	return (
		<aside className="side" aria-label="File explorer">
			<header className="side-header">
				<span>EXPLORER</span>
				<button type="button" className="side-more" aria-label="Explorer actions">
					<MoreHorizontal aria-hidden="true" />
				</button>
			</header>
			<div className="side-section">
				<div className="side-section-title">
					<ChevronDown aria-hidden="true" />
					<span>{REPO.name.toUpperCase()}</span>
				</div>
				{tree.status === "loading" && (
					<div className="side-msg">loading repo tree…</div>
				)}
				{tree.status === "error" && (
					<div className="side-msg side-msg-err">
						couldn&apos;t load tree: {tree.message}
					</div>
				)}
				{tree.status === "ready" && (
					<ul className="tree" role="tree" aria-label="Project files">
						{nodes.map((node) => (
							<TreeItem
								key={nodeKey(node)}
								node={node}
								depth={0}
								expanded={expanded}
								onToggle={toggle}
								activePath={activePath}
								onOpen={onOpen}
							/>
						))}
					</ul>
				)}
				{tree.status === "ready" && tree.truncated && (
					<div className="side-msg">tree truncated by github</div>
				)}
			</div>
		</aside>
	);
}

function nodeKey(node: TreeNode): string {
	return node.type === "file" ? node.file.path : node.path;
}

type TreeItemProps = {
	node: TreeNode;
	depth: number;
	expanded: Set<string>;
	onToggle: (path: string) => void;
	activePath: string;
	onOpen: (path: string) => void;
};

function TreeItem({
	node,
	depth,
	expanded,
	onToggle,
	activePath,
	onOpen,
}: TreeItemProps) {
	const indent = { paddingLeft: 8 + depth * 12 };

	if (node.type === "file") {
		const active = node.file.path === activePath;
		return (
			<li role="treeitem" aria-selected={active}>
				<button
					type="button"
					className={`row file${active ? " active" : ""}`}
					style={indent}
					onClick={() => onOpen(node.file.path)}
				>
					<FileIcon lang={node.file.lang} />
					<span className="row-label">{node.name}</span>
				</button>
			</li>
		);
	}

	const isOpen = expanded.has(node.path);
	return (
		<li role="treeitem" aria-expanded={isOpen}>
			<button
				type="button"
				className="row dir"
				style={indent}
				onClick={() => onToggle(node.path)}
			>
				{isOpen ? (
					<ChevronDown className="chev" aria-hidden="true" />
				) : (
					<ChevronRight className="chev" aria-hidden="true" />
				)}
				<span className="row-label">{node.name}</span>
			</button>
			{isOpen && (
				<ul role="group">
					{node.children.map((child) => (
						<TreeItem
							key={nodeKey(child)}
							node={child}
							depth={depth + 1}
							expanded={expanded}
							onToggle={onToggle}
							activePath={activePath}
							onOpen={onOpen}
						/>
					))}
				</ul>
			)}
		</li>
	);
}

function FileIcon({ lang }: { lang: RepoLang }) {
	const className = `ficon lang-${lang}`;
	if (lang === "json")
		return <FileJson className={className} aria-hidden="true" />;
	if (lang === "md")
		return <FileText className={className} aria-hidden="true" />;
	if (lang === "css")
		return <FileType className={className} aria-hidden="true" />;
	return <FileCode2 className={className} aria-hidden="true" />;
}

/* ─── Tab bar ──────────────────────────────────────────────────── */

type TabBarProps = {
	tabs: RepoFile[];
	activePath: string;
	onActivate: (path: string) => void;
	onClose: (path: string) => void;
};

function TabBar({ tabs, activePath, onActivate, onClose }: TabBarProps) {
	if (tabs.length === 0) return <div className="tabs" aria-hidden="true" />;
	return (
		<div className="tabs" role="tablist" aria-label="Open files">
			{tabs.map((tab) => {
				const active = tab.path === activePath;
				return (
					<div
						key={tab.path}
						role="tab"
						aria-selected={active}
						className={`tab${active ? " active" : ""}`}
					>
						<button
							type="button"
							className="tab-main"
							onClick={() => onActivate(tab.path)}
						>
							<FileIcon lang={tab.lang} />
							<span className="tab-name">{tab.path.split("/").pop()}</span>
						</button>
						<button
							type="button"
							className="tab-close"
							aria-label={`Close ${tab.path}`}
							onClick={(e) => {
								e.stopPropagation();
								onClose(tab.path);
							}}
						>
							<X aria-hidden="true" />
						</button>
					</div>
				);
			})}
		</div>
	);
}

/* ─── Breadcrumb ───────────────────────────────────────────────── */

function Breadcrumb({ file }: { file: RepoFile }) {
	const parts = file.path.split("/");
	return (
		<nav className="breadcrumb" aria-label="Breadcrumb">
			<ol>
				{parts.map((p, i) => (
					<Fragment key={`${p}-${i}`}>
						<li>
							{i === parts.length - 1 ? (
								<span className="crumb-file">
									<FileIcon lang={file.lang} />
									<span>{p}</span>
								</span>
							) : (
								<span>{p}</span>
							)}
						</li>
						{i < parts.length - 1 && (
							<li aria-hidden="true">
								<ChevronRight aria-hidden="true" />
							</li>
						)}
					</Fragment>
				))}
			</ol>
			<a
				className="crumb-link"
				href={blobUrl(file.path)}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={`Open ${file.path} on GitHub`}
			>
				Open on GitHub ↗
			</a>
		</nav>
	);
}

/* ─── Code area ────────────────────────────────────────────────── */

function CodeArea({ state }: { state: FileState }) {
	if (state.status === "idle" || state.status === "loading") {
		return (
			<div className="code" aria-busy="true">
				<pre>
					<div className="ln">
						<span className="n">—</span>
						<span className="co">loading source from github…</span>
					</div>
				</pre>
			</div>
		);
	}
	if (state.status === "error") {
		return (
			<div className="code">
				<pre>
					<div className="ln">
						<span className="n">!</span>
						<span className="text-[color:var(--red)]">
							couldn&apos;t load: {state.message}
						</span>
					</div>
				</pre>
			</div>
		);
	}
	return (
		<div className="code">
			<pre>
				{state.lines.map((line, i) => (
					<div key={i} className="ln">
						<span className="n">{i + 1}</span>
						<span>
							{line.length === 0
								? "\u00a0"
								: line.map((tok, j) =>
										tok.cls ? (
											<span key={j} className={tok.cls}>
												{tok.text}
											</span>
										) : (
											<Fragment key={j}>{tok.text}</Fragment>
										),
									)}
						</span>
					</div>
				))}
			</pre>
		</div>
	);
}

/* ─── Empty state ──────────────────────────────────────────────── */

function EmptyState({ treeStatus }: { treeStatus: TreeFetchState["status"] }) {
	return (
		<div className="editor-empty">
			<div className="editor-empty-inner">
				<h2>{REPO.owner}/{REPO.name}</h2>
				<p>
					{treeStatus === "loading"
						? "Loading repository tree from GitHub…"
						: treeStatus === "error"
							? "Couldn't reach GitHub — try again in a minute."
							: "Pick a file from the explorer to read its source."}
				</p>
			</div>
		</div>
	);
}

/* ─── Status bar ───────────────────────────────────────────────── */

type StatusBarProps = {
	file: RepoFile | null;
	lineCount: number | null;
	charCount: number | null;
	loading: boolean;
	error: boolean;
};

function StatusBar({ file, lineCount, charCount, loading, error }: StatusBarProps) {
	return (
		<footer className="statusbar" role="contentinfo" aria-label="Editor status">
			<div className="left">
				<span className="sb-item">
					<GitBranch aria-hidden="true" />
					{REPO.branch}
				</span>
				<span className="sb-item" aria-label={`${error ? 1 : 0} errors, 0 warnings`}>
					<Bug aria-hidden="true" />
					{error ? 1 : 0}
					<Bell aria-hidden="true" />0
				</span>
			</div>
			<div className="right">
				{file && (
					<>
						<span className="sb-item">
							Ln {lineCount ?? "—"}, Col {charCount ?? "—"}
						</span>
						<span className="sb-item">Spaces: 2</span>
						<span className="sb-item">UTF-8</span>
						<span className="sb-item">LF</span>
						<span className="sb-item">{LANG_LABEL[file.lang]}</span>
					</>
				)}
				<span
					className={`sb-dot${loading ? " loading" : ""}`}
					aria-hidden="true"
				/>
			</div>
		</footer>
	);
}
