import Link from "@/src/components/AppLink";
import { RESUME_DATA } from "@/src/data/resume";
import { type CSSProperties, Fragment, useEffect, useRef } from "react";
import {
	APP_LINKS,
	FINN_LOG,
	type FinnKind,
	GYM_CHECKINS,
	GYM_STATS,
	GYM_WEEK,
	MARQUEE_WORDS,
	POSTER_COLORS,
	POSTER_TITLES,
	TOYS,
	type ToyArt,
} from "@/src/view/home/homeData";
import { startHomeMotion } from "@/src/view/home/homeMotion";
import "./home.css";

/** Deterministic scatter so server and client render the same stars. */
const scatter = (i: number, salt: number) => {
	const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
	return x - Math.floor(x);
};

export default function HomePage() {
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!rootRef.current) return;
		return startHomeMotion(rootRef.current);
	}, []);

	return (
		<div className="home" data-intro="playing" ref={rootRef}>
			<Intro />
			<div className="home-cursor" data-cursor-dot aria-hidden="true">
				<span />
			</div>
			<ChapterBadge />
			<Nav />
			<main>
				<Hero />
				<Marquee />
				<StrataScene />
				<FinnScene />
				<GymScene />
				<Drawer />
			</main>
			<Footer />
		</div>
	);
}

function Intro() {
	return (
		<div className="home-intro" data-intro-curtain aria-hidden="true">
			<div className="home-intro-copy">
				<div className="home-intro-count" data-intro-count>
					0
				</div>
				<div className="home-intro-line" data-intro-line>
					finding the coffee…
				</div>
			</div>
		</div>
	);
}

function ChapterBadge() {
	return (
		<div className="home-chapter" aria-hidden="true">
			<svg viewBox="0 0 34 34">
				<circle cx="17" cy="17" r="14" />
				<circle
					cx="17"
					cy="17"
					r="14"
					className="home-chapter-fill"
					transform="rotate(-90 17 17)"
					data-chapter-ring
				/>
			</svg>
			<div>
				<b data-chapter-no>CH. 01</b>
				<span data-chapter-name>hello</span>
			</div>
		</div>
	);
}

function Nav() {
	return (
		<nav className="home-nav" aria-label="Primary navigation">
			<a className="home-nav-logo" href="#top">
				sehal
			</a>
			<a href="#strata">strata</a>
			<a href="#finn">finn</a>
			<a href="#gym">dgymbook</a>
			<a href="#drawer">toys</a>
			<a href="#hi">say hi</a>
		</nav>
	);
}

const Squiggle = ({ color, d }: { color: string; d: string }) => (
	<svg viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
		<path d={d} stroke={color} />
	</svg>
);

function Hero() {
	return (
		<section className="home-hero" id="top">
			<div className="home-hero-copy">
				<span className="home-hey">hey there, I&apos;m</span>
				<h1 className="home-name" aria-label="Sehal">
					{"Sehal".split("").map((letter, index) => (
						<span aria-hidden="true" data-letter key={index}>
							{letter}
						</span>
					))}
				</h1>
				<p className="home-tagline">
					By day, I&apos;m a lead engineer at Planned. After hours, I make
					little apps for{" "}
					<b>
						movie nights
						<Squiggle color="#ff5b36" d="M4 10 Q 80 2 150 9 T 296 6" />
					</b>
					,{" "}
					<b>
						3am feeds
						<Squiggle color="#3b5bff" d="M4 8 Q 90 14 160 6 T 296 9" />
					</b>
					, and{" "}
					<b>
						leg day
						<Squiggle color="#6fb800" d="M4 9 Q 70 3 150 10 T 296 5" />
					</b>
					, plus a few toys just for fun.
				</p>
			</div>

			<div
				className="home-sticker home-polaroid"
				data-drag
				data-cursor="drag me"
				data-depth="1.2"
				data-speed="-.25"
				style={{ left: "6%", top: "18%", rotate: "-8deg" }}
			>
				<img src={RESUME_DATA.photo} alt="Sehal at his desk" width="960" height="643" />
				<p>this is me!</p>
			</div>
			<div
				className="home-sticker home-badge"
				data-drag
				data-cursor="drag me"
				data-depth="-1"
				data-speed=".2"
				style={{ right: "9%", top: "20%", rotate: "10deg" }}
			>
				MTL<small>MONTREAL, QC</small>
			</div>
			<div
				className="home-sticker"
				data-drag
				data-cursor="drag me"
				data-depth="1.6"
				data-speed="-.4"
				style={{ right: "6%", bottom: "8%" }}
			>
				<div className="home-star">
					shipping
					<br />
					since
					<br />
					2018
				</div>
			</div>
			<div
				className="home-sticker home-note"
				data-drag
				data-cursor="drag me"
				data-depth="-1.4"
				data-speed=".35"
				style={{ left: "4%", bottom: "10%", rotate: "4deg" }}
			>
				powered by coffee &amp; boxes-and-arrows
			</div>

			<div className="home-scroll-hint">scroll, the fun&apos;s down here ↓</div>
		</section>
	);
}

function Marquee() {
	return (
		<div className="home-marquee" aria-hidden="true">
			<div className="home-marquee-track" data-marquee>
				{Array.from({ length: 6 }, (_, index) =>
					MARQUEE_WORDS.map((word) => (
						<Fragment key={`${index}-${word}`}>
							<span>{word}</span>
							<i>✦</i>
						</Fragment>
					)),
				)}
			</div>
		</div>
	);
}

function PosterRow({ direction }: { direction: 1 | -1 }) {
	const offset = direction > 0 ? 0 : 1;
	return (
		<div
			className={`home-posters ${direction > 0 ? "is-top" : "is-bottom"}`}
			data-poster-row={direction}
			aria-hidden="true"
		>
			{Array.from({ length: 24 }, (_, index) => {
				const [from, to] = POSTER_COLORS[(index + offset * 3) % POSTER_COLORS.length];
				return (
					<div
						className="home-poster"
						key={index}
						style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
					>
						{POSTER_TITLES[(index + offset * 5) % POSTER_TITLES.length]}
					</div>
				);
			})}
		</div>
	);
}

/** Strata's layered play mark, redrawn from the app icon. */
function StrataMark() {
	return (
		<svg className="home-strata-mark" viewBox="-12 -12 484 524" aria-hidden="true">
			<defs>
				<linearGradient id="strata-0" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#fbdc9c" />
					<stop offset="1" stopColor="#f2b544" />
				</linearGradient>
				<linearGradient id="strata-1" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#f8b083" />
					<stop offset="1" stopColor="#e8743a" />
				</linearGradient>
				<linearGradient id="strata-2" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#e98a6b" />
					<stop offset="1" stopColor="#b8492b" />
				</linearGradient>
			</defs>
			<g strokeLinejoin="round" strokeWidth="16">
				<path d="M0 0 L252 137 L0 137 Z" fill="url(#strata-0)" stroke="url(#strata-0)" />
				<path d="M0 181 L333 181 L460 250 L333 319 L0 319 Z" fill="url(#strata-1)" stroke="url(#strata-1)" />
				<path d="M0 363 L252 363 L0 500 Z" fill="url(#strata-2)" stroke="url(#strata-2)" />
			</g>
		</svg>
	);
}

function StrataScene() {
	return (
		<section className="home-scene home-strata" id="strata" data-scene="strata">
			<div className="home-scene-pin">
				<div className="home-beam" data-beam />
				<PosterRow direction={1} />
				<PosterRow direction={-1} />
				<div className="home-scene-grid">
					<div className="home-scene-copy">
						<div className="home-eyebrow">app no. 1 — for the couch</div>
						<h2>
							<StrataMark />
							Strata
						</h2>
						<p className="home-lede">
							The movies and shows you already own, turned into your own
							streaming service. Posters, continue watching, the whole cozy
							thing.
						</p>
						<div className="home-pills">
							<span>iPhone</span>
							<span>iPad</span>
							<span>Mac</span>
							<span>Apple TV</span>
						</div>
						<a className="home-cta" href={APP_LINKS.strata} target="_blank" rel="noreferrer" data-cursor="▶ play">
							Meet Strata <span aria-hidden="true">↗</span>
						</a>
					</div>
					<div className="home-tv" data-tv aria-hidden="true">
						<div className="home-tv-screen">
							<span className="home-tv-kicker">Continue watching</span>
							<strong>The Long Quiet</strong>
							<span className="home-tv-meta">
								S2 · E4 &nbsp;·&nbsp; <span data-minutes-left>32</span> min left
							</span>
							<div className="home-tv-progress">
								<i data-tv-progress />
							</div>
							<div className="home-tv-row">
								{POSTER_COLORS.slice(0, 5).map(([from, to]) => (
									<b key={from} style={{ background: `linear-gradient(160deg, ${from}, ${to})` }} />
								))}
							</div>
						</div>
						<div className="home-tv-stand" />
					</div>
				</div>
			</div>
		</section>
	);
}

/** Finn's three overlapping circles. */
function FinnMark() {
	return (
		<svg className="home-finn-mark" viewBox="0 0 40 40" aria-hidden="true">
			<circle cx="14" cy="15" r="10" fill="#ec5f7e" opacity="0.9" />
			<circle cx="26" cy="15" r="10" fill="#5ec5d2" opacity="0.85" />
			<circle cx="20" cy="25" r="10" fill="#7a70e3" opacity="0.9" />
		</svg>
	);
}

/** Small white glyphs, the way Finn draws its category icons. */
function FinnGlyph({ kind }: { kind: FinnKind }) {
	switch (kind) {
		case "bottle":
			return (
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<rect x="9" y="2" width="6" height="4" rx="1.5" />
					<rect x="7" y="7" width="10" height="15" rx="3.5" />
				</svg>
			);
		case "diaper":
			return (
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M3 6h18v4c0 5-4 9-9 9s-9-4-9-9z" />
				</svg>
			);
		case "sleep":
			return (
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M15 3a9 9 0 1 0 6 13A7.5 7.5 0 0 1 15 3z" />
				</svg>
			);
		case "sun":
			return (
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="12" cy="12" r="5" />
					<g stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
						<path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
					</g>
				</svg>
			);
	}
}

function FinnScene() {
	return (
		<section className="home-scene home-finn" id="finn" data-scene="finn">
			<div className="home-scene-pin" data-sky>
				<div className="home-finn-grid" aria-hidden="true" />
				<div className="home-stars" data-stars aria-hidden="true">
					{Array.from({ length: 70 }, (_, index) => (
						<i
							key={index}
							style={{
								left: `${scatter(index, 1) * 100}%`,
								top: `${scatter(index, 2) * 70}%`,
								animationDelay: `${scatter(index, 3) * 2.4}s`,
								scale: `${0.5 + scatter(index, 4)}`,
							}}
						/>
					))}
				</div>
				<div className="home-sky-body is-moon" data-moon aria-hidden="true" />
				<div className="home-sky-body is-sun" data-sun aria-hidden="true" />
				<div className="home-clock" data-daylight aria-hidden="true">
					<span data-clock>3:00</span>
					<small data-clock-note>am. again.</small>
				</div>
				<div className="home-scene-grid" data-daylight>
					<div className="home-scene-copy">
						<div className="home-eyebrow">app no. 2 — for the nursery</div>
						<h2>
							<FinnMark />
							<span className="home-finn-word">Finn</span>
						</h2>
						<p className="home-lede">
							A baby tracker the whole family shares. Feeds, naps, and diapers
							land in one log, so whoever&apos;s on the 3am shift knows what
							happened at 1.
						</p>
						<div className="home-pills">
							<span>iPhone</span>
							<span>shared with family</span>
						</div>
						<a className="home-cta" href={APP_LINKS.finn} target="_blank" rel="noreferrer" data-cursor="peek">
							Meet Finn <span aria-hidden="true">↗</span>
						</a>
					</div>
					<div className="home-phone" data-phone aria-hidden="true">
						<div className="home-phone-island" />
						<header>
							<strong>Tonight</strong>
							<span>Olivia · 3 weeks</span>
						</header>
						<div className="home-log">
							{FINN_LOG.map((entry) => (
								<div className="home-log-entry" data-log-entry key={entry.time}>
									<i style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${entry.color} 70%, #fff), ${entry.color})` }}>
										<FinnGlyph kind={entry.kind} />
									</i>
									<span>
										{entry.label}
										{"who" in entry ? <span className="home-who">{entry.who}</span> : null}
									</span>
									<em>{entry.time}</em>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

/** The dumbbell from the DGymBook wordmark. */
function DumbbellMark() {
	return (
		<svg viewBox="0 0 32 20" aria-hidden="true">
			<rect x="1" y="5" width="5" height="10" rx="1.5" />
			<rect x="6" y="2" width="5" height="16" rx="1.5" />
			<rect x="11" y="8.5" width="10" height="3" />
			<rect x="21" y="2" width="5" height="16" rx="1.5" />
			<rect x="26" y="5" width="5" height="10" rx="1.5" />
		</svg>
	);
}

function GymScene() {
	return (
		<section className="home-scene home-gym" id="gym" data-scene="gym">
			<div className="home-scene-pin">
				<div className="home-gym-stripes" data-stripes aria-hidden="true" />
				<div className="home-gym-glow" data-gym-glow aria-hidden="true" />
				<div className="home-scene-grid">
					<div className="home-scene-copy">
						<div className="home-eyebrow">app no. 3 — for the gym</div>
						<h2>
							D<span className="home-gym-word">Gym</span>Book
						</h2>
						<p className="home-lede">
							The one I co-founded in 2022. Members book classes and check in,
							and gym owners run the whole place from one dashboard. It grew a
							lot bigger than we planned.
						</p>
						<div className="home-pills">
							<span>members</span>
							<span>gym owners</span>
							<span>web + mobile</span>
						</div>
						<a className="home-cta" href={APP_LINKS.dgymbook} target="_blank" rel="noreferrer" data-cursor="let's go">
							Meet DGymBook <span aria-hidden="true">↗</span>
						</a>
					</div>
					<div className="home-rig">
						<div className="home-float is-fees" data-float="1" aria-hidden="true">
							<span>Fees collected</span>
							<strong>₹2,40,000</strong>
							<small>↗ all on time this month</small>
						</div>
						<div className="home-float is-pr" data-float="-0.4" aria-hidden="true">
							<b>🏋️</b>
							<span>
								<strong>New PR</strong>
								<small>Deadlift · 140 kg</small>
							</span>
						</div>
						<div className="home-rig-card" data-rig-card>
							<header className="home-rig-head">
								<span className="home-rig-gym">
									<DumbbellMark />
									Fitness Center Central
									<small>⌄</small>
								</span>
								<span className="home-rig-live">live</span>
							</header>
							<div className="home-rig-hero">
								<div>
									<div className="home-rig-label">Active members</div>
									<div className="home-members" data-members>
										0
									</div>
									<div className="home-members-label">people training with it</div>
								</div>
								<span className="home-rig-trend" data-trend>
									↗ growing
								</span>
							</div>
							<div className="home-rig-stats">
								{GYM_STATS.map((stat) => (
									<div className={`home-rig-stat is-${stat.tone}`} key={stat.label}>
										<span>{stat.label}</span>
										<strong data-stat={stat.to}>0</strong>
									</div>
								))}
							</div>
							<div className="home-rig-chart">
								<div className="home-rig-chart-head">
									<span>Attendance</span>
									<span>this week</span>
								</div>
								<div className="home-rig-bars" aria-hidden="true">
									{GYM_WEEK.map((day, index) => (
										<div className="home-rig-bar" key={`${day.day}-${index}`}>
											<i data-bar={day.value} className={day.value === 1 ? "is-peak" : undefined} />
											<span>{day.day}</span>
										</div>
									))}
								</div>
							</div>
						</div>
						<div className="home-checkins" data-checkins aria-hidden="true">
							{GYM_CHECKINS.map((checkin) => (
								<div className={`home-checkin is-${checkin.tone}`} data-checkin key={checkin.title}>
									<b>{checkin.title.charAt(0)}</b>
									<span>
										<strong>{checkin.title}</strong>
										<small>{checkin.detail}</small>
									</span>
									<em>{checkin.meta}</em>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function ToyArtwork({ art }: { art: ToyArt }) {
	switch (art) {
		case "racer":
			return (
				<div className="home-toy-art" style={{ background: "#2b2d42" }}>
					<img src="/car/f1.png" alt="" width="500" height="500" draggable={false} />
				</div>
			);
		case "doom":
			return (
				<div className="home-toy-art is-doom">+</div>
			);
		case "adventure":
			return <div className="home-toy-art is-adventure">d20 → 17</div>;
		case "os":
			return (
				<div className="home-toy-art is-os">
					<div />
				</div>
			);
		case "editor":
			return <div className="home-toy-art is-editor">draft something…</div>;
		case "terminal":
			return (
				<div className="home-toy-art is-terminal">
					› whoami
					<br />
					sehal_
					<br />› ls toys/
				</div>
			);
	}
}

function Drawer() {
	return (
		<section className="home-drawer-section" id="drawer">
			<div className="home-drawer-head">
				<h2>
					the junk
					<br />
					drawer
				</h2>
				<p>not apps. just toys I build to learn stuff. throw them around ↓</p>
			</div>
			<div className="home-drawer" data-drawer>
				{TOYS.map((toy, index) => (
					<Link
						className="home-toy home-sticker"
						data-drag
						data-cursor="drag / click"
						href={toy.href}
						key={toy.name}
						style={
							{
								left: `${toy.x}%`,
								top: `${toy.y}%`,
								rotate: `${toy.tilt}deg`,
								transitionDelay: `${index * 0.08}s`,
							} as CSSProperties
						}
					>
						<ToyArtwork art={toy.art} />
						<h3>{toy.name}</h3>
						<p>{toy.note}</p>
					</Link>
				))}
			</div>
		</section>
	);
}


function Footer() {
	return (
		<footer className="home-footer" id="hi">
			<h2 aria-label="say hi">
				{"say hi!".split("").map((letter, index) =>
					letter === " " ? (
						" "
					) : (
						<span aria-hidden="true" key={index}>
							{letter}
						</span>
					),
				)}
			</h2>
			<button type="button" className="home-mail" data-mail data-cursor="copy">
				{RESUME_DATA.email}
			</button>
			<p className="home-resume">
				or read <Link href="/resume" data-cursor="open">the boring version →</Link>
			</p>
			<div className="home-footer-line home-mono">
				<span>made in montreal, with too many tabs open</span>
				<span>© {new Date().getFullYear()}</span>
			</div>
		</footer>
	);
}
