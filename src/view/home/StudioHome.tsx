import Link from "@/src/components/AppLink";
import { RESUME_DATA } from "@/src/data/resume";
import HomeStyleToggle, {
	type HomeLayout,
} from "@/src/view/home/HomeStyleToggle";
import { EXPERIMENTS, WORK } from "@/src/view/home/homeData";
import "./studio.css";

type StudioHomeProps = {
	layout: HomeLayout;
	onLayoutChange: (layout: HomeLayout) => void;
	preferencesReady: boolean;
};

const PRINCIPLES = [
	{
		number: "01",
		title: "Make it useful.",
		copy: "A clever system is worthless if it makes the person using it feel stupid.",
	},
	{
		number: "02",
		title: "Own the seams.",
		copy: "Product, architecture, delivery, and the team are one connected problem.",
	},
	{
		number: "03",
		title: "Keep it weird.",
		copy: "The best way to stay sharp is to build things nobody asked for.",
	},
] as const;

const PROOF = [
	{ value: "50K+", label: "people on a product I co-founded" },
	{ value: "150K", label: "concurrent players supported" },
	{ value: "07+", label: "years making software behave" },
] as const;

export default function StudioHome({
	layout,
	onLayoutChange,
	preferencesReady,
}: StudioHomeProps) {
	return (
		<main className="studio-home" data-layout-pending={!preferencesReady}>
			<StudioHeader layout={layout} onLayoutChange={onLayoutChange} />
			<StudioHero />
			<StudioTicker />
			<StudioManifesto />
			<StudioWorkModes />
			<StudioProof />
			<StudioProjects />
			<StudioFooter />
		</main>
	);
}

function StudioHeader({
	layout,
	onLayoutChange,
}: Omit<StudioHomeProps, "preferencesReady">) {
	return (
		<header className="studio-header">
			<Link className="studio-wordmark" href="/" aria-label="Sehal Sein, home">
				SEHAL<span>//</span>SEIN
			</Link>

			<nav aria-label="Primary navigation">
				<a href="#work">Work</a>
				<a href="#lab">Play</a>
				<Link href="/resume">Resume</Link>
			</nav>

			<div className="studio-header-tools">
				<HomeStyleToggle
					layout={layout}
					onChange={onLayoutChange}
					tone="studio"
				/>
				<a className="studio-contact" href={`mailto:${RESUME_DATA.email}`}>
					Talk <Arrow />
				</a>
			</div>
		</header>
	);
}

function StudioHero() {
	return (
		<section className="studio-hero" aria-labelledby="studio-title">
			<div className="studio-hero-meta">
				<span>Engineering lead / Product builder</span>
				<span>Montréal, QC</span>
				<span>Local time: Eastern</span>
			</div>

			<h1 id="studio-title">
				<span>I make</span>
				<span>software</span>
				<span>matter.</span>
			</h1>

			<figure className="studio-portrait">
				<img
					src={RESUME_DATA.photo}
					alt="Sehal Sein smiling at his desk"
					width="960"
					height="643"
					fetchPriority="high"
				/>
				<figcaption>Yes, I also ship.</figcaption>
			</figure>

			<div className="studio-hero-intro">
				<p>
					I lead engineering, build products, and turn half-formed ideas
					into systems real people can depend on.
				</p>
				<a href="#work">
					Scroll for evidence <DownArrow />
				</a>
			</div>

			<div className="studio-hero-stamp" aria-hidden="true">
				<span>NO.</span>
				<strong>042</strong>
				<span>EST. 2018</span>
			</div>
		</section>
	);
}

function StudioTicker() {
	const words = ["SHIP", "SCALE", "BREAK", "FIX", "REPEAT"];

	return (
		<div className="studio-ticker" aria-label="Ship, scale, break, fix, repeat">
			<div>
				{[...words, ...words].map((word, index) => (
					<span key={`${word}-${index}`}>
						{word}<i aria-hidden="true">✦</i>
					</span>
				))}
			</div>
		</div>
	);
}

function StudioManifesto() {
	return (
		<section className="studio-manifesto" aria-labelledby="studio-manifesto-title">
			<div className="studio-manifesto-lead">
				<span className="studio-kicker">A tiny manifesto</span>
				<h2 id="studio-manifesto-title">
					The job is not to write code. The job is to remove friction.
				</h2>
			</div>

			<div className="studio-principles">
				{PRINCIPLES.map((principle) => (
					<article key={principle.number}>
						<span>{principle.number}</span>
						<h3>{principle.title}</h3>
						<p>{principle.copy}</p>
					</article>
				))}
			</div>
		</section>
	);
}

function StudioWorkModes() {
	return (
		<section className="studio-work" id="work" aria-labelledby="studio-work-title">
			<header>
				<span className="studio-kicker">What I actually do</span>
				<h2 id="studio-work-title">Three hats.<br />One head.</h2>
			</header>

			<div className="studio-work-grid">
				<article className="studio-work-card studio-work-card--lead">
					<span className="studio-work-number">01</span>
					<div>
						<span>Day job</span>
						<h3>Lead</h3>
						<p>
							Set technical direction, grow the team, unblock delivery, and
							keep the product connected to the system underneath it.
						</p>
					</div>
					<strong>{WORK[0].company} / {WORK[0].period}</strong>
				</article>

				<article className="studio-work-card studio-work-card--found">
					<span className="studio-work-number">02</span>
					<div>
						<span>Long bet</span>
						<h3>Found</h3>
						<p>
							Take the messy path from idea to infrastructure to a product
							used by more than fifty thousand people.
						</p>
					</div>
					<strong>DGymBook / since 2022</strong>
				</article>

				<article className="studio-work-card studio-work-card--play">
					<span className="studio-work-number">03</span>
					<div>
						<span>After hours</span>
						<h3>Play</h3>
						<p>
							Build games, tools, and strange browser worlds to learn what
							a normal roadmap would never teach me.
						</p>
					</div>
					<a href="#lab">Enter the playground <Arrow /></a>
				</article>
			</div>
		</section>
	);
}

function StudioProof() {
	return (
		<section className="studio-proof" aria-label="Selected proof points">
			<header>
				<span>Proof, not adjectives</span>
				<i aria-hidden="true">↓</i>
			</header>
			<div>
				{PROOF.map((item) => (
					<article key={item.value}>
						<strong>{item.value}</strong>
						<span>{item.label}</span>
					</article>
				))}
			</div>
		</section>
	);
}

function StudioProjects() {
	return (
		<section className="studio-projects" id="lab" aria-labelledby="studio-projects-title">
			<header>
				<span className="studio-kicker">Playground / 06 experiments</span>
				<h2 id="studio-projects-title">Side<br />quests.</h2>
				<p>Real things. Running here. Click recklessly.</p>
			</header>

			<div className="studio-project-list">
				{EXPERIMENTS.map((experiment, index) => (
					<Link
						className={`studio-project studio-project--${experiment.visual}`}
						href={experiment.href}
						key={experiment.name}
					>
						<span className="studio-project-index">
							{String(index + 1).padStart(2, "0")}
						</span>
						<div>
							<span>{experiment.category}</span>
							<h3>{experiment.name}</h3>
						</div>
						<p>{experiment.description}</p>
						<i aria-hidden="true"><Arrow /></i>
					</Link>
				))}
			</div>
		</section>
	);
}

function StudioFooter() {
	return (
		<footer className="studio-footer">
			<div className="studio-footer-topline">
				<span>Available for ambitious problems</span>
				<span>Montréal → anywhere</span>
			</div>
			<h2>Make some<br />noise.</h2>
			<a href={`mailto:${RESUME_DATA.email}`}>
				<span>{RESUME_DATA.email}</span>
				<i aria-hidden="true"><Arrow /></i>
			</a>
			<div className="studio-footer-bottom">
				<span>© {new Date().getFullYear()} Sehal Sein</span>
				<div>
					{RESUME_DATA.social.map((item) => (
						<a href={item.url} key={item.name} target="_blank" rel="noreferrer">
							{item.name}
						</a>
					))}
					<Link href="/resume">Résumé</Link>
				</div>
			</div>
		</footer>
	);
}

function Arrow() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M4 20 20 4M7 4h13v13" />
		</svg>
	);
}

function DownArrow() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 3v18M5 14l7 7 7-7" />
		</svg>
	);
}
