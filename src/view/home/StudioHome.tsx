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

const CAPABILITIES = [
	"Product engineering",
	"Technical direction",
	"Team leadership",
	"Playful prototyping",
] as const;

export default function StudioHome({
	layout,
	onLayoutChange,
	preferencesReady,
}: StudioHomeProps) {
	return (
		<main
			className="studio-home"
			data-layout-pending={!preferencesReady}
		>
			<div className="studio-canvas">
				<StudioHeader layout={layout} onLayoutChange={onLayoutChange} />
				<StudioHero />
				<StudioExperiments />
				<StudioExperience />
				<StudioFooter />
			</div>
		</main>
	);
}

function StudioHeader({
	layout,
	onLayoutChange,
}: Omit<StudioHomeProps, "preferencesReady">) {
	return (
		<header className="studio-header">
			<Link href="/" className="studio-logo" aria-label="Sehal Sein, home">
				<span>sehal</span>sein<i aria-hidden="true">.</i>
			</Link>

			<nav aria-label="Primary navigation">
				<a href="#work">Work</a>
				<a href="#lab">Playground</a>
				<Link href="/now">Now</Link>
				<Link href="/resume">Resume</Link>
			</nav>

			<div className="studio-header-actions">
				<HomeStyleToggle
					layout={layout}
					onChange={onLayoutChange}
					tone="studio"
				/>
				<a className="studio-outline-button" href={`mailto:${RESUME_DATA.email}`}>
					Say hello <Arrow />
				</a>
			</div>
		</header>
	);
}

function StudioHero() {
	return (
		<section className="studio-hero" aria-labelledby="studio-title">
			<div className="studio-hero-copy studio-card">
				<div className="studio-eyebrow">
					<span>Engineering lead · builder</span>
					<span>Montréal / 2026</span>
				</div>
				<h1 id="studio-title">
					I build digital
					<strong>systems</strong>
					<em>people use.</em>
				</h1>
				<div className="studio-hero-bottom">
					<p>
						I turn ambitious product ideas into dependable software—then
						make strange little browser worlds after hours.
					</p>
					<div className="studio-hero-buttons">
						<a className="studio-button studio-button--lime" href="#lab">
							Explore my work <Arrow />
						</a>
						<a className="studio-text-link" href={`mailto:${RESUME_DATA.email}`}>
							Let&apos;s talk
						</a>
					</div>
				</div>
			</div>

		<article className="studio-profile studio-card">
			<div className="studio-profile-image">
				<img
					src={RESUME_DATA.photo}
					alt="Sehal smiling at his desk, surrounded by computer monitors"
					width="960"
					height="643"
				/>
				<span className="studio-status"><i /> Building now</span>
			</div>
			<div className="studio-profile-copy">
				<p>Sehal Sein</p>
				<strong>Engineer, founder &amp; occasional game maker.</strong>
				<Link href="/resume" aria-label="Read Sehal's resume"><Arrow /></Link>
			</div>
		</article>

		<article className="studio-feature-card studio-feature-card--orange studio-card" id="work">
			<div className="studio-feature-top">
				<span>01 / Current</span>
				<CompanyGlyph variant="planned" />
			</div>
			<div>
				<p>{WORK[0].role}</p>
				<h2>{WORK[0].company}</h2>
				<span>{WORK[0].period}</span>
			</div>
		</article>

		<article className="studio-feature-card studio-feature-card--lime studio-card">
			<div className="studio-feature-top">
				<span>02 / Co-founded</span>
				<CompanyGlyph variant="dgym" />
			</div>
			<div>
				<p>Gym platform serving</p>
				<h2>50K+ people</h2>
				<span>DGymBook · 2022—now</span>
			</div>
		</article>
	</section>
	);
}

function StudioExperiments() {
	return (
		<section className="studio-lab" id="lab" aria-labelledby="studio-lab-title">
			<header className="studio-section-heading">
				<div>
					<span>03 / Selected experiments</span>
					<h2 id="studio-lab-title">Built to be played,<br />not just viewed.</h2>
				</div>
				<p>
					Every project below runs in this browser. They&apos;re where I test
					ideas, learn new systems, and let curiosity make the roadmap.
				</p>
			</header>

			<div className="studio-project-grid">
				{EXPERIMENTS.map((experiment, index) => (
					<Link
						className={`studio-project studio-project--${experiment.visual}`}
						href={experiment.href}
						key={experiment.name}
					>
						<div className="studio-project-art" aria-hidden="true">
							<span>{String(index + 1).padStart(2, "0")}</span>
							<ProjectGlyph visual={experiment.visual} />
						</div>
						<div className="studio-project-copy">
							<div>
								<span>{experiment.category}</span>
								<h3>{experiment.name}</h3>
							</div>
							<p>{experiment.description}</p>
							<i aria-hidden="true"><Arrow /></i>
						</div>
					</Link>
				))}
			</div>
		</section>
	);
}

function StudioExperience() {
	return (
		<section className="studio-experience" aria-labelledby="studio-experience-title">
			<div className="studio-experience-intro">
				<span>04 / Experience</span>
				<h2 id="studio-experience-title">From the product decision to the production system.</h2>
				<p>
					I like working across the seams: product, architecture, delivery,
					and the team that holds it all together.
				</p>
				<div className="studio-capabilities" aria-label="Capabilities">
					{CAPABILITIES.map((capability) => <span key={capability}>{capability}</span>)}
				</div>
			</div>

			<div className="studio-experience-list">
				{WORK.map((item, index) => (
					<article key={item.company}>
						<span className="studio-experience-index">{String(index + 1).padStart(2, "0")}</span>
						<div>
							<span>{item.role}</span>
							<h3>{item.company}</h3>
						</div>
						<time>{item.period}</time>
					</article>
				))}
				<Link className="studio-resume-link" href="/resume">
					Full working history <Arrow />
				</Link>
			</div>
		</section>
	);
}

function StudioFooter() {
	return (
		<footer className="studio-footer">
			<div>
				<span>Have an ambitious idea?</span>
				<h2>Let&apos;s make it real.</h2>
			</div>
			<a href={`mailto:${RESUME_DATA.email}`}>
				{RESUME_DATA.email} <Arrow />
			</a>
			<p>Montréal, Canada · Built with care and a questionable number of side projects.</p>
		</footer>
	);
}

function Arrow() {
	return (
		<svg viewBox="0 0 16 16" aria-hidden="true">
			<path d="M3.5 12.5 12.5 3.5M5 3.5h7.5V11" />
		</svg>
	);
}

function CompanyGlyph({ variant }: { variant: "planned" | "dgym" }) {
	return (
		<svg className={`studio-company-glyph studio-company-glyph--${variant}`} viewBox="0 0 52 52" aria-hidden="true">
			{variant === "planned" ? (
				<>
					<rect x="8" y="8" width="15" height="15" rx="3" />
					<rect x="29" y="8" width="15" height="15" rx="3" />
					<rect x="8" y="29" width="15" height="15" rx="3" />
					<path d="M29 36.5h15M36.5 29v15" />
				</>
			) : (
				<>
					<path d="M26 6 43 16v20L26 46 9 36V16L26 6Z" />
					<path d="m9 16 17 10 17-10M26 26v20" />
				</>
			)}
		</svg>
	);
}

function ProjectGlyph({ visual }: { visual: (typeof EXPERIMENTS)[number]["visual"] }) {
	if (visual === "racer") {
		return <div className="studio-glyph studio-glyph-racer"><i /><i /><b>184</b><em>KM/H</em></div>;
	}

	if (visual === "doom") {
		return <div className="studio-glyph studio-glyph-doom"><i /><i /><b>+</b><span>100%</span></div>;
	}

	if (visual === "adventure") {
		return <div className="studio-glyph studio-glyph-adventure"><span>THE PATH<br />FORKS HERE.</span><i>1</i><i>2</i></div>;
	}

	if (visual === "os") {
		return <div className="studio-glyph studio-glyph-os"><span /><span /><span /><i /><i /><i /><i /></div>;
	}

	if (visual === "editor") {
		return <div className="studio-glyph studio-glyph-editor"><b>Draft something<br />worth keeping.</b><span /><span /><span /><i>B&nbsp;&nbsp; I&nbsp;&nbsp; H1</i></div>;
	}

	return <div className="studio-glyph studio-glyph-terminal"><span>› whoami</span><b>sehal sein</b><span>› make something</span><i /></div>;
}
