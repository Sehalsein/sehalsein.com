"use client";

import type { Editor } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { BubbleMenu } from "@tiptap/react/menus";
import {
	EditorContent,
	useEditor,
	useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	AlignCenter,
	AlignLeft,
	Bold,
	BookOpen,
	Check,
	ChevronDown,
	Code2,
	Download,
	FileText,
	Heading1,
	Heading2,
	Highlighter,
	Home,
	Italic,
	Link2,
	List,
	ListOrdered,
	ListTodo,
	Menu,
	Minus,
	PanelLeftClose,
	PanelLeftOpen,
	Pilcrow,
	Plus,
	Quote,
	Redo2,
	Search,
	Sparkles,
	Strikethrough,
	Type,
	Underline,
	Undo2,
	X,
	type LucideIcon,
} from "lucide-react";
import {
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import "./editor.css";

type DraftDocument = {
	id: string;
	title: string;
	content: string;
	createdAt: number;
	updatedAt: number;
};

type CommandItem = {
	id: string;
	label: string;
	description: string;
	keywords: string;
	icon: LucideIcon;
	action: (editor: Editor) => void;
};

const DOCUMENTS_KEY = "draftroom.documents.v1";
const ACTIVE_DOCUMENT_KEY = "draftroom.active-document.v1";

const STARTER_CONTENT = `
<p><span style="color: #6c7168">A field note · ${new Date().getFullYear()}</span></p>
<h1>Build the thing you keep thinking about.</h1>
<p>Welcome to <strong>Draftroom</strong>—a quiet, local-first place for ideas that are not ready to behave yet.</p>
<blockquote><p>Make it clear. Make it strange. Make it yours.</p></blockquote>
<h2>Today’s direction</h2>
<ul>
  <li><p>Start with the feeling, then find the structure.</p></li>
  <li><p>Leave room for one surprising detail.</p></li>
  <li><p>Ship the smallest version that still has a point of view.</p></li>
</ul>
<p>Highlight what matters, turn ideas into tasks, or type <code>/</code> on an empty line to add a new block.</p>
`;

const SECOND_NOTE = `
<p><span style="color: #6c7168">Product notes</span></p>
<h1>A tool should feel like a good room.</h1>
<p>The best software does not ask for attention. It creates enough calm for attention to happen.</p>
<h2>Rules for the room</h2>
<ol>
  <li><p>Every control earns its place.</p></li>
  <li><p>Fast paths stay close to the hands.</p></li>
  <li><p>Personality lives in the details, not decoration.</p></li>
</ol>
<p><mark data-color="#dfff75">Useful can still feel alive.</mark></p>
`;

const READING_NOTE = `
<p><span style="color: #6c7168">Commonplace book</span></p>
<h1>Things worth returning to</h1>
<p>A loose shelf for sentences, references, sketches, and unfinished connections.</p>
<hr>
<h2>Open threads</h2>
<p>How much interface can disappear before a tool stops teaching you how to use it?</p>
`;

const COMMANDS: CommandItem[] = [
	{
		id: "text",
		label: "Text",
		description: "A clean paragraph block",
		keywords: "paragraph body",
		icon: Type,
		action: (editor) => editor.chain().focus().setParagraph().run(),
	},
	{
		id: "heading-one",
		label: "Heading 1",
		description: "A large section title",
		keywords: "h1 title",
		icon: Heading1,
		action: (editor) =>
			editor.chain().focus().toggleHeading({ level: 1 }).run(),
	},
	{
		id: "heading-two",
		label: "Heading 2",
		description: "A medium section title",
		keywords: "h2 subtitle",
		icon: Heading2,
		action: (editor) =>
			editor.chain().focus().toggleHeading({ level: 2 }).run(),
	},
	{
		id: "bullets",
		label: "Bullet list",
		description: "An unordered list",
		keywords: "list bullets unordered",
		icon: List,
		action: (editor) => editor.chain().focus().toggleBulletList().run(),
	},
	{
		id: "numbers",
		label: "Numbered list",
		description: "A list with sequence",
		keywords: "list ordered numbers",
		icon: ListOrdered,
		action: (editor) => editor.chain().focus().toggleOrderedList().run(),
	},
	{
		id: "tasks",
		label: "To-do list",
		description: "Track something to completion",
		keywords: "task check todo checkbox",
		icon: ListTodo,
		action: (editor) => editor.chain().focus().toggleTaskList().run(),
	},
	{
		id: "quote",
		label: "Quote",
		description: "Give a thought more weight",
		keywords: "blockquote citation",
		icon: Quote,
		action: (editor) => editor.chain().focus().toggleBlockquote().run(),
	},
	{
		id: "code",
		label: "Code block",
		description: "A monospaced code section",
		keywords: "code pre developer",
		icon: Code2,
		action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
	},
	{
		id: "divider",
		label: "Divider",
		description: "Separate two ideas",
		keywords: "rule line separator",
		icon: Minus,
		action: (editor) => editor.chain().focus().setHorizontalRule().run(),
	},
];

function makeInitialDocuments(): DraftDocument[] {
	const now = Date.now();
	return [
		{
			id: "start-here",
			title: "Start here",
			content: STARTER_CONTENT,
			createdAt: now - 86_400_000 * 3,
			updatedAt: now - 1000 * 60 * 3,
		},
		{
			id: "good-room",
			title: "A tool is a room",
			content: SECOND_NOTE,
			createdAt: now - 86_400_000 * 2,
			updatedAt: now - 1000 * 60 * 44,
		},
		{
			id: "open-threads",
			title: "Open threads",
			content: READING_NOTE,
			createdAt: now - 86_400_000,
			updatedAt: now - 1000 * 60 * 90,
		},
	];
}

function readDocuments(): DraftDocument[] {
	try {
		const stored = window.localStorage.getItem(DOCUMENTS_KEY);
		if (!stored) return makeInitialDocuments();
		const parsed: unknown = JSON.parse(stored);
		if (!Array.isArray(parsed) || parsed.length === 0) {
			return makeInitialDocuments();
		}
		const documents = parsed.filter(
			(value): value is DraftDocument =>
				typeof value === "object" &&
				value !== null &&
				typeof (value as DraftDocument).id === "string" &&
				typeof (value as DraftDocument).title === "string" &&
				typeof (value as DraftDocument).content === "string",
		);
		return documents.length > 0 ? documents : makeInitialDocuments();
	} catch {
		return makeInitialDocuments();
	}
}

function initialActiveId(documents: DraftDocument[]) {
	try {
		const stored = window.localStorage.getItem(ACTIVE_DOCUMENT_KEY);
		if (stored && documents.some((document) => document.id === stored)) {
			return stored;
		}
	} catch {
		// The first document remains available when storage is blocked.
	}
	return documents[0].id;
}

function formatTime(timestamp: number) {
	return new Intl.DateTimeFormat("en", {
		hour: "numeric",
		minute: "2-digit",
	}).format(timestamp);
}

function setEditorLink(editor: Editor) {
	const previousHref = editor.getAttributes("link").href as string | undefined;
	const href = window.prompt("Link to", previousHref ?? "https://");
	if (href === null) return;
	if (href.trim() === "") {
		editor.chain().focus().extendMarkRange("link").unsetLink().run();
		return;
	}
	editor
		.chain()
		.focus()
		.extendMarkRange("link")
		.setLink({ href: href.trim() })
		.run();
}

export default function EditorPage() {
	const [documents, setDocuments] = useState<DraftDocument[]>(readDocuments);
	const [activeId, setActiveId] = useState(() => initialActiveId(documents));
	const [searchQuery, setSearchQuery] = useState("");
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [commandMenuOpen, setCommandMenuOpen] = useState(false);
	const [hasPendingChanges, setHasPendingChanges] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState(Date.now());
	const activeIdRef = useRef(activeId);
	const titleInputRef = useRef<HTMLInputElement>(null);
	activeIdRef.current = activeId;

	const activeDocument =
		documents.find((document) => document.id === activeId) ?? documents[0];

	const editor = useEditor(
		{
			extensions: [
				StarterKit.configure({
					heading: { levels: [1, 2, 3] },
					link: {
						autolink: true,
						openOnClick: false,
						defaultProtocol: "https",
						HTMLAttributes: {
							target: "_blank",
							rel: "noopener noreferrer",
						},
					},
				}),
				Placeholder.configure({
					placeholder: ({ node }) =>
						node.type.name === "heading"
							? "Give this section a name…"
							: "Write something, or press / for blocks…",
				}),
				TaskList,
				TaskItem.configure({ nested: true }),
				Highlight.configure({ multicolor: true }),
				TextAlign.configure({ types: ["heading", "paragraph"] }),
			],
			content: activeDocument.content,
			immediatelyRender: true,
			shouldRerenderOnTransaction: false,
			editorProps: {
				attributes: {
					class: "draft-prose",
					spellcheck: "true",
					"aria-label": "Document content",
				},
				handleKeyDown: (view, event) => {
					const { $from, empty } = view.state.selection;
					const isEmptyParagraph =
						empty &&
						$from.parent.type.name === "paragraph" &&
						$from.parent.textContent.length === 0;
					if (event.key === "/" && isEmptyParagraph) {
						event.preventDefault();
						setCommandMenuOpen(true);
						return true;
					}
					return false;
				},
			},
			onUpdate: ({ editor: currentEditor }) => {
				const documentId = activeIdRef.current;
				const content = currentEditor.getHTML();
				const updatedAt = Date.now();
				setDocuments((current) =>
					current.map((document) =>
						document.id === documentId
							? { ...document, content, updatedAt }
							: document,
					),
				);
				setHasPendingChanges(true);
			},
		},
		[],
	);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			try {
				window.localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
				window.localStorage.setItem(ACTIVE_DOCUMENT_KEY, activeId);
				setLastSavedAt(Date.now());
				setHasPendingChanges(false);
			} catch {
				// Editing still works when storage is unavailable.
			}
		}, 320);

		return () => window.clearTimeout(timeout);
	}, [activeId, documents]);

	const visibleDocuments = useMemo(() => {
		const query = searchQuery.trim().toLocaleLowerCase();
		if (!query) return documents;
		return documents.filter((document) =>
			(document.title || "Untitled").toLocaleLowerCase().includes(query),
		);
	}, [documents, searchQuery]);

	const selectDocument = useCallback(
		(documentId: string) => {
			if (!editor || documentId === activeIdRef.current) {
				setSidebarOpen(false);
				return;
			}
			const nextDocument = documents.find(
				(document) => document.id === documentId,
			);
			if (!nextDocument) return;
			activeIdRef.current = documentId;
			setActiveId(documentId);
			editor.commands.setContent(nextDocument.content, { emitUpdate: false });
			setCommandMenuOpen(false);
			setSidebarOpen(false);
		},
		[documents, editor],
	);

	const createDocument = useCallback(() => {
		if (!editor) return;
		const now = Date.now();
		const document: DraftDocument = {
			id: crypto.randomUUID(),
			title: "",
			content: "<p></p>",
			createdAt: now,
			updatedAt: now,
		};
		setDocuments((current) => [document, ...current]);
		activeIdRef.current = document.id;
		setActiveId(document.id);
		editor.commands.setContent(document.content, { emitUpdate: false });
		setSearchQuery("");
		setSidebarOpen(false);
		setCommandMenuOpen(false);
		setHasPendingChanges(true);
		window.requestAnimationFrame(() => titleInputRef.current?.focus());
	}, [editor]);

	useEffect(() => {
		const handleShortcut = (event: KeyboardEvent) => {
			if (
				(event.metaKey || event.ctrlKey) &&
				event.key.toLocaleLowerCase() === "n"
			) {
				event.preventDefault();
				createDocument();
			}
		};

		window.addEventListener("keydown", handleShortcut);
		return () => window.removeEventListener("keydown", handleShortcut);
	}, [createDocument]);

	const updateTitle = useCallback((title: string) => {
		const documentId = activeIdRef.current;
		setDocuments((current) =>
			current.map((document) =>
				document.id === documentId
					? { ...document, title, updatedAt: Date.now() }
					: document,
			),
		);
		setHasPendingChanges(true);
	}, []);

	const exportDocument = useCallback(() => {
		const safeTitle = (activeDocument.title || "untitled")
			.trim()
			.toLocaleLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		const file = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${activeDocument.title || "Untitled"}</title></head><body><article><h1>${activeDocument.title || "Untitled"}</h1>${activeDocument.content}</article></body></html>`;
		const url = URL.createObjectURL(new Blob([file], { type: "text/html" }));
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `${safeTitle || "untitled"}.html`;
		anchor.click();
		URL.revokeObjectURL(url);
	}, [activeDocument]);

	return (
		<div
			className={`draft-app${sidebarCollapsed ? " is-sidebar-collapsed" : ""}`}
		>
			<button
				type="button"
				className={`draft-sidebar-scrim${sidebarOpen ? " is-visible" : ""}`}
				aria-label="Close document sidebar"
				onClick={() => setSidebarOpen(false)}
			/>

			<aside
				className={`draft-sidebar${sidebarOpen ? " is-open" : ""}`}
				aria-label="Draftroom navigation"
			>
				<div className="draft-brand-row">
					<a className="draft-brand" href="/" aria-label="Back to sehalsein.com">
						<span className="draft-brand-mark" aria-hidden="true">
							<span />
							<span />
							<span />
						</span>
						<span>
							<strong>Draftroom</strong>
							<small>private workspace</small>
						</span>
					</a>
					<button
						type="button"
						className="draft-icon-button draft-mobile-close"
						aria-label="Close sidebar"
						onClick={() => setSidebarOpen(false)}
					>
						<X aria-hidden="true" />
					</button>
				</div>

				<nav className="draft-sidebar-nav" aria-label="Workspace">
					<a href="/" className="draft-sidebar-link">
						<Home aria-hidden="true" />
						<span>Back home</span>
					</a>
					<button
						type="button"
						className="draft-sidebar-link"
						onClick={createDocument}
					>
						<Plus aria-hidden="true" />
						<span>New page</span>
						<kbd>⌘ N</kbd>
					</button>
				</nav>

				<div className="draft-sidebar-section">
					<div className="draft-sidebar-label-row">
						<span>Pages</span>
						<span>{documents.length.toString().padStart(2, "0")}</span>
					</div>
					<label className="draft-search">
						<Search aria-hidden="true" />
						<span className="sr-only">Search pages</span>
						<input
							type="search"
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							placeholder="Find a page…"
						/>
					</label>
					<div className="draft-document-list">
						{visibleDocuments.map((document) => {
							const isActive = document.id === activeDocument.id;
							return (
								<button
									type="button"
									key={document.id}
									className={`draft-document${isActive ? " is-active" : ""}`}
									onClick={() => selectDocument(document.id)}
									aria-current={isActive ? "page" : undefined}
								>
									<FileText aria-hidden="true" />
									<span>
										<strong>{document.title || "Untitled"}</strong>
										<small>Edited {formatTime(document.updatedAt)}</small>
									</span>
								</button>
							);
						})}
						{visibleDocuments.length === 0 ? (
							<p className="draft-no-results">No pages found.</p>
						) : null}
					</div>
				</div>

				<div className="draft-sidebar-footer">
					<div className="draft-local-stamp" aria-hidden="true">
						<span>LOCAL</span>
						<strong>001</strong>
					</div>
					<div>
						<strong>Your words stay here.</strong>
						<p>Saved only in this browser.</p>
					</div>
				</div>
			</aside>

			<main className="draft-main">
				<header className="draft-topbar">
					<div className="draft-topbar-left">
						<button
							type="button"
							className="draft-icon-button draft-menu-button"
							aria-label="Open document sidebar"
							onClick={() => setSidebarOpen(true)}
						>
							<Menu aria-hidden="true" />
						</button>
						<button
							type="button"
							className="draft-icon-button draft-collapse-button"
							aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
							onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
						>
							{sidebarCollapsed ? (
								<PanelLeftOpen aria-hidden="true" />
							) : (
								<PanelLeftClose aria-hidden="true" />
							)}
						</button>
						<div className="draft-breadcrumb">
							<span>Pages</span>
							<i>/</i>
							<strong>{activeDocument.title || "Untitled"}</strong>
						</div>
					</div>

					<div className="draft-topbar-actions">
						<span className="draft-save-state" role="status">
							<span className={hasPendingChanges ? "is-saving" : ""} />
							{hasPendingChanges
								? "Saving…"
								: `Saved locally at ${formatTime(lastSavedAt)}`}
						</span>
						<button
							type="button"
							className="draft-export-button"
							onClick={exportDocument}
							aria-label="Export document as HTML"
							title="Export document as HTML"
						>
							<Download aria-hidden="true" />
							<span>Export</span>
						</button>
					</div>
				</header>

				<div className="draft-canvas">
					<div className="draft-paper">
						<div className="draft-paper-kicker">
							<span>FIELD NOTE</span>
							<i />
							<span>{new Date(activeDocument.createdAt).getFullYear()}</span>
						</div>
						<input
							ref={titleInputRef}
							className="draft-title-input"
							value={activeDocument.title}
							onChange={(event) => updateTitle(event.target.value)}
							placeholder="Untitled"
							aria-label="Page title"
						/>

						{editor ? (
							<>
								<FormattingToolbar
									editor={editor}
									onOpenCommands={() => setCommandMenuOpen(true)}
								/>
								<BubbleMenu
									editor={editor}
									options={{ placement: "top" }}
									className="draft-bubble-menu"
								>
									<InlineToolbar editor={editor} />
								</BubbleMenu>
								<div className="draft-editor-shell">
									<EditorContent editor={editor} />
									{commandMenuOpen ? (
										<CommandMenu
											editor={editor}
											onClose={() => setCommandMenuOpen(false)}
										/>
									) : null}
								</div>
								<EditorFooter editor={editor} />
							</>
						) : (
							<div className="draft-editor-placeholder" aria-hidden="true">
								<span />
								<span />
								<span />
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}

function FormattingToolbar({
	editor,
	onOpenCommands,
}: {
	editor: Editor;
	onOpenCommands: () => void;
}) {
	const formatting = useEditorState({
		editor,
		selector: ({ editor: currentEditor }) => ({
			block: currentEditor.isActive("heading", { level: 1 })
				? "h1"
				: currentEditor.isActive("heading", { level: 2 })
					? "h2"
					: currentEditor.isActive("heading", { level: 3 })
						? "h3"
						: "paragraph",
			bold: currentEditor.isActive("bold"),
			italic: currentEditor.isActive("italic"),
			underline: currentEditor.isActive("underline"),
			strike: currentEditor.isActive("strike"),
			bulletList: currentEditor.isActive("bulletList"),
			orderedList: currentEditor.isActive("orderedList"),
			taskList: currentEditor.isActive("taskList"),
			blockquote: currentEditor.isActive("blockquote"),
			codeBlock: currentEditor.isActive("codeBlock"),
			highlight: currentEditor.isActive("highlight"),
			alignCenter: currentEditor.isActive({ textAlign: "center" }),
		}),
	});

	const changeBlock = (value: string) => {
		if (value === "paragraph") editor.chain().focus().setParagraph().run();
		if (value === "h1")
			editor.chain().focus().setHeading({ level: 1 }).run();
		if (value === "h2")
			editor.chain().focus().setHeading({ level: 2 }).run();
		if (value === "h3")
			editor.chain().focus().setHeading({ level: 3 }).run();
	};

	return (
		<div className="draft-toolbar" role="toolbar" aria-label="Text formatting">
			<label className="draft-block-select">
				<span className="sr-only">Text style</span>
				<Pilcrow aria-hidden="true" />
				<select
					value={formatting.block}
					onChange={(event) => changeBlock(event.target.value)}
				>
					<option value="paragraph">Text</option>
					<option value="h1">Heading 1</option>
					<option value="h2">Heading 2</option>
					<option value="h3">Heading 3</option>
				</select>
				<ChevronDown aria-hidden="true" />
			</label>

			<div className="draft-toolbar-separator" />
			<ToolbarButton
				label="Bold"
				shortcut="⌘B"
				icon={Bold}
				active={formatting.bold}
				onClick={() => editor.chain().focus().toggleBold().run()}
			/>
			<ToolbarButton
				label="Italic"
				shortcut="⌘I"
				icon={Italic}
				active={formatting.italic}
				onClick={() => editor.chain().focus().toggleItalic().run()}
			/>
			<ToolbarButton
				label="Underline"
				shortcut="⌘U"
				icon={Underline}
				active={formatting.underline}
				onClick={() => editor.chain().focus().toggleUnderline().run()}
			/>
			<ToolbarButton
				label="Strike"
				icon={Strikethrough}
				active={formatting.strike}
				onClick={() => editor.chain().focus().toggleStrike().run()}
			/>

			<div className="draft-toolbar-separator" />
			<ToolbarButton
				label="Bullet list"
				icon={List}
				active={formatting.bulletList}
				onClick={() => editor.chain().focus().toggleBulletList().run()}
			/>
			<ToolbarButton
				label="Numbered list"
				icon={ListOrdered}
				active={formatting.orderedList}
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
			/>
			<ToolbarButton
				label="To-do list"
				icon={ListTodo}
				active={formatting.taskList}
				onClick={() => editor.chain().focus().toggleTaskList().run()}
			/>
			<ToolbarButton
				label="Quote"
				icon={Quote}
				active={formatting.blockquote}
				onClick={() => editor.chain().focus().toggleBlockquote().run()}
			/>
			<ToolbarButton
				label="Code block"
				icon={Code2}
				active={formatting.codeBlock}
				onClick={() => editor.chain().focus().toggleCodeBlock().run()}
			/>

			<div className="draft-toolbar-separator" />
			<ToolbarButton
				label="Highlight"
				icon={Highlighter}
				active={formatting.highlight}
				onClick={() =>
					editor
						.chain()
						.focus()
						.toggleHighlight({ color: "#dfff75" })
						.run()
				}
			/>
			<ToolbarButton
				label="Add link"
				icon={Link2}
				active={editor.isActive("link")}
				onClick={() => setEditorLink(editor)}
			/>
			<ToolbarButton
				label={formatting.alignCenter ? "Align left" : "Align center"}
				icon={formatting.alignCenter ? AlignLeft : AlignCenter}
				active={formatting.alignCenter}
				onClick={() =>
					editor
						.chain()
						.focus()
						.setTextAlign(formatting.alignCenter ? "left" : "center")
						.run()
				}
			/>

			<span className="draft-toolbar-spacer" />
			<ToolbarButton
				label="Undo"
				shortcut="⌘Z"
				icon={Undo2}
				disabled={!editor.can().chain().focus().undo().run()}
				onClick={() => editor.chain().focus().undo().run()}
			/>
			<ToolbarButton
				label="Redo"
				shortcut="⇧⌘Z"
				icon={Redo2}
				disabled={!editor.can().chain().focus().redo().run()}
				onClick={() => editor.chain().focus().redo().run()}
			/>
			<button
				type="button"
				className="draft-insert-button"
				onClick={onOpenCommands}
			>
				<Plus aria-hidden="true" />
				<span>Insert</span>
			</button>
		</div>
	);
}

function ToolbarButton({
	label,
	shortcut,
	icon: Icon,
	active = false,
	disabled = false,
	onClick,
}: {
	label: string;
	shortcut?: string;
	icon: LucideIcon;
	active?: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			className={`draft-toolbar-button${active ? " is-active" : ""}`}
			onMouseDown={(event) => event.preventDefault()}
			onClick={onClick}
			disabled={disabled}
			aria-label={shortcut ? `${label} (${shortcut})` : label}
			aria-pressed={active}
			title={shortcut ? `${label} · ${shortcut}` : label}
		>
			<Icon aria-hidden="true" />
		</button>
	);
}

function InlineToolbar({ editor }: { editor: Editor }) {
	const active = useEditorState({
		editor,
		selector: ({ editor: currentEditor }) => ({
			bold: currentEditor.isActive("bold"),
			italic: currentEditor.isActive("italic"),
			underline: currentEditor.isActive("underline"),
			strike: currentEditor.isActive("strike"),
			code: currentEditor.isActive("code"),
			link: currentEditor.isActive("link"),
			highlight: currentEditor.isActive("highlight"),
		}),
	});

	return (
		<>
			<ToolbarButton
				label="Bold"
				icon={Bold}
				active={active.bold}
				onClick={() => editor.chain().focus().toggleBold().run()}
			/>
			<ToolbarButton
				label="Italic"
				icon={Italic}
				active={active.italic}
				onClick={() => editor.chain().focus().toggleItalic().run()}
			/>
			<ToolbarButton
				label="Underline"
				icon={Underline}
				active={active.underline}
				onClick={() => editor.chain().focus().toggleUnderline().run()}
			/>
			<ToolbarButton
				label="Strike"
				icon={Strikethrough}
				active={active.strike}
				onClick={() => editor.chain().focus().toggleStrike().run()}
			/>
			<span className="draft-bubble-separator" />
			<ToolbarButton
				label="Inline code"
				icon={Code2}
				active={active.code}
				onClick={() => editor.chain().focus().toggleCode().run()}
			/>
			<ToolbarButton
				label="Highlight"
				icon={Highlighter}
				active={active.highlight}
				onClick={() =>
					editor
						.chain()
						.focus()
						.toggleHighlight({ color: "#dfff75" })
						.run()
				}
			/>
			<ToolbarButton
				label="Add link"
				icon={Link2}
				active={active.link}
				onClick={() => setEditorLink(editor)}
			/>
		</>
	);
}

function CommandMenu({
	editor,
	onClose,
}: {
	editor: Editor;
	onClose: () => void;
}) {
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const filteredCommands = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase();
		if (!normalizedQuery) return COMMANDS;
		return COMMANDS.filter((command) =>
			`${command.label} ${command.keywords}`
				.toLocaleLowerCase()
				.includes(normalizedQuery),
		);
	}, [query]);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	const runCommand = (command: CommandItem) => {
		command.action(editor);
		onClose();
	};

	const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			onClose();
			editor.chain().focus().run();
		}
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setSelectedIndex((index) =>
				filteredCommands.length === 0
					? 0
					: (index + 1) % filteredCommands.length,
			);
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			setSelectedIndex((index) =>
				filteredCommands.length === 0
					? 0
					: (index - 1 + filteredCommands.length) % filteredCommands.length,
			);
		}
		if (event.key === "Enter" && filteredCommands[selectedIndex]) {
			event.preventDefault();
			runCommand(filteredCommands[selectedIndex]);
		}
	};

	return (
		<div className="draft-command-menu" role="dialog" aria-label="Insert a block">
			<div className="draft-command-head">
				<div>
					<Sparkles aria-hidden="true" />
					<span>Turn into</span>
				</div>
				<button type="button" onClick={onClose} aria-label="Close insert menu">
					<X aria-hidden="true" />
				</button>
			</div>
			<label className="draft-command-search">
				<Search aria-hidden="true" />
				<span className="sr-only">Search block types</span>
				<input
					ref={inputRef}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Search blocks…"
				/>
			</label>
			<div className="draft-command-list">
				{filteredCommands.map((command, index) => {
					const Icon = command.icon;
					return (
						<button
							type="button"
							key={command.id}
							className={index === selectedIndex ? "is-selected" : ""}
							onMouseEnter={() => setSelectedIndex(index)}
							onClick={() => runCommand(command)}
						>
							<span className="draft-command-icon">
								<Icon aria-hidden="true" />
							</span>
							<span>
								<strong>{command.label}</strong>
								<small>{command.description}</small>
							</span>
							{index === selectedIndex ? <Check aria-hidden="true" /> : null}
						</button>
					);
				})}
				{filteredCommands.length === 0 ? (
					<p>No blocks match “{query}”.</p>
				) : null}
			</div>
			<div className="draft-command-footer">
				<span><kbd>↑</kbd><kbd>↓</kbd> move</span>
				<span><kbd>↵</kbd> select</span>
				<span><kbd>esc</kbd> close</span>
			</div>
		</div>
	);
}

function EditorFooter({ editor }: { editor: Editor }) {
	const stats = useEditorState({
		editor,
		selector: ({ editor: currentEditor }) => {
			const text = currentEditor.state.doc.textContent.trim();
			return {
				words: text ? text.split(/\s+/).length : 0,
				characters: text.length,
			};
		},
	});

	return (
		<footer className="draft-editor-footer">
			<div>
				<span>{stats.words} words</span>
				<i />
				<span>{stats.characters} characters</span>
			</div>
			<p>
				<BookOpen aria-hidden="true" />
				Type <kbd>/</kbd> on an empty line for blocks
			</p>
		</footer>
	);
}
