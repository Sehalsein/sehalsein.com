"use client";

import {
	Briefcase,
	CodeXml,
	FolderOpen,
	Gamepad2,
	type LucideIcon,
	Mail as MailIcon,
	NotebookPen,
	Settings as SettingsIcon,
	Sparkles,
	SquareTerminal,
	UserRound,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Size } from "../components/Window/store";
import About from "./About";
import AI from "./AI";
import Editor from "./Editor";
import Experience from "./Experience";
import Finder from "./Finder";
import Mail from "./Mail";
import Notes from "./Notes";
import Settings from "./Settings";
import Snake from "./Snake";
import TerminalApp from "./TerminalApp";

export type AppId =
	| "terminal"
	| "about"
	| "finder"
	| "xp"
	| "mail"
	| "editor"
	| "notes"
	| "ai"
	| "settings"
	| "snake";

export type AppDef = {
	name: string;
	icon: LucideIcon;
	defaultSize: Size;
	Component: ComponentType<{ instanceId: string }>;
};

export const APPS: Record<AppId, AppDef> = {
	terminal: {
		name: "Terminal",
		icon: SquareTerminal,
		defaultSize: { width: 900, height: 600 },
		Component: TerminalApp,
	},
	about: {
		name: "About",
		icon: UserRound,
		defaultSize: { width: 560, height: 640 },
		Component: About,
	},
	finder: {
		name: "Projects",
		icon: FolderOpen,
		defaultSize: { width: 820, height: 560 },
		Component: Finder,
	},
	xp: {
		name: "Experience",
		icon: Briefcase,
		defaultSize: { width: 580, height: 620 },
		Component: Experience,
	},
	mail: {
		name: "Mail",
		icon: MailIcon,
		defaultSize: { width: 640, height: 520 },
		Component: Mail,
	},
	editor: {
		name: "Editor",
		icon: CodeXml,
		defaultSize: { width: 720, height: 560 },
		Component: Editor,
	},
	notes: {
		name: "Notes",
		icon: NotebookPen,
		defaultSize: { width: 780, height: 560 },
		Component: Notes,
	},
	ai: {
		name: "AI",
		icon: Sparkles,
		defaultSize: { width: 640, height: 560 },
		Component: AI,
	},
	settings: {
		name: "Settings",
		icon: SettingsIcon,
		defaultSize: { width: 720, height: 520 },
		Component: Settings,
	},
	snake: {
		name: "Snake",
		icon: Gamepad2,
		defaultSize: { width: 480, height: 560 },
		Component: Snake,
	},
};

export const DOCK_ORDER: (AppId | "sep")[] = [
	"terminal",
	"about",
	"finder",
	"xp",
	"editor",
	"notes",
	"mail",
	"ai",
	"snake",
	"sep",
	"settings",
];
