import Link from "@/src/components/AppLink";
import { RESUME_DATA } from "@/src/data/resume";
import {
	type CSSProperties,
	lazy,
	startTransition,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import HomeStyleToggle, {
	type HomeLayout,
} from "@/src/view/home/HomeStyleToggle";
import {
	EXPERIMENTS,
	type ExperimentVisualName,
	WORK,
} from "@/src/view/home/homeData";
import "./home.css";

const SketchHome = lazy(() => import("@/src/view/home/SketchHome"));
const HOME_LAYOUT_KEY = "home-layout";

const revealDelay = (index: number) =>
	({ "--reveal-delay": `${index * 50}ms` }) as CSSProperties;

export default function HomePage() {
	const [layout, setLayout] = useState<HomeLayout>("readme");
	const [preferencesReady, setPreferencesReady] = useState(false);

	useEffect(() => {
		const restored = document.documentElement.dataset.homeLayout;
		if (restored === "sketch") setLayout("sketch");
		setPreferencesReady(true);
	}, []);

	const changeLayout = useCallback((nextLayout: HomeLayout) => {
		document.documentElement.dataset.homeLayout = nextLayout;
		try {
			window.localStorage.setItem(HOME_LAYOUT_KEY, nextLayout);
		} catch {
			// Storage can be unavailable in strict privacy modes; the toggle still works.
		}
		startTransition(() => setLayout(nextLayout));
	}, []);

	if (layout === "sketch") {
		return (
			<Suspense fallback={<div className="home-sketch-loading" aria-hidden="true" />}>
				<SketchHome layout={layout} onLayoutChange={changeLayout} />
			</Suspense>
		);
	}

	return (
		<ReadmeHome
			layout={layout}
			onLayoutChange={changeLayout}
			preferencesReady={preferencesReady}
		/>
	);
}

type HomeLayoutProps = {
	layout: HomeLayout;
	onLayoutChange: (layout: HomeLayout) => void;
};

function ReadmeHome({
	layout,
	onLayoutChange,
	preferencesReady,
}: HomeLayoutProps & { preferencesReady: boolean }) {
	const pageRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const page = pageRef.current;
		if (!page) return;

		const revealElements = Array.from(
			page.querySelectorAll<HTMLElement>("[data-reveal]"),
		);
		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (reducedMotion) {
			for (const element of revealElements) element.classList.add("is-visible");
		} else {
			for (const element of revealElements) {
				if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
					element.classList.add("is-visible");
				}
			}
			page.classList.add("has-reveal-motion");
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					entry.target.classList.add("is-visible");
					observer.unobserve(entry.target);
				}
			},
			{ rootMargin: "0px 0px -8%", threshold: 0.08 },
		);

		for (const element of revealElements) {
			if (!reducedMotion && !element.classList.contains("is-visible")) {
				observer.observe(element);
			}
		}

		const portrait = page.querySelector<HTMLElement>("[data-parallax]");
		const navLinks = Array.from(
			page.querySelectorAll<HTMLAnchorElement>("[data-section-link]"),
		);
		const navSections = navLinks.flatMap((link) => {
			const id = link.hash.slice(1);
			const section = document.getElementById(id);
			return section ? [{ id, link, section }] : [];
		});
		let animationFrame = 0;
		let activeSection = "";

		const updateScrollEffects = () => {
			animationFrame = 0;
			const scrollTop = window.scrollY;
			const scrollRange = Math.max(
				1,
				document.documentElement.scrollHeight - window.innerHeight,
			);
			page.style.setProperty(
				"--scroll-progress",
				Math.min(1, scrollTop / scrollRange).toFixed(4),
			);
			page.classList.toggle("is-scrolled", scrollTop > 18);

			if (!reducedMotion && portrait) {
				const rect = portrait.getBoundingClientRect();
				const distance = rect.top + rect.height / 2 - window.innerHeight / 2;
				const shift = Math.max(
					-24,
					Math.min(24, (-distance / window.innerHeight) * 38),
				);
				page.style.setProperty("--portrait-shift", `${shift.toFixed(2)}px`);
			}

			let nextActiveSection = "";
			for (const item of navSections) {
				if (item.section.getBoundingClientRect().top <= window.innerHeight * 0.38) {
					nextActiveSection = item.id;
				}
			}

			if (nextActiveSection !== activeSection) {
				activeSection = nextActiveSection;
				for (const item of navSections) {
					const isActive = item.id === activeSection;
					item.link.classList.toggle("is-active", isActive);
					if (isActive) item.link.setAttribute("aria-current", "location");
					else item.link.removeAttribute("aria-current");
				}
			}
		};

		const requestScrollUpdate = () => {
			if (animationFrame) return;
			animationFrame = window.requestAnimationFrame(updateScrollEffects);
		};

		requestScrollUpdate();
		window.addEventListener("scroll", requestScrollUpdate, { passive: true });
		window.addEventListener("resize", requestScrollUpdate);

		return () => {
			observer.disconnect();
			window.removeEventListener("scroll", requestScrollUpdate);
			window.removeEventListener("resize", requestScrollUpdate);
			if (animationFrame) window.cancelAnimationFrame(animationFrame);
		};
	}, []);

	return (
		<main
			className="home-readme"
			data-layout-pending={!preferencesReady}
			ref={pageRef}
		>
			<Header layout={layout} onLayoutChange={onLayoutChange} />
			<Hero />
			<Work />
			<Experiments />
			<Notes />
			<Footer />
		</main>
	);
}

function Header({ layout, onLayoutChange }: HomeLayoutProps) {
	return (
		<div className="readme-header-shell">
			<header className="readme-header readme-wrap readme-mono">
				<Link href="/" className="readme-name" aria-label="Sehal Sein, home">
					<span aria-hidden="true">●</span> sehal sein
				</Link>
				<span className="readme-location">montreal, canada</span>
				<nav aria-label="Primary navigation">
					<a href="#work" data-section-link>work</a>
					<a href="#experiments" data-section-link>experiments</a>
					<a href="#notes" data-section-link>notes</a>
					<Link href="/resume">resume</Link>
					<HomeStyleToggle
						layout={layout}
						onChange={onLayoutChange}
						tone="clean"
					/>
				</nav>
			</header>
		</div>
	);
}

function Hero() {
	const github = RESUME_DATA.social.find((item) => item.name === "Github")?.url;
	const linkedin = RESUME_DATA.social.find(
		(item) => item.name === "LinkedIn",
	)?.url;

	return (
		<section className="readme-hero readme-wrap" aria-labelledby="home-title">
			<div className="readme-hero-copy">
				<p className="readme-path readme-mono">/home/sehal</p>
				<div className="readme-title-clip">
					<h1 id="home-title">Hi, I&apos;m Sehal.</h1>
				</div>
				<p className="readme-lede">
					I&apos;m an engineer in Montreal. These days I lead engineering at
					Planned and work on DGymBook, a company I co-founded.
				</p>
				<p className="readme-about">
					I started building software professionally in 2018 and still like the
					part where a blank file becomes something another person can use. Most
					of my work lives somewhere between product decisions, architecture,
					and helping a team ship. I make small browser games on the side.
				</p>
				<div className="readme-links readme-mono">
					<a href={`mailto:${RESUME_DATA.email}`}>email</a>
					{github ? (
						<a href={github} target="_blank" rel="noreferrer">
							github
						</a>
					) : null}
					{linkedin ? (
						<a href={linkedin} target="_blank" rel="noreferrer">
							linkedin
						</a>
					) : null}
				</div>
			</div>

			<div className="readme-aside">
				<figure className="readme-photo" data-parallax>
					<div className="readme-photo-frame">
						<img
							src={RESUME_DATA.photo}
							alt="Sehal smiling at his desk, surrounded by computer monitors"
							width="960"
							height="643"
						/>
					</div>
					<figcaption className="readme-mono">
						<span aria-hidden="true">↳</span> this is me.
					</figcaption>
				</figure>
				<div className="readme-now readme-mono">
					<p>right now:</p>
					<ul>
						<li>building at Planned</li>
						<li>working on DGymBook</li>
						<li>making small games</li>
					</ul>
				</div>
			</div>
		</section>
	);
}

function Work() {
	return (
		<section className="readme-section readme-wrap" id="work">
			<SectionHeading path="work.txt" title="Where I’ve worked" />
			<div className="readme-work-list">
				{WORK.map((item, index) => (
					<article
						className="readme-work-row"
						data-reveal
						style={revealDelay(index)}
						key={item.company}
					>
						<time className="readme-mono">{item.period}</time>
						<h3>
							{item.company}
							<span>{item.role}</span>
						</h3>
						<p>{item.description}</p>
					</article>
				))}
			</div>
			<p className="readme-older-work readme-mono">
				There&apos;s more in the <Link href="/resume">full resume →</Link>
			</p>
		</section>
	);
}

function Experiments() {
	return (
		<section className="readme-section readme-experiments" id="experiments">
			<div className="readme-wrap">
				<SectionHeading path="~/experiments" title="Things I made for fun" />
				<p className="readme-experiment-note" data-reveal>
					I use side projects to learn by making. Every one of these runs here
					in the browser—nothing is a static case study.
				</p>
				<div className="readme-lab-grid">
					{EXPERIMENTS.map((experiment, index) => (
						<Link
							className={`readme-lab-card is-${experiment.visual}`}
							data-reveal
							href={experiment.href}
							key={experiment.name}
							style={revealDelay(index)}
						>
							<div className="readme-lab-preview">
								<span className="readme-lab-index readme-mono">
									{String(index + 1).padStart(2, "0")}
								</span>
								<ExperimentVisual visual={experiment.visual} />
							</div>
							<div className="readme-lab-copy">
								<div>
									<span className="readme-mono">{experiment.category}</span>
									<h3>{experiment.name}</h3>
								</div>
								<p>{experiment.description}</p>
								<i aria-hidden="true">↗</i>
							</div>
						</Link>
					))}
				</div>
			</div>
		</section>
	);
}

function ExperimentVisual({
	visual,
}: {
	visual: ExperimentVisualName;
}) {
	if (visual === "racer") {
		return (
			<div className="readme-visual readme-visual-racer" aria-hidden="true">
				<div className="readme-racer-track">
					<i />
					<i />
				</div>
				<img src="/car/f1.png" alt="" width="500" height="500" />
				<div className="readme-racer-speed readme-mono">
					<strong>184</strong> km/h
				</div>
				<span className="readme-racer-lap readme-mono">P2 · LAP 2/3</span>
			</div>
		);
	}

	if (visual === "doom") {
		return (
			<div className="readme-visual readme-visual-doom" aria-hidden="true">
				<div className="readme-doom-corridor">
					<i className="readme-doom-wall-left" />
					<i className="readme-doom-wall-right" />
					<span className="readme-doom-crosshair" />
				</div>
				<div className="readme-doom-hud readme-mono">
					<strong>100%</strong>
					<span>ARMOR 50</span>
					<span>AMMO 24</span>
				</div>
			</div>
		);
	}

	if (visual === "adventure") {
		return (
			<div className="readme-visual readme-visual-adventure" aria-hidden="true">
				<div className="readme-adventure-sheet">
					<span className="readme-mono">THE WHISPERING WOODS</span>
					<strong>Hollowreach</strong>
					<p>A path forks beneath the black pines. Something watches.</p>
					<div><i>1</i> enter the cave</div>
					<div><i>2</i> follow the river</div>
				</div>
			</div>
		);
	}

	if (visual === "os") {
		return (
			<div className="readme-visual readme-visual-os" aria-hidden="true">
				<div className="readme-os-menu readme-mono">
					<span>◆ &nbsp; sehalOS</span>
					<span>10:24</span>
				</div>
				<div className="readme-os-window">
					<header><i /><i /><i /><span className="readme-mono">projects/</span></header>
					<div><b /><b /><b /><b /></div>
				</div>
				<div className="readme-os-dock"><i /><i /><i /><i /><i /></div>
			</div>
		);
	}

	if (visual === "editor") {
		return (
			<div className="readme-visual readme-visual-editor" aria-hidden="true">
				<div className="readme-editor-rail">
					<strong>DR</strong>
					<i />
					<i />
					<i />
				</div>
				<div className="readme-editor-paper">
					<div className="readme-editor-meta readme-mono">
						<span>FIELD NOTE / 06</span>
						<i />
					</div>
					<strong>Draft something worth keeping.</strong>
					<div className="readme-editor-lines">
						<span />
						<span />
						<span />
					</div>
					<div className="readme-editor-toolbar readme-mono">
						<b>B</b>
						<em>I</em>
						<span>H1</span>
						<i>+</i>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="readme-visual readme-visual-terminal readme-mono" aria-hidden="true">
			<div className="readme-terminal-bar"><i /><i /><i /><span>~/sehal</span></div>
			<div className="readme-terminal-lines">
				<p><b>›</b> whoami</p>
				<p>sehal sein — engineer / builder / occasional game maker</p>
				<p><b>›</b> ls experiments/</p>
				<p><span>racer</span>&nbsp; doom &nbsp;<span>hollowreach</span>&nbsp; sehalOS</p>
				<p><b>›</b> <i /></p>
			</div>
		</div>
	);
}

function Notes() {
	return (
		<section className="readme-section readme-wrap" id="notes">
			<SectionHeading path="notes/" title="A little more about me" />
			<div className="readme-notes-grid" data-reveal>
				<div>
					<h3 className="readme-mono">things I care about</h3>
					<ul>
						<li>software that is useful before it is impressive</li>
						<li>systems people can understand and change</li>
						<li>teams that can move quickly without burning out</li>
					</ul>
				</div>
				<div>
					<h3 className="readme-mono">usually on my desk</h3>
					<ul>
						<li>TypeScript, Go, React, and PostgreSQL</li>
						<li>a notebook full of boxes and arrows</li>
						<li>one side project that got out of hand</li>
					</ul>
				</div>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer className="readme-footer readme-wrap" data-reveal>
			<p>If something here made you curious, send me a note.</p>
			<a className="readme-email readme-mono" href={`mailto:${RESUME_DATA.email}`}>
				{RESUME_DATA.email}
			</a>
			<div className="readme-footer-line readme-mono">
				<span>last updated: 2026-08-23</span>
				<span>built in montreal</span>
			</div>
		</footer>
	);
}

function SectionHeading({ path, title }: { path: string; title: string }) {
	return (
		<header className="readme-section-head" data-reveal>
			<span className="readme-mono">{path}</span>
			<h2>{title}</h2>
		</header>
	);
}
