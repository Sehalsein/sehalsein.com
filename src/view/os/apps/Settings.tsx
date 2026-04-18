"use client";

import { useState } from "react";
import { PALETTE_NAMES } from "@/src/data/terminal";
import { useSystemPrefs, type WallId } from "../hooks/useSystemPrefs";

const PALETTES = PALETTE_NAMES;

const PALETTE_COLORS: Record<string, [string, string, string, string]> = {
	default: ["#0a0b09", "#9ece6a", "#d9a05b", "#7aa2f7"],
	tokyonight: ["#1a1b26", "#9ece6a", "#e0af68", "#7aa2f7"],
	solarized: ["#002b36", "#859900", "#b58900", "#268bd2"],
	gruvbox: ["#282828", "#b8bb26", "#fabd2f", "#83a598"],
	nord: ["#2e3440", "#a3be8c", "#ebcb8b", "#81a1c1"],
	dracula: ["#282a36", "#50fa7b", "#ffb86c", "#8be9fd"],
	catppuccin: ["#1e1e2e", "#a6e3a1", "#f9e2af", "#89b4fa"],
	mono: ["#0a0a0a", "#e6e6e6", "#aaaaaa", "#888888"],
	"github-dark": ["#010409", "#3fb950", "#e3b341", "#58a6ff"],
	"github-dark-colorblind": ["#010409", "#79c0ff", "#fdac54", "#58a6ff"],
};

function swatchLabel(name: string): string {
	if (name.includes("-")) {
		return name
			.split("-")
			.map((part) => part[0])
			.join("")
			.toUpperCase()
			.slice(0, 3);
	}
	return name.slice(0, 3).toUpperCase();
}

const WALLS: {
	id: WallId;
	bg: string;
}[] = [
	{
		id: "0",
		bg: "linear-gradient(135deg, color-mix(in srgb, var(--green) 30%, var(--bg)), color-mix(in srgb, var(--mag) 30%, var(--bg)), var(--bg))",
	},
	{
		id: "1",
		bg: "linear-gradient(135deg, color-mix(in srgb, var(--blue) 40%, var(--bg)), var(--bg))",
	},
	{
		id: "2",
		bg: "var(--bg)",
	},
	{
		id: "3",
		bg: "radial-gradient(ellipse at center, color-mix(in srgb, var(--amber) 30%, var(--bg)), var(--bg))",
	},
];

type Section = "appearance" | "general" | "about";

export default function Settings() {
	const { palette, setPalette, crt, toggleCrt, wall, setWall } =
		useSystemPrefs();
	const [section, setSection] = useState<Section>("appearance");

	return (
		<div className="app-settings">
			<nav className="nav" aria-label="Settings sections">
				{(
					[
						["appearance", "Appearance"],
						["general", "General"],
						["about", "About"],
					] as const
				).map(([id, label]) => (
					<button
						type="button"
						key={id}
						className={`item${section === id ? " active" : ""}`}
						onClick={() => setSection(id)}
					>
						{label}
					</button>
				))}
			</nav>
			<div className="main">
				{section === "appearance" && (
					<AppearanceSection
						palette={palette}
						setPalette={setPalette}
						crt={crt}
						toggleCrt={toggleCrt}
						wall={wall}
						setWall={setWall}
					/>
				)}
				{section === "general" && <GeneralSection />}
				{section === "about" && <AboutSection />}
			</div>
		</div>
	);
}

type AppearanceProps = {
	palette: string;
	setPalette: (p: string) => void;
	crt: "on" | "off";
	toggleCrt: () => void;
	wall: WallId;
	setWall: (w: WallId) => void;
};

function AppearanceSection({
	palette,
	setPalette,
	crt,
	toggleCrt,
	wall,
	setWall,
}: AppearanceProps) {
	return (
		<>
			<h2>Appearance</h2>
			<div className="row">
				<div className="label">Colorscheme</div>
				<div className="swatches">
					{PALETTES.map((p) => {
						const colors = PALETTE_COLORS[p];
						return (
							<button
								type="button"
								key={p}
								aria-label={`palette ${p}`}
								aria-pressed={palette === p}
								className={`sw${palette === p ? " active" : ""}`}
								style={{
									background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 40%, ${colors[1]} 40%, ${colors[1]} 60%, ${colors[2]} 60%, ${colors[2]} 80%, ${colors[3]} 80%)`,
								}}
								onClick={() => setPalette(p)}
							>
								<span className="lbl">{swatchLabel(p)}</span>
							</button>
						);
					})}
				</div>
			</div>
			<div className="row">
				<div className="label">CRT effect</div>
				<div className="flex items-center gap-2.5">
					<button
						type="button"
						aria-pressed={crt === "on"}
						aria-label="toggle CRT"
						className={`toggle${crt === "on" ? " on" : ""}`}
						onClick={toggleCrt}
					/>
					<span className="text-[11px] text-[color:var(--dim)]">
						scanlines · glow · flicker
					</span>
				</div>
			</div>
			<div className="row">
				<div className="label">Wallpaper</div>
				<div className="walls max-w-[400px]">
					{WALLS.map((w) => (
						<button
							type="button"
							key={w.id}
							aria-label={`wallpaper ${w.id}`}
							aria-pressed={wall === w.id}
							className={`wall${wall === w.id ? " active" : ""}`}
							style={{ background: w.bg }}
							onClick={() => setWall(w.id)}
						/>
					))}
				</div>
			</div>
		</>
	);
}

function GeneralSection() {
	return (
		<>
			<h2>General</h2>
			<p className="text-[12px] text-[color:var(--dim)]">
				nothing to see here — yet.
			</p>
		</>
	);
}

function AboutSection() {
	return (
		<>
			<h2>About this OS</h2>
			<p className="text-[12.5px] leading-[1.6] text-[color:var(--ink)]">
				sehalOS · a desktop environment that happens to be a portfolio.
			</p>
		</>
	);
}
