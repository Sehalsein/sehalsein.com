"use client";

import { useMemo, useState } from "react";
import { RESUME_DATA } from "@/src/data/resume";

type Project = {
	slug: string;
	company: string;
	year: string;
	role: string;
	desc: string;
	gradient: [string, string];
};

const GRADIENTS: [string, string][] = [
	["var(--green)", "var(--blue)"],
	["var(--amber)", "var(--red)"],
	["var(--red)", "var(--mag)"],
	["var(--mag)", "var(--blue)"],
	["var(--cyan)", "var(--green)"],
	["var(--blue)", "var(--cyan)"],
	["var(--amber)", "var(--green)"],
];

const PROJECTS: Project[] = RESUME_DATA.experience.map((exp, i) => ({
	slug: exp.company.toLowerCase().replace(/\s+/g, "-"),
	company: exp.company,
	year: exp.duration.to
		? `${exp.duration.from}—${exp.duration.to}`
		: `${exp.duration.from}—now`,
	role: exp.position.toLowerCase(),
	desc:
		exp.description.length > 0
			? exp.description.join(" ")
			: `${exp.position} at ${exp.company}.`,
	gradient: GRADIENTS[i % GRADIENTS.length],
}));

export default function Finder() {
	const [selected, setSelected] = useState<Project | null>(null);
	const [section, setSection] = useState<"all" | "current">("all");

	const current = useMemo(
		() => PROJECTS.filter((p) => p.year.endsWith("now")),
		[],
	);
	const items = section === "current" ? current : PROJECTS;

	return (
		<div className="app-finder">
			<div className="side">
				<div className="finder-brand">
					<span>P</span>
					<div><strong>Projects</strong><small>Sehal Sein</small></div>
				</div>
				<div className="hdr">Library</div>
				<button
					type="button"
					className={`it${section === "all" ? " active" : ""}`}
					onClick={() => setSection("all")}
				>
					All Projects
				</button>
				<button
					type="button"
					className={`it${section === "current" ? " active" : ""}`}
					onClick={() => setSection("current")}
				>
					Current
				</button>
				<div className="hdr">Tags</div>
				<div className="finder-tag"><i className="blue" /> full-stack</div>
				<div className="finder-tag"><i className="violet" /> platform</div>
				<div className="finder-tag"><i className="mint" /> infrastructure</div>
			</div>
			<div className="col">
				<header className="finder-toolbar">
					<div>
						<span className="finder-kicker">Portfolio archive</span>
						<h2>{section === "current" ? "Current work" : "All projects"}</h2>
					</div>
					<span className="finder-count">{items.length} projects</span>
				</header>
				<div className="grid">
					{items.map((p) => (
						<button
							type="button"
							key={p.slug}
							className="item"
							onClick={() => setSelected(p)}
						>
							<div
								className="ic"
								style={{
									background: `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})`,
								}}
							>
								{p.company[0].toUpperCase()}
							</div>
							<div className="item-copy">
								<div className="nm">{p.company}</div>
								<div className="mt">{p.role}</div>
								<div className="yr">{p.year}</div>
							</div>
							<span className="item-open" aria-hidden="true">↗</span>
						</button>
					))}
				</div>
				{selected && (
					<div className="detail">
						<div>
							<span className="finder-kicker">Selected project</span>
							<h3>{selected.company}</h3>
							<div className="d">
								{selected.year} · {selected.role}
							</div>
						</div>
						<p>{selected.desc}</p>
					</div>
				)}
			</div>
		</div>
	);
}
