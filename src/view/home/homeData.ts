export const WORK = [
	{
		period: "2025—now",
		company: "Planned",
		role: "Engineering Lead",
		description:
			"My current day job. I lead engineering work across the event platform and help the team make good technical decisions without slowing down.",
	},
	{
		period: "2022—now",
		company: "DGymBook",
		role: "Co-founder",
		description:
			"A gym-management idea I helped turn into a real product used by more than 50,000 people. I built much of the product and the systems behind it.",
	},
	{
		period: "2024",
		company: "Mino Games",
		role: "Senior Software Engineer",
		description:
			"I spent 2024 working on game backends, a Twitch extension, and internal tools for localization and analytics.",
	},
] as const;

export const EXPERIMENTS = [
	{
		href: "/racer",
		name: "racer",
		category: "physics playground",
		description:
			"Procedural circuits, vehicle physics, drifting, drafting, and drivers that try to ruin your lap.",
		visual: "racer",
	},
	{
		href: "/doom",
		name: "doom",
		category: "graphics experiment",
		description:
			"A software-rendered shooter with raycast walls, billboard sprites, and sound made at runtime.",
		visual: "doom",
	},
	{
		href: "/adventure",
		name: "hollowreach",
		category: "generative storytelling",
		description:
			"A persistent tabletop story where an AI game master remembers your character, choices, and mistakes.",
		visual: "adventure",
	},
	{
		href: "/os",
		name: "sehalOS",
		category: "interface experiment",
		description:
			"A small desktop environment with real windows, apps, Spotlight, and a source-code browser.",
		visual: "os",
	},
	{
		href: "/editor",
		name: "draftroom",
		category: "writing tool",
		description:
			"A local-first notebook for shaping rough ideas with rich text, slash commands, and a little paper personality.",
		visual: "editor",
	},
	{
		href: "/terminal",
		name: "terminal",
		category: "alternate homepage",
		description:
			"This website reimagined as a command line, complete with themes, a guestbook, and a few secrets.",
		visual: "terminal",
	},
] as const;

export type ExperimentVisualName = (typeof EXPERIMENTS)[number]["visual"];
