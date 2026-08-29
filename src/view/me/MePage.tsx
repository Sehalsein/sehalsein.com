"use client";

import Link from "@/src/components/AppLink";
import { lazy, Suspense, useEffect, useState } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import { PALETTE_NAMES, type PaletteName } from "@/src/data/terminal";
import { RESUME_DATA } from "@/src/data/resume";
import { usePalette } from "@/src/view/ThemeProvider";
import type { PoseId } from "./poses";
import "./me.css";

const loadMeStage = createClientOnlyFn(() => import("./MeStage"));
const MeStage = lazy(loadMeStage);

/**
 * Swatch colours are hardcoded because a palette's variables only exist once
 * that palette is active — you cannot compute another theme's colours at
 * runtime. Kept in the order of PALETTE_NAMES.
 */
const SWATCHES: Record<PaletteName, [string, string, string]> = {
	default: ["#0a0b09", "#d6d3c4", "#9ece6a"],
	tokyonight: ["#1a1b26", "#c0caf5", "#9ece6a"],
	solarized: ["#002b36", "#eee8d5", "#859900"],
	gruvbox: ["#282828", "#ebdbb2", "#b8bb26"],
	nord: ["#2e3440", "#e5e9f0", "#a3be8c"],
	dracula: ["#282a36", "#f8f8f2", "#50fa7b"],
	catppuccin: ["#1e1e2e", "#cdd6f4", "#a6e3a1"],
	mono: ["#0a0a0a", "#e6e6e6", "#e6e6e6"],
	"github-dark": ["#010409", "#e6edf3", "#3fb950"],
	"github-dark-colorblind": ["#010409", "#c9d1d9", "#79c0ff"],
};

const FACTS = [
	"montreal, canada",
	"platform engineering at Planned",
	"co-founded DGymBook",
	"mostly typescript, go, postgres",
];

const HOW = [
	"it's a sticker, not a model — one PNG, no .glb anywhere",
	"the PNG is mapped onto a gently domed mesh; that dome is why turning gives real foreshortening instead of a slide",
	"the eyes are separate quads placed from UV-space calibration — they lead, the head follows, and the pupils drift back as it catches up",
	"waving is a static image rocked about the neck; blinking is a lid quad, never a texture swap",
	"~40 lines of shader and no downloaded assets",
];

const FOOTER_LINKS = [
	{ href: "/", label: "home" },
	{ href: "/terminal", label: "terminal" },
	{ href: "/os", label: "os" },
	{ href: "/resume", label: "resume" },
];

export default function MePage({ availablePoses }: { availablePoses: PoseId[] }) {
	return (
		// a <div>, not a <main> — app/layout.tsx already wraps every route in one
		<div className="me-page min-h-screen bg-term-bg text-term-ink antialiased">
			<div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-12 md:gap-14 md:px-10 md:py-20">
				<p className="text-[11px] uppercase tracking-[0.24em] text-term-dim">
					sehalsein.com / me
				</p>

				<div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:gap-12">
					{/* the canvas comes first on mobile — it's the hook */}
					<div className="order-1 md:order-2">
						<Suspense fallback={<div className="aspect-square" />}>
							<MeStage availablePoses={availablePoses} />
						</Suspense>
						<PaletteStrip />
					</div>

					<div className="order-2 flex flex-col gap-8 md:order-1">
						<header className="flex flex-col gap-3">
							<h1 className="text-3xl font-medium tracking-tight text-term-ink md:text-4xl">
								hi, I&apos;m {RESUME_DATA.name.split(" ")[0]}
							</h1>
							<p className="max-w-xl text-sm leading-relaxed text-term-dim md:text-[15px]">
								Senior software engineer in {RESUME_DATA.location}. Co-founded
								DGymBook, now building platform at Planned. The face over there is
								watching your cursor — hover a line below and it will look at that
								instead.
							</p>
						</header>

						<Section title="facts" items={FACTS} />
						<Section title="how this thing works" items={HOW} />

						<nav
							aria-label="Elsewhere on this site"
							className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[12px]"
						>
							{FOOTER_LINKS.map((l) => (
								<Link
									key={l.href}
									href={l.href}
									data-me-glance
									className="text-term-blue underline-offset-4 hover:text-term-green hover:underline"
								>
									→ {l.label}
								</Link>
							))}
						</nav>
					</div>
				</div>
			</div>
		</div>
	);
}

function Section({ title, items }: { title: string; items: string[] }) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="me-section-title">{title}</h2>
			<ul className="flex flex-col gap-1">
				{items.map((item) => (
					// data-me-glance is what the stage watches for — hover one of these
					// and the character looks at it
					<li key={item} className="me-row" data-me-glance>
						<span>{item}</span>
					</li>
				))}
			</ul>
		</section>
	);
}

function PaletteStrip() {
	const { theme, setTheme } = usePalette();
	const [mounted, setMounted] = useState(false);
	const [motion, setMotion] = useState(true);

	useEffect(() => {
		setMounted(true);
		const stored = window.localStorage.getItem("me:motion");
		const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const enabled = stored === null ? !prefersReduced : stored === "on";
		setMotion(enabled);
		// only override the media query once the user has actually chosen
		if (stored !== null) {
			window.dispatchEvent(new CustomEvent("me:motion", { detail: { enabled } }));
		}
	}, []);

	function toggleMotion() {
		const next = !motion;
		setMotion(next);
		window.localStorage.setItem("me:motion", next ? "on" : "off");
		window.dispatchEvent(new CustomEvent("me:motion", { detail: { enabled: next } }));
	}

	return (
		<div className="mt-6 flex flex-col gap-3">
			<h2 className="me-section-title">palette</h2>
			<div className="me-palette">
				{PALETTE_NAMES.map((name) => {
					const [bg, ink, accent] = SWATCHES[name];
					return (
						<button
							key={name}
							type="button"
							data-me-glance
							title={name}
							aria-label={`Use the ${name} palette`}
							aria-pressed={mounted ? theme === name : false}
							className="me-swatch"
							onClick={() => setTheme(name)}
						>
							<span style={{ background: bg }} />
							<span style={{ background: ink }} />
							<span style={{ background: accent }} />
						</button>
					);
				})}
			</div>
			<div>
				<button type="button" className="me-toggle" onClick={toggleMotion}>
					motion: {motion ? "on" : "off"}
				</button>
			</div>
		</div>
	);
}
