"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { RESUME_DATA } from "@/src/data/resume";

type Project = {
	href: string;
	label: string;
	title: string;
	description: string;
	preview: ReactNode;
};

const PROJECTS: Project[] = [
	{
		href: "/terminal",
		label: "terminal",
		title: "interactive shell",
		description:
			"A fake CLI homepage. Type commands, switch colorschemes, chat with the AI, sign the guestbook.",
		preview: <TerminalPreview />,
	},
	{
		href: "/os",
		label: "os",
		title: "sehalOS",
		description:
			"A windowed desktop environment that doubles as a portfolio. Dock, spotlight, editor browsing real source from github.",
		preview: <OsPreview />,
	},
	{
		href: "/resume",
		label: "resume",
		title: "resume",
		description:
			"Printable, terminal-styled CV. Hit ⌘P to send it to paper.",
		preview: <ResumePreview />,
	},
	{
		href: "/now",
		label: "now",
		title: "what I'm doing now",
		description:
			"What I'm working on, reading, and thinking about this month. Updated periodically.",
		preview: <NowPreview />,
	},
	{
		href: "/guestbook",
		label: "guestbook",
		title: "guestbook",
		description:
			"Sign in with GitHub, leave a note. Like the old web.",
		preview: <GuestbookPreview />,
	},
];

export default function HomePage() {
	return (
		<main className="min-h-screen bg-term-bg text-term-ink antialiased">
			<div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12 md:gap-14 md:px-10 md:py-20">
				<Hero />
				<ProjectGrid />
				<Footer />
			</div>
		</main>
	);
}

function Hero() {
	return (
		<header className="flex flex-col gap-3">
			<p className="text-[11px] uppercase tracking-[0.24em] text-term-dim">
				sehalsein.com
			</p>
			<h1 className="text-3xl font-medium tracking-tight text-term-ink md:text-4xl">
				{RESUME_DATA.name}
			</h1>
			<p className="max-w-2xl text-sm leading-relaxed text-term-dim md:text-[15px]">
				Senior software engineer in {RESUME_DATA.location}. Co-founded
				DGymBook, now building platform at Planned. This site is a set of
				small experiments — pick whichever looks interesting.
			</p>
			<nav
				aria-label="Social links"
				className="mt-1 flex flex-wrap gap-x-5 gap-y-2 text-[12px]"
			>
				<a
					href={`mailto:${RESUME_DATA.email}`}
					className="text-term-blue underline-offset-4 hover:text-term-green hover:underline"
				>
					{RESUME_DATA.email}
				</a>
				{RESUME_DATA.social.map((s) => (
					<a
						key={s.name}
						href={s.url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-term-blue underline-offset-4 hover:text-term-green hover:underline"
					>
						{s.name.toLowerCase()} ↗
					</a>
				))}
			</nav>
		</header>
	);
}

function ProjectGrid() {
	return (
		<section aria-labelledby="projects-heading" className="flex flex-col gap-6">
			<div className="flex items-end justify-between gap-6">
				<h2
					id="projects-heading"
					className="text-[11px] uppercase tracking-[0.24em] text-term-dim"
				>
					projects
				</h2>
				<span className="text-[11px] text-term-faint">
					{PROJECTS.length} entries
				</span>
			</div>
			<ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{PROJECTS.map((p) => (
					<li key={p.href}>
						<ProjectCard project={p} />
					</li>
				))}
			</ul>
		</section>
	);
}

function ProjectCard({ project }: { project: Project }) {
	return (
		<Link
			href={project.href}
			className="group flex h-full flex-col gap-4 rounded-lg border border-term-rule bg-term-bg2/40 p-4 transition-colors hover:border-term-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-term-green focus-visible:ring-offset-2 focus-visible:ring-offset-term-bg"
		>
			<div
				aria-hidden="true"
				className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-md border border-term-rule bg-term-bg"
			>
				{project.preview}
			</div>
			<div className="flex flex-col gap-2">
				<div className="flex items-baseline justify-between gap-3">
					<span className="text-[11px] uppercase tracking-[0.2em] text-term-dim">
						/{project.label}
					</span>
					<span className="text-term-blue transition-colors group-hover:text-term-green">
						open →
					</span>
				</div>
				<h3 className="text-[15px] font-medium text-term-ink">
					{project.title}
				</h3>
				<p className="text-[12.5px] leading-relaxed text-term-dim">
					{project.description}
				</p>
			</div>
		</Link>
	);
}

function Footer() {
	return (
		<footer className="mt-auto flex flex-wrap gap-x-5 gap-y-2 border-t border-dashed border-term-rule pt-5 text-[11px] text-term-faint">
			<Link
				href="/terminal"
				className="text-term-blue underline-offset-4 hover:underline"
			>
				→ terminal
			</Link>
			<Link
				href="/os"
				className="text-term-blue underline-offset-4 hover:underline"
			>
				→ os
			</Link>
			<Link
				href="/resume"
				className="text-term-blue underline-offset-4 hover:underline"
			>
				→ resume
			</Link>
			<span>© {new Date().getFullYear()}</span>
		</footer>
	);
}

/* ─── Previews ─────────────────────────────────────────────────── */

function TerminalPreview() {
	return (
		<div className="grid h-full w-full grid-rows-[18px_1fr] bg-term-bg font-mono text-[10px] text-term-ink">
			<div className="flex items-center gap-1.5 border-b border-term-rule px-2">
				<span className="h-2 w-2 rounded-full bg-[#ff5f56]" />
				<span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
				<span className="h-2 w-2 rounded-full bg-[#27c93f]" />
				<span className="ml-auto text-[9px] text-term-faint">
					~/sehal
				</span>
			</div>
			<div className="flex flex-col gap-1 px-3 py-2.5">
				<div>
					<span className="text-term-green">›</span>{" "}
					<span className="text-term-dim">whoami</span>
				</div>
				<div className="text-term-ink">sehal sein — senior software engineer</div>
				<div className="mt-1">
					<span className="text-term-green">›</span>{" "}
					<span className="text-term-dim">cat about.md</span>
				</div>
				<div className="text-term-dim">
					builds things that <span className="text-term-green">matter</span>.
				</div>
				<div className="mt-1">
					<span className="text-term-green">›</span>{" "}
					<span className="inline-block h-[10px] w-1.5 animate-[blink_1.05s_steps(1)_infinite] bg-term-ink align-middle" />
				</div>
			</div>
		</div>
	);
}

function OsPreview() {
	return (
		<div className="relative h-full w-full overflow-hidden bg-term-bg">
			<div
				className="absolute inset-0 opacity-60"
				style={{
					background:
						"radial-gradient(circle at 20% 20%, rgba(158,206,106,0.15), transparent 55%), radial-gradient(circle at 80% 80%, rgba(122,162,247,0.15), transparent 55%)",
				}}
			/>
			<div className="absolute left-0 right-0 top-0 flex h-4 items-center gap-2 border-b border-term-rule bg-term-bg2/80 px-2 text-[8px] text-term-dim">
				<span className="text-term-green">◆</span>
				<span className="text-term-ink">Finder</span>
				<span className="ml-auto">100%</span>
			</div>
			<div className="absolute left-[14%] top-[32%] h-[40%] w-[46%] rounded border border-term-rule bg-term-bg2 shadow-lg">
				<div className="flex items-center gap-1 border-b border-term-rule px-1.5 py-1">
					<span className="h-1.5 w-1.5 rounded-full bg-[#ff5f56]" />
					<span className="h-1.5 w-1.5 rounded-full bg-[#ffbd2e]" />
					<span className="h-1.5 w-1.5 rounded-full bg-[#27c93f]" />
				</div>
				<div className="flex flex-col gap-1 p-1.5 text-[7px] text-term-dim">
					<div className="h-1 w-3/4 rounded-sm bg-term-rule" />
					<div className="h-1 w-1/2 rounded-sm bg-term-rule" />
					<div className="h-1 w-5/6 rounded-sm bg-term-rule" />
				</div>
			</div>
			<div className="absolute right-[8%] top-[22%] h-[32%] w-[36%] rounded border border-term-rule bg-term-bg2 shadow-lg">
				<div className="flex items-center gap-1 border-b border-term-rule px-1.5 py-1">
					<span className="h-1.5 w-1.5 rounded-full bg-[#ff5f56]" />
					<span className="h-1.5 w-1.5 rounded-full bg-[#ffbd2e]" />
					<span className="h-1.5 w-1.5 rounded-full bg-[#27c93f]" />
				</div>
				<div className="grid grid-cols-3 gap-1 p-1.5">
					<div className="h-2.5 rounded-sm bg-term-green/40" />
					<div className="h-2.5 rounded-sm bg-term-amber/40" />
					<div className="h-2.5 rounded-sm bg-term-blue/40" />
					<div className="h-2.5 rounded-sm bg-term-mag/40" />
					<div className="h-2.5 rounded-sm bg-term-cyan/40" />
					<div className="h-2.5 rounded-sm bg-term-red/40" />
				</div>
			</div>
			<div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-md border border-term-rule bg-term-bg2/90 px-1.5 py-1">
				<span className="h-3 w-3 rounded-sm bg-term-green/60" />
				<span className="h-3 w-3 rounded-sm bg-term-blue/60" />
				<span className="h-3 w-3 rounded-sm bg-term-amber/60" />
				<span className="h-3 w-3 rounded-sm bg-term-mag/60" />
				<span className="h-3 w-3 rounded-sm bg-term-cyan/60" />
			</div>
		</div>
	);
}

function ResumePreview() {
	return (
		<div className="flex h-full w-full flex-col gap-1.5 bg-term-bg p-4 text-[9px]">
			<p className="text-term-ink">
				<span className="font-semibold">Sehal Sein</span>{" "}
				<span className="text-term-dim">— sr software engineer</span>
			</p>
			<p className="text-term-faint">montreal · canada</p>
			<div className="mt-1.5 flex flex-col gap-1 border-t border-dashed border-term-rule pt-1.5">
				<p className="text-term-green">▌ experience</p>
				<div className="flex flex-col gap-0.5 pl-2">
					<p className="text-term-ink">Planned · platform</p>
					<p className="text-term-ink">DGymBook · co-founder</p>
					<p className="text-term-ink">Mino Games · sr swe</p>
					<p className="text-term-dim">…</p>
				</div>
			</div>
			<div className="mt-1 flex flex-col gap-0.5 border-t border-dashed border-term-rule pt-1.5">
				<p className="text-term-green">▌ skills</p>
				<p className="text-term-dim">
					typescript · go · python · postgres · aws
				</p>
			</div>
		</div>
	);
}

function NowPreview() {
	return (
		<div className="flex h-full w-full flex-col gap-1.5 bg-term-bg p-4 text-[10px]">
			<p className="text-[8px] uppercase tracking-[0.2em] text-term-dim">
				now — apr 2026
			</p>
			<p className="text-term-green">▌ working on</p>
			<ul className="flex flex-col gap-0.5 pl-2 text-term-ink">
				<li>platform eng at Planned</li>
				<li>scaling DGymBook past 50k users</li>
				<li>this site + guestbook + MCP</li>
			</ul>
			<p className="mt-0.5 text-term-amber">▌ reading</p>
			<ul className="flex flex-col gap-0.5 pl-2 text-term-dim">
				<li>DDIA (re-read)</li>
				<li>rich hickey talks</li>
			</ul>
		</div>
	);
}

function GuestbookPreview() {
	return (
		<div className="flex h-full w-full flex-col gap-1.5 bg-term-bg p-4 text-[10px]">
			<p className="text-[8px] uppercase tracking-[0.2em] text-term-dim">
				guestbook
			</p>
			<div className="flex flex-col gap-1">
				<p className="text-term-ink">
					great site.{" "}
					<span className="text-term-green">— @anon-dev</span>
				</p>
				<p className="text-term-ink">
					the snake game hit.{" "}
					<span className="text-term-green">— @pixel</span>
				</p>
				<p className="text-term-dim">
					can you add dark mode for the dark mode?{" "}
					<span className="text-term-green">— @jk</span>
				</p>
			</div>
			<div className="mt-auto flex items-center gap-1 border-t border-dashed border-term-rule pt-1 text-term-faint">
				<span className="text-term-green">›</span>
				<span>sign in with github to leave a note…</span>
			</div>
		</div>
	);
}
