import { CHAPTERS, GYM_PLATES, INTRO_LINES } from "@/src/view/home/homeData";

const INTRO_SEEN_KEY = "home-intro-seen";
const CONFETTI_COLORS = ["#ffc940", "#3b5bff", "#4fd1a5", "#ff8fb8", "#1b1530", "#fff6e9"];

type RGB = [number, number, number];
const NIGHT: RGB = [29, 37, 71];
const SUNRISE: RGB = [255, 150, 120];
const MORNING: RGB = [255, 228, 204];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const mixRgb = (from: RGB, to: RGB, t: number) =>
	`rgb(${from.map((channel, i) => Math.round(lerp(channel, to[i], t))).join(",")})`;

type ParallaxElement = HTMLElement & { scrollShift?: number };
type Plate = { el: HTMLElement; x: number; side: number; at: number };

/**
 * Wires every interaction on the homepage: the intro curtain, cursor, draggable
 * stickers, and the scroll-driven scenes. Everything is plain DOM work so scroll
 * and pointer updates never trigger React renders. Returns a cleanup function.
 */
export function startHomeMotion(root: HTMLElement) {
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
		root.querySelector<T>(selector) as T;
	const $$ = <T extends Element = HTMLElement>(selector: string) =>
		Array.from(root.querySelectorAll<T>(selector));
	const cleanups: (() => void)[] = [];
	const listen = <K extends keyof WindowEventMap>(
		target: Window | HTMLElement,
		type: K,
		handler: (event: WindowEventMap[K]) => void,
		options?: AddEventListenerOptions,
	) => {
		target.addEventListener(type, handler as EventListener, options);
		cleanups.push(() => target.removeEventListener(type, handler as EventListener));
	};
	const timeouts = new Set<number>();
	const later = (fn: () => void, ms: number) => {
		const id = window.setTimeout(() => {
			timeouts.delete(id);
			fn();
		}, ms);
		timeouts.add(id);
	};

	/* ── intro ─────────────────────────────────────────────── */
	const letters = $$("[data-letter]");
	const heroStickers = $$(".home-hero .home-sticker");
	const finishIntro = () => {
		root.dataset.intro = "done";
		// Only remembered for the next load; the root layout turns it into data-intro-seen.
		try {
			sessionStorage.setItem(INTRO_SEEN_KEY, "1");
		} catch {
			// Private modes can block storage; the intro just replays next time.
		}
	};
	const introSeen = document.documentElement.dataset.introSeen !== undefined;
	if (introSeen || reducedMotion) {
		finishIntro();
	} else {
		const count = $("[data-intro-count]");
		const line = $("[data-intro-line]");
		letters.forEach((letter, i) => (letter.style.transitionDelay = `${0.15 + i * 0.07}s`));
		heroStickers.forEach((sticker, i) => (sticker.style.transitionDelay = `${0.6 + i * 0.12}s`));
		let progress = 0;
		const tick = window.setInterval(() => {
			progress = Math.min(100, progress + Math.ceil(Math.random() * 9));
			count.textContent = String(progress);
			line.textContent = INTRO_LINES[Math.min(INTRO_LINES.length - 1, Math.floor(progress / 21))];
			if (progress < 100) return;
			window.clearInterval(tick);
			later(() => {
				finishIntro();
				later(() => {
					for (const el of [...letters, ...heroStickers]) el.style.transitionDelay = "";
				}, 1600);
			}, 350);
		}, 70);
		cleanups.push(() => window.clearInterval(tick));
	}

	/* ── pointer: letters, depth parallax, cursor ─────────── */
	const depthEls = $$<ParallaxElement>("[data-depth]");
	let mouseX = window.innerWidth / 2;
	let mouseY = window.innerHeight / 2;
	const placeDepth = (el: ParallaxElement) => {
		const k = Number(el.dataset.depth ?? 0) * 18;
		const x = (mouseX / window.innerWidth - 0.5) * k;
		const y = (mouseY / window.innerHeight - 0.5) * k + (el.scrollShift ?? 0);
		el.style.translate = `${x}px ${y}px`;
	};

	listen(window, "pointermove", (event) => {
		mouseX = event.clientX;
		mouseY = event.clientY;
		if (reducedMotion) return;
		for (const letter of letters) {
			const rect = letter.getBoundingClientRect();
			const dx = rect.left + rect.width / 2 - mouseX;
			const dy = rect.top + rect.height / 2 - mouseY;
			const distance = Math.hypot(dx, dy) || 1;
			const force = clamp(1 - distance / 260);
			letter.style.transform = `translate(${(dx / distance) * force * 40}px, ${(dy / distance) * force * 40}px) rotate(${(dx / distance) * force * -14}deg) scale(${1 + force * 0.08})`;
		}
		for (const el of depthEls) placeDepth(el);
	});

	const cursor = $("[data-cursor-dot]");
	const cursorLabel = cursor.querySelector("span") as HTMLSpanElement;
	let cursorX = mouseX;
	let cursorY = mouseY;
	listen(window, "pointerover", (event) => {
		const target = (event.target as Element).closest<HTMLElement>("[data-cursor]");
		cursor.classList.toggle("is-big", Boolean(target));
		cursorLabel.textContent = target?.dataset.cursor ?? "";
	});

	/* ── draggable stickers ───────────────────────────────── */
	for (const el of $$("[data-drag]")) {
		let startX = 0;
		let startY = 0;
		let offsetX = 0;
		let offsetY = 0;
		let moved = false;
		let dragging = false;
		let baseTilt = Number.parseFloat(el.style.rotate) || 0;

		listen(el, "pointerdown", (event) => {
			event.preventDefault();
			el.setPointerCapture(event.pointerId);
			startX = event.clientX - offsetX;
			startY = event.clientY - offsetY;
			moved = false;
			dragging = true;
			el.classList.add("is-dragging");
		});
		listen(el, "pointermove", (event) => {
			if (!dragging) return;
			const nextX = event.clientX - startX;
			const nextY = event.clientY - startY;
			if (Math.hypot(nextX - offsetX, nextY - offsetY) > 3) moved = true;
			el.style.rotate = `${baseTilt + clamp((nextX - offsetX) * 0.6, -12, 12)}deg`;
			offsetX = nextX;
			offsetY = nextY;
			el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
		});
		listen(el, "pointerup", () => {
			dragging = false;
			el.classList.remove("is-dragging");
			baseTilt += (Math.random() - 0.5) * 6;
			el.style.rotate = `${baseTilt}deg`;
		});
		// A drag shouldn't count as a click on the toys that link somewhere.
		listen(el, "click", (event) => {
			if (moved) event.preventDefault();
		});
		listen(el, "dragstart", (event) => event.preventDefault());
	}

	/* ── scroll-driven scenes ─────────────────────────────── */
	const speedEls = $$<ParallaxElement>("[data-speed]");
	const sceneProgress = (scene: HTMLElement) => {
		const rect = scene.getBoundingClientRect();
		return clamp(-rect.top / (rect.height - window.innerHeight));
	};

	const strata = $('[data-scene="strata"]');
	const posterRows = $$("[data-poster-row]");
	const tv = $("[data-tv]");
	const beam = $("[data-beam]");
	const tvProgress = $("[data-tv-progress]");
	const minutesLeft = $("[data-minutes-left]");

	const finn = $('[data-scene="finn"]');
	const sky = $("[data-sky]");
	const moon = $("[data-moon]");
	const sun = $("[data-sun]");
	const stars = $("[data-stars]");
	const clock = $("[data-clock]");
	const clockNote = $("[data-clock-note]");
	const daylightEls = $$("[data-daylight]");
	const phone = $("[data-phone]");
	const logEntries = $$("[data-log-entry]");

	const gym = $('[data-scene="gym"]');
	const members = $("[data-members]");
	const barbell = $("[data-barbell]");
	const pr = $("[data-pr]");
	const stripes = $("[data-stripes]");
	const checkins = $$("[data-checkin]");
	const plates: Plate[] = [];
	const plateReach = Math.min(170, barbell.offsetWidth * 0.3);
	GYM_PLATES.forEach(({ height, color }, i) => {
		for (const side of [-1, 1]) {
			const el = document.createElement("div");
			el.className = "home-plate";
			el.style.height = `${height}px`;
			el.style.background = color;
			barbell.appendChild(el);
			plates.push({ el, side, x: side * (plateReach + i * 30), at: 0.1 + i * 0.17 });
		}
	});
	cleanups.push(() => plates.forEach(({ el }) => el.remove()));

	const chapterRing = $$<SVGCircleElement>("[data-chapter-ring]")[0];
	const chapterNo = $("[data-chapter-no]");
	const chapterName = $("[data-chapter-name]");
	const chapterTargets = CHAPTERS.map(({ target }) => document.getElementById(target));
	let chapterIndex = 0;

	let lastScrollY = window.scrollY;
	let velocity = 0;

	const onScroll = () => {
		const scrollY = window.scrollY;
		velocity = scrollY - lastScrollY;
		lastScrollY = scrollY;

		for (const el of speedEls) {
			el.scrollShift = scrollY * Number(el.dataset.speed);
			placeDepth(el);
		}

		// Strata: posters drift past, the TV turns to face you, the episode plays out.
		const s = sceneProgress(strata);
		for (const row of posterRows) {
			const shift = Number(row.dataset.posterRow) > 0 ? -s : s - 1;
			row.style.transform = `translateX(${shift * 1400}px)`;
		}
		const settle = clamp(s * 1.6);
		tv.style.transform = `perspective(1200px) rotateY(${lerp(-22, 0, settle)}deg) scale(${lerp(0.78, 1, settle)})`;
		beam.style.opacity = String(clamp(s * 2));
		tvProgress.style.width = `${lerp(20, 96, s)}%`;
		minutesLeft.textContent = String(Math.round(lerp(32, 1, s)));

		// Finn: a 3am feed turns into morning.
		const f = sceneProgress(finn);
		sky.style.background =
			f < 0.6
				? mixRgb(NIGHT, SUNRISE, clamp((f - 0.15) / 0.45))
				: mixRgb(SUNRISE, MORNING, (f - 0.6) / 0.4);
		for (const el of daylightEls) el.classList.toggle("is-day", f > 0.5);
		moon.style.transform = `translateY(${f * 120}vh)`;
		sun.style.transform = `translateY(${lerp(110, 0, clamp((f - 0.35) * 1.8))}vh)`;
		stars.style.opacity = String(1 - clamp(f * 1.8));
		const minutes = Math.round(lerp(180, 420, f) / 5) * 5;
		clock.textContent = `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
		clockNote.textContent = f < 0.3 ? "am. again." : f < 0.7 ? "am. still up." : "am. coffee time.";
		logEntries.forEach((entry, i) => entry.classList.toggle("is-on", f > i / (logEntries.length + 1)));
		phone.style.transform = `rotate(${lerp(6, -2, f)}deg) translateY(${lerp(40, -10, f)}px)`;

		// DGymBook: load the bar, count the members, lift.
		const g = sceneProgress(gym);
		for (const plate of plates) {
			const on = g > plate.at;
			plate.el.classList.toggle("is-on", on);
			plate.el.style.transform = `translate(${on ? plate.x : plate.x + plate.side * 400}px, -50%)`;
		}
		const count = Math.round(lerp(0, 50000, clamp(g / 0.8)) / 50) * 50;
		members.textContent = count >= 50000 ? "50,000+" : count.toLocaleString("en-US");
		barbell.classList.toggle("is-lifted", g > 0.82);
		pr.classList.toggle("is-on", g > 0.86);
		checkins.forEach((checkin, i) => checkin.classList.toggle("is-on", g > 0.15 + i * 0.17));
		// One stripe period measured horizontally is 120·√2; shifting within it keeps the pattern seamless.
		stripes.style.transform = `translateX(${(g * 600) % (120 * Math.SQRT2)}px)`;

		// Chapter badge.
		const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
		chapterRing.style.strokeDashoffset = String(88 * (1 - scrollY / scrollable));
		let next = 0;
		chapterTargets.forEach((target, i) => {
			if (target && target.getBoundingClientRect().top < window.innerHeight * 0.5) next = i;
		});
		if (next !== chapterIndex) {
			chapterIndex = next;
			chapterName.classList.add("is-flipping");
			later(() => {
				chapterNo.textContent = `CH. ${String(chapterIndex + 1).padStart(2, "0")}`;
				chapterName.textContent = CHAPTERS[chapterIndex].name;
				chapterName.classList.remove("is-flipping");
			}, 200);
		}
	};
	listen(window, "scroll", onScroll, { passive: true });
	listen(window, "resize", onScroll);
	onScroll();

	/* ── per-frame: cursor easing, marquee speeding up with scroll ── */
	const marquee = $("[data-marquee]");
	let marqueeX = 0;
	let frame = 0;
	const loop = () => {
		cursorX = lerp(cursorX, mouseX, 0.2);
		cursorY = lerp(cursorY, mouseY, 0.2);
		cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
		if (!reducedMotion) {
			marqueeX -= 1.2 + Math.abs(velocity) * 0.25;
			velocity *= 0.9;
			const half = marquee.scrollWidth / 2;
			if (-marqueeX > half) marqueeX += half;
			marquee.style.transform = `translateX(${marqueeX}px)`;
		}
		frame = window.requestAnimationFrame(loop);
	};
	frame = window.requestAnimationFrame(loop);
	cleanups.push(() => window.cancelAnimationFrame(frame));

	/* ── drawer opens when it scrolls into view ───────────── */
	const drawer = $("[data-drawer]");
	const drawerObserver = new IntersectionObserver(
		([entry]) => {
			if (!entry.isIntersecting) return;
			drawer.classList.add("is-open");
			drawerObserver.disconnect();
		},
		{ threshold: 0.25 },
	);
	drawerObserver.observe(drawer);
	cleanups.push(() => drawerObserver.disconnect());

	/* ── copy email, throw confetti ───────────────────────── */
	const mail = $<HTMLButtonElement>("[data-mail]");
	const address = mail.textContent ?? "";
	listen(mail, "click", (event) => {
		void navigator.clipboard?.writeText(address);
		mail.textContent = "copied! talk soon ✌";
		later(() => (mail.textContent = address), 1800);
		if (reducedMotion) return;
		for (let i = 0; i < 60; i++) {
			const piece = document.createElement("i");
			const angle = Math.random() * Math.PI * 2;
			const distance = 120 + Math.random() * 260;
			piece.className = "home-confetti";
			piece.style.left = `${event.clientX}px`;
			piece.style.top = `${event.clientY}px`;
			piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
			piece.style.borderRadius = i % 3 ? "2px" : "50%";
			piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
			piece.style.setProperty("--dy", `${Math.sin(angle) * distance - 120 + Math.random() * 300}px`);
			piece.style.setProperty("--r", `${Math.random() * 720}deg`);
			root.appendChild(piece);
			later(() => piece.remove(), 1500);
		}
	});

	return () => {
		for (const cleanup of cleanups) cleanup();
		for (const id of timeouts) window.clearTimeout(id);
	};
}
