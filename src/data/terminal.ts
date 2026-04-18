import { RESUME_DATA } from "./resume";

export const ASCII_BANNER = `
 ███████╗███████╗██╗  ██╗ █████╗ ██╗         ███████╗███████╗██╗███╗   ██╗
 ██╔════╝██╔════╝██║  ██║██╔══██╗██║         ██╔════╝██╔════╝██║████╗  ██║
 ███████╗█████╗  ███████║███████║██║         ███████╗█████╗  ██║██╔██╗ ██║
 ╚════██║██╔══╝  ██╔══██║██╔══██║██║         ╚════██║██╔══╝  ██║██║╚██╗██║
 ███████║███████╗██║  ██║██║  ██║███████╗    ███████║███████╗██║██║ ╚████║
 ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝    ╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝`;

export const NEOFETCH_LOGO = `      .--.
     |o_o |
     |:_/ |
    //   \\ \\
   (|     | )
  /'\\_   _/\`\\
  \\___)=(___/`;

export const TAGLINE = RESUME_DATA.summary;

export const BOOT_LINES: [string, string][] = [
	["[    0.0001]", "reached target multi-user.target"],
	["[    0.0034]", "loading /etc/sehalsein/identity.conf"],
	["[    0.0089]", "starting nextjs.service — v16.1"],
	["[    0.0127]", "starting coffee.service"],
	["[    0.0312]", "mounting dgymbook.conf on /projects"],
	["[    0.0578]", "initializing node v22 · docker.engine"],
	["[    0.0891]", "loading tailwind.css · typescript 5.x"],
	[
		"[    0.1204]",
		`starting session for user <span class='ok'>sehal</span>`,
	],
];

export const ABOUT_PARAS = [
	`I care about <b>building things that matter</b> and making technology more <b>accessible</b>. Most of my work lives in the full-stack space — from crafting pixel-perfect frontends to building scalable backend systems that handle real-world load.`,
	`I've spent time across <em>gaming</em>, <em>data analytics</em>, <em>fitness tech</em>, and <em>consulting</em>. I co-founded <b>DGymBook</b>, a gym platform serving 50,000+ users. I like working on problems that push me — whether that's scaling servers to 150K concurrent users or building deployment pipelines that just work.`,
	`Outside work: video games, thinking about the next thing to build, and occasionally touching grass. I believe in <b>small teams</b>, <b>shipping fast</b>, and writing code someone else can understand without a tour guide.`,
];

export type Project = {
	slug: string;
	company: string;
	year: string;
	role: string;
	desc: string;
	perm: string;
	size: string;
};

export const PROJECTS: Project[] = RESUME_DATA.experience.map((exp) => ({
	slug: exp.company.toLowerCase().replace(/\s+/g, "-"),
	company: exp.company,
	year: exp.duration.to
		? `${exp.duration.from}—${exp.duration.to}`
		: `${exp.duration.from}—now`,
	role: exp.position,
	desc:
		exp.description.length > 0
			? exp.description[0]
			: `${exp.position} at ${exp.company}`,
	perm: "drwxr-xr-x",
	size: `${Math.floor(Math.random() * 12 + 2)}.${Math.floor(Math.random() * 9)}K`,
}));

export type ExperienceEntry = {
	company: string;
	duration: string;
	position: string;
};

export const EXPERIENCE: ExperienceEntry[] = RESUME_DATA.experience.map(
	(exp) => ({
		company: exp.company,
		duration: exp.duration.to
			? `${exp.duration.from}—${exp.duration.to}`
			: `${exp.duration.from}—now`,
		position: exp.position,
	}),
);

export const NEOFETCH_DATA = {
	os: "macOS 15.4 arm64",
	host: "sehalsein.com",
	uptime: "7+ years shipping code",
	shell: "zsh 5.9",
	role: "Sr Software Engineer",
	stack: RESUME_DATA.skills
		.slice(0, 8)
		.map((s) => s.title.toLowerCase())
		.join(" · "),
	location: `${RESUME_DATA.location}`,
	status: "open to chats",
};

export const FORTUNES = [
	"Boring software is a feature, not a bug.",
	"If you can't reproduce it, it's not a bug — it's the universe.",
	"The best code is the code you didn't have to write.",
	"Invariants beat unit tests.",
	"Every cache is a lie waiting to be caught.",
	"Make it right, then make it fast. Usually right is fast enough.",
	"Logs are for past-you. Metrics are for future-you. Alerts are for someone else.",
	"You will never regret a good README.",
	"On-call is a team sport.",
	"Deleting code counts as progress.",
	"If it works in staging but not in prod, you don't understand your system.",
	"The best refactor is the one nobody notices.",
	"Ship it, then fix it. But actually fix it.",
	"Documentation is a love letter to your future self.",
	"The only thing worse than no tests is tests that lie.",
];

export const GIT_COMMITS: [string, string, string, string][] = [
	[
		"a1b27cf",
		"HEAD → main",
		"recently",
		"planned: joining the platform team",
	],
	["ff80e2d", "", "2025", "dgymbook: scaling to 50K+ users"],
	["d419c88", "origin/main", "2025", "ops0: consulting engagement shipped"],
	[
		"9e3a770",
		"",
		"2024",
		"mino: twitch extension + 150K concurrent users",
	],
	["c5771b0", "", "2022—2023", "datagpt: full-stack analytics platform"],
	[
		"0a22c9f",
		"",
		"2021—2022",
		"fibonalabs: modernized legacy codebases at scale",
	],
	[
		"7e3fa12",
		"",
		"2018—2021",
		"redintegro: graphql APIs, cloud infra, mentoring juniors",
	],
	[
		"3d1f28c",
		"v1.0",
		"2019",
		"masters in computer application — presidency college",
	],
	[
		"5c02ff6",
		"",
		"2016",
		"bachelors in computer application — st aloysius college",
	],
	["8badf00", "root-commit", "2013", "initial commit — hello world"],
];

export const PALETTE_NAMES = [
	"default",
	"tokyonight",
	"solarized",
	"gruvbox",
	"nord",
	"dracula",
	"catppuccin",
	"mono",
] as const;

export type PaletteName = (typeof PALETTE_NAMES)[number];

export const COMMAND_REGISTRY: Record<string, string> = {
	help: "show available commands",
	"?": "alias for help",
	about: "cat about.md",
	work: "ls ~/projects",
	projects: "alias for work",
	project: "project <slug> — show a single project",
	experience: "tree experience/",
	xp: "alias for experience",
	contact: "how to reach me",
	gpg: "show PGP fingerprint",
	ssh: "show SSH key fingerprint",
	whoami: "identity card",
	neofetch: "system info",
	resume: "download resume.pdf",
	socials: "list social links",
	cd: "cd <dir> — change directory",
	ls: "ls [-la|--sort=...] — list files",
	pwd: "print working directory",
	vim: "vim <file> — open fake editor",
	nvim: "alias for vim",
	cat: "cat <file> — print a file",
	git: "git log — show personal changelog",
	fortune: "fortune — rotating quotes",
	cowsay: "cowsay <msg> — what the cow says",
	matrix: "digital rain. any key to exit.",
	":colorscheme": "change theme — :colorscheme <name>",
	theme: "alias for :colorscheme",
	themes: "list themes",
	":set": ":set crt|nocrt|ps1 '...'",
	PS1: "PS1='...' — customize prompt",
	clear: "clear the terminal",
	banner: "re-print the banner",
	date: "what time is it?",
	uptime: "how long I've been shipping",
	coffee: "☕",
	sudo: "try it",
	man: "nothing to see here",
	exit: "nothing happens",
	ai: "chat with an AI that knows about me",
	now: "what I'm up to right now",
	contributions: "github contribution heatmap",
	contrib: "alias for contributions",
	guestbook: "sign the guestbook",
	mcp: "remote MCP server info",
	login: "sign in with GitHub",
	logout: "sign out",
};

export const COMMAND_GROUPS: [string, string[]][] = [
	["Navigation", ["about", "work", "project", "experience", "contact", "now"]],
	["Identity", ["whoami", "neofetch", "gpg", "ssh", "resume", "contributions", "login", "logout"]],
	["Shell", ["ls", "cd", "pwd", "cat", "clear", "banner", "date", "uptime"]],
	["Editors", ["vim", "git"]],
	["Themes", [":colorscheme", "themes", ":set"]],
	["Fun", ["fortune", "cowsay", "matrix", "coffee", "sudo", "socials", "ai", "guestbook", "mcp"]],
];

export const HOME_FILES = [
	["drwxr-xr-x", "2.1K", "projects/"],
	["drwxr-xr-x", "1.4K", "experience/"],
	["-rw-r--r--", "3.2K", "about.md"],
	["-rw-r--r--", "1.1K", "contact.md"],
	["-rw-r--r--", "780B", "readme.md"],
	["-rw-r--r--", "246K", "resume.pdf"],
	["-rw-------", "4.0K", "id_ed25519.pub"],
	["-rw-------", "3.8K", "pubkey.asc"],
] as const;

export const VIM_FILES: Record<string, [string, string | null][]> = {
	"readme.md": [
		["# sehalsein", "h1"],
		["", null],
		["A terminal that pretends to be a personal site.", null],
		["", null],
		["## what i do", "h2"],
		["", null],
		["- build full-stack systems that handle real-world load", null],
		["- care a lot about *shipping fast* and *code quality*", null],
		["- co-founded DGymBook — gym platform for 50K+ users", null],
		["", null],
		["## stack", "h2"],
		["", null],
		["```", "co"],
		[
			RESUME_DATA.skills
				.slice(0, 6)
				.map((s) => s.title.toLowerCase())
				.join(" · "),
			null,
		],
		[
			RESUME_DATA.skills
				.slice(6, 12)
				.map((s) => s.title.toLowerCase())
				.join(" · "),
			null,
		],
		[
			RESUME_DATA.skills
				.slice(12)
				.map((s) => s.title.toLowerCase())
				.join(" · "),
			null,
		],
		["```", "co"],
		["", null],
		["## principles", "h2"],
		["", null],
		["1. ship it, then iterate", null],
		["2. small teams, big impact", null],
		["3. boring software is a feature", null],
		["4. make tech more accessible", null],
		["", null],
		['> type `:q` to return to shell.', "co"],
	],
	"about.md": ABOUT_PARAS.map((p) => [p.replace(/<[^>]+>/g, ""), null]),
	"contact.md": [
		["# Contact", "h1"],
		["", null],
		[`email: ${RESUME_DATA.email}`, null],
		[`github: github.com/sehalsein`, null],
		[`linkedin: linkedin.com/in/sehalsein`, null],
		[`location: ${RESUME_DATA.location}`, null],
	],
};

export const MOBILE_CHIPS = [
	"about",
	"work",
	"experience",
	"contact",
	"vim readme.md",
	"fortune",
	"git log",
	"themes",
	":set crt",
	"matrix",
	"ai",
	"clear",
];
