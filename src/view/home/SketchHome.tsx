import Link from "@/src/components/AppLink";
import { RESUME_DATA } from "@/src/data/resume";
import HomeStyleToggle, {
	type HomeLayout,
} from "@/src/view/home/HomeStyleToggle";
import {
	EXPERIMENTS,
	type ExperimentVisualName,
	WORK,
} from "@/src/view/home/homeData";
import { type CSSProperties, useEffect, useRef } from "react";
import "./sketch.css";

type SketchHomeProps = {
	layout: HomeLayout;
	onLayoutChange: (layout: HomeLayout) => void;
};

const sketchDelay = (index: number) =>
	({ "--sketch-delay": `${index * 80}ms` }) as CSSProperties;

const workTilt = ["-0.8deg", "0.65deg", "-0.35deg"] as const;

export default function SketchHome({
	layout,
	onLayoutChange,
}: SketchHomeProps) {
	const pageRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const page = pageRef.current;
		if (!page) return;

		const items = Array.from(
			page.querySelectorAll<HTMLElement>("[data-sketch-reveal]"),
		);
		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (reducedMotion) {
			for (const item of items) item.classList.add("is-visible");
			return;
		}

		page.classList.add("has-sketch-motion");
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					entry.target.classList.add("is-visible");
					observer.unobserve(entry.target);
				}
			},
			{ rootMargin: "0px 0px -9%", threshold: 0.08 },
		);

		for (const item of items) observer.observe(item);
		return () => observer.disconnect();
	}, []);

	return (
		<main className="sketch-home" ref={pageRef}>
			<SketchHeader layout={layout} onLayoutChange={onLayoutChange} />
			<div className="sketch-paper">
				<SketchHero />
				<SketchWork />
				<SketchExperiments />
				<SketchNotes />
				<SketchFooter />
			</div>
		</main>
	);
}

function SketchHeader({ layout, onLayoutChange }: SketchHomeProps) {
	return (
		<header className="sketch-topbar">
			<div className="sketch-topbar-inner">
				<Link className="sketch-signature" href="/" aria-label="Sehal Sein, home">
					Sehal <span>Sein</span>
				</Link>
				<nav aria-label="Sketchbook navigation">
					<a href="#hello">hello</a>
					<a href="#work">work</a>
					<a href="#experiments">playground</a>
					<a href={`mailto:${RESUME_DATA.email}`}>say hi</a>
				</nav>
				<HomeStyleToggle
					layout={layout}
					onChange={onLayoutChange}
					tone="sketch"
				/>
			</div>
		</header>
	);
}

function SketchHero() {
	const github = RESUME_DATA.social.find((item) => item.name === "Github")?.url;
	const linkedin = RESUME_DATA.social.find(
		(item) => item.name === "LinkedIn",
	)?.url;

	return (
		<section className="sketch-hero" id="hello" aria-labelledby="sketch-title">
			<div className="sketch-hero-copy">
				<p className="sketch-kicker" data-sketch-reveal>
					<span>Montreal, Canada</span>
					available for a good conversation
				</p>
				<h1 id="sketch-title" data-sketch-reveal>
					I build <span className="sketch-circle">products</span>, teams,
					<br /> &amp; little worlds.
				</h1>
				<p className="sketch-intro" data-sketch-reveal>
					Hey, I&apos;m Sehal—an engineering lead who still likes being close
					to the work. I turn vague ideas into useful software, help teams
					ship with confidence, and make browser games when I should probably
					be sleeping.
				</p>
				<div className="sketch-hero-links" data-sketch-reveal>
					<a href={`mailto:${RESUME_DATA.email}`}>write me a note</a>
					{github ? <a href={github} target="_blank" rel="noreferrer">github ↗</a> : null}
					{linkedin ? <a href={linkedin} target="_blank" rel="noreferrer">linkedin ↗</a> : null}
				</div>
				<svg className="sketch-hero-arrow" viewBox="0 0 240 116" aria-hidden="true">
					<path pathLength="1" d="M5 18C84 0 151 20 193 57c18 16 22 35 17 48" />
					<path pathLength="1" d="m192 91 18 14 8-22" />
				</svg>
				<span className="sketch-arrow-note" aria-hidden="true">that&apos;s me, usually thinking</span>
			</div>

			<aside className="sketch-portrait-cluster" data-sketch-reveal>
				<figure className="sketch-polaroid">
					<span className="sketch-tape" aria-hidden="true" />
					<img
						src={RESUME_DATA.photo}
						alt="Sehal smiling at his desk, surrounded by computer monitors"
						width="960"
						height="643"
					/>
					<figcaption>documenting the rare quiet moment</figcaption>
				</figure>
				<div className="sketch-sticky-note">
					<strong>right now</strong>
					<ul>
						<li>leading engineering at Planned</li>
						<li>building DGymBook</li>
						<li>tuning imaginary race cars</li>
					</ul>
					<svg viewBox="0 0 70 28" aria-hidden="true"><path pathLength="1" d="M2 18c17 7 42 5 65-8" /></svg>
				</div>
			</aside>
		</section>
	);
}

function SketchWork() {
	return (
		<section className="sketch-section sketch-work" id="work" aria-labelledby="sketch-work-title">
			<SketchSectionTitle
				index="01"
				title="Work in the margins"
				note="the short version"
				id="sketch-work-title"
			/>
			<div className="sketch-timeline">
				{WORK.map((item, index) => (
					<article
						className="sketch-work-card"
						data-sketch-reveal
						key={item.company}
						style={{
							...sketchDelay(index),
							"--card-tilt": workTilt[index],
						} as CSSProperties}
					>
						<div className="sketch-work-pin" aria-hidden="true" />
						<time>{item.period}</time>
						<div className="sketch-work-heading">
							<h3>{item.company}</h3>
							<span>{item.role}</span>
						</div>
						<p>{item.description}</p>
					</article>
				))}
			</div>
			<p className="sketch-margin-link" data-sketch-reveal>
				<span aria-hidden="true">↳</span> the longer story is in my <Link href="/resume">resume</Link>
			</p>
		</section>
	);
}

function SketchExperiments() {
	return (
		<section
			className="sketch-section sketch-experiments"
			id="experiments"
			aria-labelledby="sketch-experiments-title"
		>
			<SketchSectionTitle
				index="02"
				title="The messy playground"
				note="click anything—these are real"
				id="sketch-experiments-title"
			/>
			<p className="sketch-experiments-intro" data-sketch-reveal>
				Side projects are where I learn without a roadmap. Some became games,
				some became interfaces, and one became an entire tiny operating system.
			</p>
			<div className="sketch-project-board">
				{EXPERIMENTS.map((experiment, index) => (
					<Link
						className={`sketch-project-card sketch-project-card--${experiment.visual}`}
						data-sketch-reveal
						href={experiment.href}
						key={experiment.name}
						style={sketchDelay(index)}
					>
						<div className="sketch-project-art">
							<span>{String(index + 1).padStart(2, "0")}</span>
							<SketchDoodle visual={experiment.visual} />
						</div>
						<div className="sketch-project-copy">
							<p>{experiment.category}</p>
							<h3>{experiment.name}</h3>
							<span>{experiment.description}</span>
							<i aria-hidden="true">open ↗</i>
						</div>
					</Link>
				))}
			</div>
		</section>
	);
}

function SketchNotes() {
	return (
		<section className="sketch-section sketch-notes" id="notes" aria-labelledby="sketch-notes-title">
			<SketchSectionTitle
				index="03"
				title="Notes to self"
				note="the things I try not to forget"
				id="sketch-notes-title"
			/>
			<div className="sketch-note-grid">
				<article className="sketch-note-sheet" data-sketch-reveal>
					<span className="sketch-paperclip" aria-hidden="true" />
					<h3>when building</h3>
					<ul>
						<li>Useful before impressive.</li>
						<li>Make the system explainable.</li>
						<li>Leave room for the next person.</li>
					</ul>
				</article>
				<article className="sketch-note-sheet sketch-note-sheet--blue" data-sketch-reveal>
					<h3>usually on my desk</h3>
					<ul>
						<li>TypeScript, Go, React &amp; Postgres.</li>
						<li>A notebook full of boxes and arrows.</li>
						<li>One side project that got out of hand.</li>
					</ul>
				</article>
				<aside className="sketch-side-note" data-sketch-reveal>
					<p>Good software should feel obvious after someone did the hard thinking.</p>
					<svg viewBox="0 0 180 35" aria-hidden="true"><path pathLength="1" d="M3 23c43 12 102 9 173-13" /></svg>
				</aside>
			</div>
		</section>
	);
}

function SketchFooter() {
	return (
		<footer className="sketch-footer" data-sketch-reveal>
			<p>Got an interesting problem?</p>
			<a href={`mailto:${RESUME_DATA.email}`}>{RESUME_DATA.email}</a>
			<div>
				<span>made carefully in Montreal</span>
				<span className="sketch-stamp">SEHAL / 2026</span>
			</div>
		</footer>
	);
}

function SketchSectionTitle({
	index,
	title,
	note,
	id,
}: {
	index: string;
	title: string;
	note: string;
	id: string;
}) {
	return (
		<header className="sketch-section-title" data-sketch-reveal>
			<span>{index}</span>
			<h2 id={id}>{title}</h2>
			<p>{note}</p>
			<svg viewBox="0 0 390 20" preserveAspectRatio="none" aria-hidden="true">
				<path pathLength="1" d="M2 13c91-9 205 5 386-8" />
			</svg>
		</header>
	);
}

function SketchDoodle({ visual }: { visual: ExperimentVisualName }) {
	if (visual === "racer") {
		return (
			<svg className="sketch-doodle" viewBox="0 0 320 180" aria-hidden="true">
				<path pathLength="1" d="M18 149C88 120 78 41 162 32c77-8 62 87 140 104" />
				<path pathLength="1" d="M22 164c83-31 72-105 143-114 63-8 61 75 138 99" />
				<path pathLength="1" d="m124 96 35-13 26 14-34 15Z" />
				<circle cx="143" cy="108" r="6" /><circle cx="177" cy="99" r="6" />
				<path pathLength="1" d="m261 61 0 48m0-47 35 14-35 11m9-22v34m-9-22h35m-35 11h35" />
			</svg>
		);
	}

	if (visual === "doom") {
		return (
			<svg className="sketch-doodle" viewBox="0 0 320 180" aria-hidden="true">
				<path pathLength="1" d="M12 14 110 63v73L12 170m296-156-98 49v73l98 34M110 63h100M110 136h100" />
				<path pathLength="1" d="M145 77h31l15 25-30 25-32-25Z" />
				<circle cx="151" cy="98" r="4" /><circle cx="171" cy="98" r="4" />
				<path pathLength="1" d="m151 115 10-5 10 5m-7-54v14m-7-7h14" />
			</svg>
		);
	}

	if (visual === "adventure") {
		return (
			<svg className="sketch-doodle" viewBox="0 0 320 180" aria-hidden="true">
				<path pathLength="1" d="M8 148c54-44 87-10 122-46 35-37 64-24 91-63 22-32 54-21 92-28" />
				<path pathLength="1" d="m43 128 36-61 34 49 43-79 53 88" />
				<path pathLength="1" d="M244 36a20 20 0 1 0 25 28 24 24 0 0 1-25-28Z" />
				<circle cx="26" cy="151" r="5" /><path pathLength="1" d="m22 147 8 8m-8 0 8-8" />
				<path pathLength="1" strokeDasharray="4 9" d="M31 149c50-27 79 5 112-31 32-35 71-37 98-75" />
			</svg>
		);
	}

	if (visual === "os") {
		return (
			<svg className="sketch-doodle" viewBox="0 0 320 180" aria-hidden="true">
				<rect x="27" y="24" width="218" height="128" rx="5" />
				<path pathLength="1" d="M27 48h218M41 36h2m10 0h2m10 0h2" />
				<rect x="88" y="63" width="202" height="93" rx="4" />
				<path pathLength="1" d="M88 82h202m-184 20h74m-74 17h108m-108 17h53" />
				<path pathLength="1" d="m36 142 23-23 18 12" />
			</svg>
		);
	}

	return (
		<svg className="sketch-doodle" viewBox="0 0 320 180" aria-hidden="true">
			<rect x="18" y="22" width="284" height="136" rx="4" />
			<path pathLength="1" d="M18 47h284M31 35h2m10 0h2m10 0h2M40 69l12 8-12 8m25 0h60M40 104l12 8-12 8m25 0h103" />
			<path className="sketch-cursor" pathLength="1" d="M179 120h20" />
		</svg>
	);
}
