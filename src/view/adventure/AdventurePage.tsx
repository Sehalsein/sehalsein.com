"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	STAT_KEYS,
	STAT_ARRAY,
	CLASSES,
	CLASS_KEYS,
	BACKGROUNDS,
	mod,
	modStr,
	modColor,
	avatarUri,
	parseGM,
	loadSave,
	writeSave,
	newAdventureId,
	INK,
	BONE,
	RED,
	GOLD,
	PANEL,
	DIM,
	FAINT,
	PIRATA,
	SERIF,
	type StatKey,
	type Stats,
	type ClassKey,
	type Character,
	type Enemy,
	type LogEntry,
	type GMCheck,
	type GMResponse,
} from "./shared";

/* ------------------------------------------------------------------ *
 *  State
 * ------------------------------------------------------------------ */
type Phase = "create" | "play";
type Status = "playing" | "dead" | "victory";

type DiceOverlay = {
	skill: string;
	ability: string;
	dc: number;
	phase: "rolling" | "result";
	face: number;
	mod: number;
	roll?: number;
	total?: number;
	success?: boolean;
};

type GameState = {
	phase: Phase;
	offline: boolean;
	// creation
	cName: string;
	cClass: ClassKey | null;
	cBackground: string | null;
	assign: Stats;
	swapSel: StatKey | null;
	// run
	char: Character | null;
	hp: number;
	maxHp: number;
	inventory: string[];
	log: LogEntry[];
	history: string[];
	choices: string[];
	location: string;
	turn: number;
	enemy: Enemy | null;
	status: Status;
	busy: boolean;
	input: string;
	diceOverlay: DiceOverlay | null;
	notice: string | null;
	typing: boolean;
	typingIndex: number;
	typed: number;
	flash: "damage" | "heal" | null;
};

function defaultAssign(): Stats {
	const a = {} as Stats;
	STAT_KEYS.forEach((k, i) => {
		a[k] = STAT_ARRAY[i];
	});
	return a;
}

const INITIAL: GameState = {
	phase: "create",
	offline: false,
	cName: "",
	cClass: null,
	cBackground: null,
	assign: defaultAssign(),
	swapSel: null,
	char: null,
	hp: 0,
	maxHp: 0,
	inventory: [],
	log: [],
	history: [],
	choices: [],
	location: "",
	turn: 0,
	enemy: null,
	status: "playing",
	busy: false,
	input: "",
	diceOverlay: null,
	notice: null,
	typing: false,
	typingIndex: -1,
	typed: 0,
	flash: null,
};

type Patch = Partial<GameState> | ((prev: GameState) => Partial<GameState>);

/* Narrative-column low embers (left%, size, color, dur s, delay s). */
const PLAY_EMBERS: [string, number, string, number, number][] = [
	["14%", 3, RED, 16, 0],
	["32%", 2, GOLD, 21, 3],
	["50%", 3, "#b5482f", 18, 6],
	["68%", 2, GOLD, 23, 2],
	["84%", 3, RED, 19, 9],
];

/* ================================================================== */

export default function AdventurePage({ id }: { id: string }) {
	const router = useRouter();
	const [mounted, setMounted] = useState(false);
	const [state, setReactState] = useState<GameState>(INITIAL);
	const ref = useRef<GameState>(state);

	// Synchronous source-of-truth setter: keeps `ref` current so the async
	// game loop can read freshly-applied state without setState callbacks.
	const set = useCallback((patch: Patch) => {
		const prev = ref.current;
		const next = typeof patch === "function" ? patch(prev) : patch;
		ref.current = { ...prev, ...next };
		setReactState(ref.current);
	}, []);

	const typeIv = useRef(0);
	const diceIv = useRef(0);
	const noticeT = useRef(0);
	const flashT = useRef(0);
	const pendingCheck = useRef<GMCheck | null>(null);
	const offlineCount = useRef(0);
	const logEl = useRef<HTMLDivElement>(null);
	const inputEl = useRef<HTMLInputElement>(null);

	const goTitle = useCallback(() => router.push("/adventure"), [router]);
	const goNew = useCallback(
		() => router.push("/adventure/" + newAdventureId()),
		[router],
	);

	/* ---- lifecycle: load this adventure's save, autoscroll, persist ---- */
	useEffect(() => {
		const saved = loadSave(id);
		if (saved && saved.char) {
			set({
				phase: "play",
				char: saved.char,
				hp: saved.hp,
				maxHp: saved.maxHp,
				inventory: saved.inventory || [],
				log: saved.log || [],
				history: saved.history || [],
				choices: saved.choices || [],
				enemy: saved.enemy || null,
				location: saved.location || "",
				status: saved.status || "playing",
				turn: saved.turn || 0,
				busy: false,
				diceOverlay: null,
				input: "",
			});
		} else {
			set({ phase: "create" });
		}
		setMounted(true);
		return () => {
			clearInterval(typeIv.current);
			clearInterval(diceIv.current);
			clearTimeout(noticeT.current);
			clearTimeout(flashT.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	useEffect(() => {
		if (state.phase === "play" && logEl.current) {
			logEl.current.scrollTop = logEl.current.scrollHeight;
		}
	}, [state.phase, state.log, state.typed, state.busy, state.diceOverlay]);

	// Persist this run whenever a turn meaningfully advances.
	useEffect(() => {
		const s = ref.current;
		if (s.phase !== "play" || !s.char) return;
		writeSave(id, {
			char: s.char,
			hp: s.hp,
			maxHp: s.maxHp,
			inventory: s.inventory,
			log: s.log.slice(-40),
			history: s.history.slice(-24),
			choices: s.choices,
			enemy: s.enemy,
			location: s.location,
			status: s.status,
			turn: s.turn,
		});
	}, [
		id,
		state.phase,
		state.turn,
		state.status,
		state.hp,
		state.log.length,
		state.enemy,
		state.location,
	]);

	// Refocus the action field once a turn settles.
	useEffect(() => {
		if (
			state.phase === "play" &&
			!state.busy &&
			!state.diceOverlay &&
			!state.typing &&
			state.status === "playing"
		) {
			inputEl.current?.focus();
		}
	}, [state.phase, state.busy, state.diceOverlay, state.typing, state.status]);

	/* ----------------------------- creation ----------------------------- */
	function selectClass(k: ClassKey) {
		const a = {} as Stats;
		CLASSES[k].priority.forEach((st, i) => {
			a[st] = STAT_ARRAY[i];
		});
		set({ cClass: k, assign: a, swapSel: null });
	}
	function tapStat(k: StatKey) {
		const sel = ref.current.swapSel;
		if (!sel) set({ swapSel: k });
		else if (sel === k) set({ swapSel: null });
		else {
			const a = { ...ref.current.assign };
			const t = a[sel];
			a[sel] = a[k];
			a[k] = t;
			set({ assign: a, swapSel: null });
		}
	}
	function reroll() {
		const keys = [...STAT_KEYS];
		for (let i = keys.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[keys[i], keys[j]] = [keys[j], keys[i]];
		}
		const a = {} as Stats;
		keys.forEach((st, i) => {
			a[st] = STAT_ARRAY[i];
		});
		set({ assign: a, swapSel: null });
	}

	function beginGame() {
		const s = ref.current;
		if (!(s.cName.trim() && s.cClass && s.cBackground)) return;
		const stats = { ...s.assign };
		const cls = CLASSES[s.cClass];
		const maxHp = Math.max(1, cls.hpBase + mod(stats.CON));
		const char: Character = {
			name: s.cName.trim(),
			class: s.cClass,
			background: s.cBackground,
			level: 1,
			xp: 0,
			stats,
		};
		set({
			phase: "play",
			char,
			hp: maxHp,
			maxHp,
			inventory: cls.items.slice(),
			log: [],
			history: [],
			choices: [],
			enemy: null,
			location: "",
			status: "playing",
			turn: 0,
			busy: true,
			diceOverlay: null,
			input: "",
		});
		turn(
			`The player begins their adventure. Establish a vivid opening scene and an immediate hook that gives ${char.name} the ${char.class} (a ${char.background} by past life) a reason to act. Set the location.`,
		);
	}

	/* --------------------------- the GM loop --------------------------- */
	function buildPrompt(actionLine: string): string {
		const s = ref.current;
		const c = s.char!;
		const stats = STAT_KEYS.map(
			(k) => `${k} ${c.stats[k]}(${modStr(c.stats[k])})`,
		).join(", ");
		const inv = s.inventory.length ? s.inventory.join(", ") : "nothing";
		const enemy = s.enemy
			? `\nCurrently in combat with ${s.enemy.name} (${s.enemy.hp}/${s.enemy.maxHp} HP).`
			: "";
		const hist = s.history.slice(-12).join("\n");
		return [
			`CHARACTER: ${c.name}, level ${c.level} ${c.class}. Past life: ${c.background}. HP ${s.hp}/${s.maxHp}. Abilities: ${stats}. Inventory: ${inv}.${enemy}`,
			`RECENT EVENTS:\n${hist || "(the adventure is just beginning)"}`,
			actionLine,
			"Respond with ONLY the JSON object.",
		].join("\n\n");
	}

	async function complete(prompt: string): Promise<string> {
		try {
			const res = await fetch("/api/adventure", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt }),
			});
			if (res.ok) {
				const t = await res.text();
				if (t && t.trim()) return t;
			}
			if (!ref.current.offline) set({ offline: true });
		} catch {
			if (!ref.current.offline) set({ offline: true });
		}
		// Fallback so the tale never truly stalls.
		return offline(prompt);
	}

	// A tiny deterministic stand-in GM for when the model is unreachable.
	function offline(prompt: string): string {
		offlineCount.current += 1;
		const n = offlineCount.current;
		if (/\[CHECK RESULT\]/.test(prompt)) {
			const ok = /SUCCESS/.test(prompt);
			return JSON.stringify({
				narration: ok
					? "Your effort lands true. The moment turns in your favor and the way forward opens, though the dark still presses close."
					: "It goes wrong. Stone grinds, your breath catches — and the danger you courted is suddenly very near.",
				location: "The Hollow Barrow",
				choices: [
					"Press deeper into the dark",
					"Search your surroundings",
					"Ready a weapon and wait",
				],
				check: null,
				hpDelta: ok ? 0 : -2,
				addItems: [],
				removeItems: [],
				enemy: null,
				xpDelta: ok ? 15 : 0,
				status: "playing",
			});
		}
		const scenes = [
			"A low passage opens before you, ribs of old timber holding back the earth. Somewhere ahead, water drips in a slow, deliberate rhythm.",
			"The corridor widens into a chamber strung with grey webs. Bones lie in a corner, picked clean and arranged almost neatly.",
			"A door of black iron blocks the way, its surface worked with figures that seem to shift whenever you look away.",
			"Cold torch-smoke curls along the ceiling. You hear, faint and unmistakable, the scrape of something moving in the next room.",
		];
		const check = n % 3 === 0 ? { skill: "Perception", ability: "WIS", dc: 12 } : null;
		return JSON.stringify({
			narration: scenes[n % scenes.length],
			location: "The Hollow Barrow",
			choices: check
				? []
				: ["Move forward carefully", "Examine the room", "Call out into the dark"],
			check,
			hpDelta: 0,
			addItems: [],
			removeItems: [],
			enemy: null,
			xpDelta: 0,
			status: "playing",
		});
	}

	async function turn(actionLine: string) {
		set({ busy: true });
		const prompt = buildPrompt(actionLine);
		const raw = await complete(prompt);
		const o: GMResponse = parseGM(raw) || {
			narration: String(raw || "The path is silent."),
			choices: ["Continue"],
		};
		applyGM(o);
	}

	function submitAction(text: string) {
		const s = ref.current;
		if (s.busy || s.diceOverlay || s.status !== "playing") return;
		const t = (text || "").trim();
		if (!t) return;
		set((prev) => ({
			log: [...prev.log, { kind: "player", text: t }],
			history: [...prev.history, "You: " + t],
			choices: [],
			input: "",
		}));
		turn(`The player chooses to: ${t}`);
	}

	function applyGM(o: GMResponse) {
		const s = ref.current;
		if (!s.char) return;
		const log = s.log.slice();
		const hist = s.history.slice();
		let hp = s.hp,
			maxHp = s.maxHp,
			xp = s.char.xp,
			level = s.char.level;
		const inv = s.inventory.slice();
		let enemy = s.enemy;
		let location = s.location,
			status = s.status;
		let notice: string | null = null;
		let gmIdx = -1;
		let flash: "damage" | "heal" | null = null;

		if (o.narration) {
			gmIdx = log.length;
			log.push({ kind: "gm", text: String(o.narration) });
			hist.push("GM: " + o.narration);
		}
		if (o.location) location = String(o.location);
		if (typeof o.hpDelta === "number" && o.hpDelta !== 0) {
			hp = Math.max(0, Math.min(maxHp, hp + o.hpDelta));
			flash = o.hpDelta < 0 ? "damage" : "heal";
			log.push({
				kind: "system",
				text:
					o.hpDelta < 0
						? `You take ${-o.hpDelta} damage`
						: `You recover ${o.hpDelta} HP`,
			});
			hist.push(`HP now ${hp}/${maxHp}`);
		}
		(o.removeItems || []).forEach((it) => {
			const i = inv.findIndex(
				(x) => x.toLowerCase() === String(it).toLowerCase(),
			);
			if (i >= 0) {
				inv.splice(i, 1);
				log.push({ kind: "system", text: "Lost: " + it });
			}
		});
		(o.addItems || []).forEach((it) => {
			inv.push(String(it));
			log.push({ kind: "loot", text: "Obtained: " + it });
		});
		if ("enemy" in o) enemy = o.enemy || null;
		if (typeof o.xpDelta === "number" && o.xpDelta > 0) {
			xp += o.xpDelta;
			log.push({ kind: "system", text: "+" + o.xpDelta + " XP" });
		}
		let need = level * 120;
		while (xp >= need) {
			xp -= need;
			level++;
			maxHp += 5 + Math.max(0, mod(s.char.stats.CON));
			hp = maxHp;
			notice = `Level ${level} — you grow stronger`;
			need = level * 120;
		}
		if (o.status === "dead") status = "dead";
		else if (o.status === "victory") status = "victory";

		const hasCheck = !!o.check && status === "playing";
		const choices = (hasCheck ? [] : o.choices || [])
			.slice(0, 4)
			.map(String);
		const char: Character = { ...s.char, xp, level };
		const willType = gmIdx >= 0;
		pendingCheck.current = hasCheck ? o.check! : null;

		set({
			log,
			history: hist,
			hp,
			maxHp,
			inventory: inv,
			enemy,
			location,
			status,
			choices,
			char,
			busy: false,
			notice,
			flash,
			turn: s.turn + 1,
			typing: willType,
			typingIndex: gmIdx,
			typed: 0,
		});

		if (notice) {
			clearTimeout(noticeT.current);
			noticeT.current = window.setTimeout(() => set({ notice: null }), 3200);
		}
		if (flash) {
			clearTimeout(flashT.current);
			flashT.current = window.setTimeout(() => set({ flash: null }), 680);
		}
		if (willType) startTyping(gmIdx);
		else afterType();
	}

	/* ----------------------------- dice ----------------------------- */
	function rollCheck(check: GMCheck) {
		const ability = String(check.ability || "DEX").toUpperCase();
		const score = ref.current.char!.stats[ability as StatKey] || 10;
		const m = mod(score);
		const dc = Number(check.dc) || 12;
		const skill = String(check.skill || "Ability");
		set({ diceOverlay: { skill, ability, dc, phase: "rolling", face: 1, mod: m } });
		let t = 0;
		clearInterval(diceIv.current);
		diceIv.current = window.setInterval(() => {
			set((prev) =>
				prev.diceOverlay
					? {
							diceOverlay: {
								...prev.diceOverlay,
								face: 1 + Math.floor(Math.random() * 20),
							},
						}
					: {},
			);
			if (++t > 13) {
				clearInterval(diceIv.current);
				settle(skill, ability, m, dc);
			}
		}, 62);
	}

	function settle(skill: string, ability: string, m: number, dc: number) {
		const roll = 1 + Math.floor(Math.random() * 20);
		const total = roll + m;
		const success = total >= dc;
		const nat =
			roll === 20 ? " (natural 20!)" : roll === 1 ? " (natural 1!)" : "";
		set((prev) => ({
			diceOverlay: prev.diceOverlay
				? { ...prev.diceOverlay, phase: "result", face: roll, roll, total, success }
				: null,
			log: [
				...prev.log,
				{ kind: "dice", skill, ability, roll, mod: m, total, dc, success },
			],
			history: [
				...prev.history,
				`Roll ${skill}: ${roll}${m >= 0 ? "+" : ""}${m}=${total} vs DC ${dc} => ${success ? "SUCCESS" : "FAILURE"}${nat}`,
			],
		}));
		window.setTimeout(() => {
			set({ diceOverlay: null });
			turn(
				`[CHECK RESULT] ${skill} check: rolled ${roll}, modifier ${m >= 0 ? "+" : ""}${m}, total ${total} vs DC ${dc} => ${success ? "SUCCESS" : "FAILURE"}${nat}. Narrate the consequence and continue the scene. Set check to null.`,
			);
		}, 1450);
	}

	/* --------------------------- typewriter --------------------------- */
	function startTyping(idx: number) {
		clearInterval(typeIv.current);
		const e = ref.current.log[idx];
		const full = e && "text" in e ? e.text : "";
		if (!full) {
			set({ typing: false });
			afterType();
			return;
		}
		typeIv.current = window.setInterval(() => {
			const next = ref.current.typed + 3;
			if (next >= full.length) {
				clearInterval(typeIv.current);
				set({ typed: full.length, typing: false });
				afterType();
			} else {
				set({ typed: next });
			}
		}, 18);
	}
	function afterType() {
		const pc = pendingCheck.current;
		pendingCheck.current = null;
		if (pc) rollCheck(pc);
	}
	function skipTyping() {
		if (!ref.current.typing) return;
		clearInterval(typeIv.current);
		const e = ref.current.log[ref.current.typingIndex];
		set({ typed: e && "text" in e ? e.text.length : 0, typing: false });
		afterType();
	}

	/* ============================== RENDER ============================== */
	const s = state;
	const rootStyle: React.CSSProperties = {
		height: "100dvh",
		display: "flex",
		flexDirection: "column",
		fontFamily: SERIF,
		color: INK,
		background:
			"radial-gradient(circle at 18% 8%, rgba(0,0,0,.03), transparent 42%), radial-gradient(circle at 82% 92%, rgba(0,0,0,.045), transparent 46%), #ece5d6",
		overflow: "hidden",
	};

	// Hold a neutral splash until the client decides resume-vs-create (the
	// save lives in localStorage, so it isn't known during SSR).
	if (!mounted) {
		return (
			<main className="hr-root" style={rootStyle}>
				<div
					style={{
						flex: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: FAINT,
						fontFamily: PIRATA,
						fontSize: 30,
						letterSpacing: ".12em",
						animation: "hr-pulse 1.4s ease infinite",
					}}
				>
					Hollowreach…
				</div>
			</main>
		);
	}

	/* ---------------------------- CREATE ---------------------------- */
	if (s.phase === "create") {
		const canBegin = !!(s.cName.trim() && s.cClass && s.cBackground);
		return (
			<main className="hr-root" style={rootStyle}>
				<div style={{ flex: 1, overflow: "auto" }}>
					<div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 28px 80px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
							<div
								style={{
									fontSize: 12,
									letterSpacing: ".3em",
									textTransform: "uppercase",
									color: RED,
									fontWeight: 600,
								}}
							>
								Forge your hero
							</div>
							<div style={{ flex: 1, height: 2, background: INK, opacity: 0.25 }} />
						</div>
						<h2 style={{ fontFamily: PIRATA, fontSize: 46, margin: "0 0 28px", color: INK }}>
							Character Creation
						</h2>

						{/* name */}
						<div style={{ marginBottom: 30 }}>
							<Step n={1} label="Name" />
							<input
								value={s.cName}
								onChange={(e) => set({ cName: e.target.value })}
								placeholder="Who walks into the dark?"
								style={{
									width: "100%",
									fontFamily: SERIF,
									fontSize: 22,
									padding: "12px 14px",
									border: `2px solid ${INK}`,
									background: PANEL,
									color: INK,
									outline: "none",
								}}
							/>
						</div>

						{/* class */}
						<div style={{ marginBottom: 30 }}>
							<Step n={2} label="Calling" />
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 12,
								}}
							>
								{CLASS_KEYS.map((k) => {
									const cls = CLASSES[k];
									const sel = s.cClass === k;
									return (
										<button
											key={k}
											type="button"
											onClick={() => selectClass(k)}
											style={{
												textAlign: "left",
												padding: "14px 16px",
												border: `2px solid ${INK}`,
												background: sel ? INK : PANEL,
												color: sel ? BONE : INK,
												cursor: "pointer",
												display: "flex",
												flexDirection: "column",
												gap: 6,
											}}
										>
											<div style={{ display: "flex", alignItems: "center", gap: 11 }}>
												<div
													style={{
														width: 42,
														height: 42,
														flex: "none",
														background: `url('${avatarUri(k, sel ? { bg: PANEL, frame: RED } : {})}') center/contain no-repeat`,
														filter: "drop-shadow(0 2px 4px rgba(0,0,0,.2))",
													}}
												/>
												<span style={{ fontFamily: PIRATA, fontSize: 24, flex: 1 }}>
													{k}
												</span>
												<span
													style={{
														fontSize: 11,
														letterSpacing: ".1em",
														textTransform: "uppercase",
														opacity: 0.7,
													}}
												>
													{cls.tag}
												</span>
											</div>
											<span style={{ fontSize: 13.5, lineHeight: 1.4, opacity: 0.92 }}>
												{cls.blurb}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* stats */}
						<div style={{ marginBottom: 30 }}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: 10,
								}}
							>
								<div
									style={{
										fontSize: 12,
										letterSpacing: ".18em",
										textTransform: "uppercase",
										color: DIM,
										fontWeight: 600,
									}}
								>
									3 · Abilities{" "}
									<span
										style={{
											color: "#a89e86",
											textTransform: "none",
											letterSpacing: 0,
											fontWeight: 400,
											fontStyle: "italic",
										}}
									>
										— tap two to swap their scores
									</span>
								</div>
								<button
									type="button"
									className="hr-btn-outline"
									onClick={reroll}
									style={{
										fontFamily: SERIF,
										fontWeight: 600,
										fontSize: 12,
										letterSpacing: ".08em",
										textTransform: "uppercase",
										padding: "6px 12px",
										border: `2px solid ${INK}`,
										background: "transparent",
										cursor: "pointer",
										color: INK,
									}}
								>
									↻ Reroll
								</button>
							</div>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(6,1fr)",
									gap: 10,
								}}
							>
								{STAT_KEYS.map((k) => {
									const sel = s.swapSel === k;
									const isPrim = s.cClass && CLASSES[s.cClass].primary === k;
									return (
										<button
											key={k}
											type="button"
											onClick={() => tapStat(k)}
											style={{
												padding: "12px 6px",
												border: `2px solid ${sel ? RED : INK}`,
												background: sel ? RED : isPrim ? INK : PANEL,
												color: sel || isPrim ? "#fff" : INK,
												cursor: "pointer",
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
												gap: 2,
											}}
										>
											<span style={{ fontSize: 11, letterSpacing: ".1em", fontWeight: 600, opacity: 0.7 }}>
												{k}
											</span>
											<span style={{ fontFamily: PIRATA, fontSize: 30, lineHeight: 1 }}>
												{s.assign[k]}
											</span>
											<span
												style={{
													fontSize: 12,
													color: sel || isPrim ? "#fff" : modColor(s.assign[k]),
													fontWeight: 600,
												}}
											>
												{modStr(s.assign[k])}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* background */}
						<div style={{ marginBottom: 36 }}>
							<Step n={4} label="Past Life" />
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr 1fr",
									gap: 10,
								}}
							>
								{BACKGROUNDS.map((b) => {
									const sel = s.cBackground === b.key;
									return (
										<button
											key={b.key}
											type="button"
											onClick={() => set({ cBackground: b.key })}
											style={{
												textAlign: "left",
												padding: "11px 13px",
												border: `2px solid ${INK}`,
												background: sel ? INK : PANEL,
												color: sel ? BONE : INK,
												cursor: "pointer",
											}}
										>
											<div style={{ fontFamily: PIRATA, fontSize: 18 }}>{b.key}</div>
											<div
												style={{
													fontSize: 12.5,
													lineHeight: 1.35,
													opacity: 0.85,
													marginTop: 2,
												}}
											>
												{b.blurb}
											</div>
										</button>
									);
								})}
							</div>
						</div>

						<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
							<button
								type="button"
								onClick={beginGame}
								disabled={!canBegin}
								style={{
									flex: 1,
									fontFamily: PIRATA,
									fontSize: 26,
									letterSpacing: ".03em",
									padding: 16,
									background: canBegin ? RED : "#bdb39a",
									color: "#fff",
									border: `2px solid ${canBegin ? RED : "#bdb39a"}`,
									cursor: canBegin ? "pointer" : "not-allowed",
								}}
							>
								Step into the Dark ⚔
							</button>
							<button
								type="button"
								className="hr-btn-outline"
								onClick={goTitle}
								style={{
									fontFamily: SERIF,
									fontWeight: 600,
									fontSize: 14,
									padding: "16px 18px",
									background: "transparent",
									border: `2px solid ${INK}`,
									cursor: "pointer",
									color: INK,
								}}
							>
								Back
							</button>
						</div>
						<div
							style={{
								marginTop: 10,
								fontSize: 13,
								color: FAINT,
								fontStyle: "italic",
								height: 18,
							}}
						>
							{canBegin
								? "The dice are ready."
								: "Name your hero, choose a calling, and a past life to begin."}
						</div>
					</div>
				</div>
			</main>
		);
	}

	/* ----------------------------- PLAY ----------------------------- */
	const c = s.char;
	const need = c ? c.level * 120 : 120;
	const hpPct = s.maxHp ? Math.max(0, Math.round((s.hp / s.maxHp) * 100)) : 0;
	const xpPct = c ? Math.max(0, Math.min(100, Math.round((c.xp / need) * 100))) : 0;
	const lowHp = s.maxHp > 0 && s.hp / s.maxHp <= 0.3;
	const ended = s.status !== "playing";
	const hasChoices =
		s.choices.length > 0 && !s.busy && !s.diceOverlay && !s.typing && s.status === "playing";
	const inputDisabled = s.busy || !!s.diceOverlay || s.typing || s.status !== "playing";

	return (
		<main className="hr-root" style={rootStyle}>
			{/* header */}
			<div
				style={{
					flex: "none",
					height: 58,
					background: INK,
					color: BONE,
					display: "flex",
					alignItems: "center",
					padding: "0 18px",
					gap: 14,
				}}
			>
				<D20 size={30} fontSize={14} />
				<div style={{ fontFamily: PIRATA, fontSize: 21, letterSpacing: ".02em" }}>
					Hollowreach
				</div>
				<div style={{ width: 1, height: 24, background: "rgba(236,229,214,.25)" }} />
				<div
					style={{
						fontSize: 13,
						color: "#cdbf9f",
						flex: 1,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{s.location || "An untold place"}
				</div>
				{s.offline && (
					<div
						style={{
							fontSize: 10,
							letterSpacing: ".14em",
							textTransform: "uppercase",
							color: INK,
							background: GOLD,
							padding: "3px 7px",
						}}
					>
						Offline demo GM
					</div>
				)}
				<div
					style={{
						fontFamily: PIRATA,
						fontSize: 13,
						border: "1px solid rgba(236,229,214,.4)",
						padding: "3px 9px",
						color: "#cdbf9f",
					}}
				>
					TURN {s.turn}
				</div>
				<button
					type="button"
					className="hr-menu"
					onClick={goTitle}
					title="Back to your tales (this adventure is saved)"
					style={{
						fontFamily: SERIF,
						fontWeight: 600,
						fontSize: 12,
						letterSpacing: ".06em",
						textTransform: "uppercase",
						padding: "6px 11px",
						background: "transparent",
						border: "1px solid rgba(236,229,214,.4)",
						color: BONE,
						cursor: "pointer",
					}}
				>
					Menu
				</button>
			</div>

			<div style={{ flex: 1, display: "flex", minHeight: 0 }}>
				{/* narrative column */}
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						minWidth: 0,
						minHeight: 0,
						position: "relative",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							position: "absolute",
							inset: 0,
							zIndex: 0,
							pointerEvents: "none",
							overflow: "hidden",
						}}
					>
						{PLAY_EMBERS.map(([left, size, color, dur, delay], i) => (
							<span
								key={i}
								style={{
									position: "absolute",
									left,
									bottom: -6,
									width: size,
									height: size,
									borderRadius: "50%",
									background: color,
									animation: `hr-emberlow ${dur}s linear ${delay}s infinite`,
								}}
							/>
						))}
					</div>

					{/* combat banner */}
					{s.enemy && (
						<div
							style={{
								flex: "none",
								position: "relative",
								zIndex: 1,
								background: INK,
								color: BONE,
								padding: "10px 22px",
								display: "flex",
								alignItems: "center",
								gap: 14,
								borderBottom: `2px solid ${RED}`,
								animation: "hr-borderpulse 2.4s ease-in-out infinite",
							}}
						>
							<span style={{ fontFamily: PIRATA, fontSize: 13, color: RED, letterSpacing: ".1em" }}>
								IN COMBAT
							</span>
							<div
								style={{
									width: 40,
									height: 40,
									flex: "none",
									background: `url('${avatarUri("Monster", { bg: "#2a2018", frame: RED })}') center/contain no-repeat`,
									transformOrigin: "center",
									animation: "hr-snarl 2.6s ease-in-out infinite",
								}}
							/>
							<span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 15 }}>
								{s.enemy.name}
							</span>
							<div
								style={{
									flex: 1,
									height: 9,
									border: `1.5px solid ${BONE}`,
									background: "rgba(236,229,214,.12)",
									overflow: "hidden",
								}}
							>
								<div
									style={{
										width: `${Math.max(0, Math.round((s.enemy.hp / s.enemy.maxHp) * 100))}%`,
										height: "100%",
										background: RED,
									}}
								/>
							</div>
							<span style={{ fontFamily: PIRATA, fontSize: 13, whiteSpace: "nowrap" }}>
								{s.enemy.hp}/{s.enemy.maxHp}
							</span>
						</div>
					)}

					{/* log */}
					<div
						ref={logEl}
						onClick={skipTyping}
						style={{
							flex: 1,
							overflowY: "auto",
							padding: "30px 28px 18px",
							cursor: "default",
							position: "relative",
							zIndex: 1,
						}}
					>
						<div
							style={{
								maxWidth: 680,
								margin: "0 auto",
								display: "flex",
								flexDirection: "column",
								gap: 16,
							}}
						>
							{s.log.map((e, i) => (
								<LogRow
									key={i}
									entry={e}
									typing={e.kind === "gm" && i === s.typingIndex && s.typing}
									typed={s.typed}
								/>
							))}
							{s.busy && (
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										color: FAINT,
										fontStyle: "italic",
										fontSize: 15,
										animation: "hr-pulse 1.4s ease infinite",
									}}
								>
									<span style={{ width: 8, height: 8, background: RED, borderRadius: "50%" }} />
									The Game Master weaves the threads…
								</div>
							)}
						</div>
					</div>

					{/* controls */}
					<div
						style={{
							flex: "none",
							borderTop: `2px solid ${INK}`,
							background: "#e6dec9",
							padding: "14px 28px 16px",
							position: "relative",
							zIndex: 1,
						}}
					>
						<div style={{ maxWidth: 680, margin: "0 auto" }}>
							{hasChoices && (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 8,
										marginBottom: 12,
									}}
								>
									{s.choices.map((ch, i) => (
										<button
											key={i}
											type="button"
											className="hr-choice"
											onClick={() => submitAction(ch)}
											style={{
												textAlign: "left",
												padding: "11px 15px",
												border: `2px solid ${INK}`,
												background: PANEL,
												fontFamily: SERIF,
												fontSize: 15.5,
												fontWeight: 500,
												color: INK,
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												gap: 11,
												animation: `hr-rise .32s ease both`,
												animationDelay: `${i * 0.07}s`,
											}}
										>
											<span
												className="hr-choice-num"
												style={{ color: RED, fontFamily: PIRATA, fontSize: 16 }}
											>
												{i + 1}
											</span>
											{ch}
										</button>
									))}
								</div>
							)}
							<form
								style={{ display: "flex", gap: 10 }}
								autoComplete="off"
								onSubmit={(e) => {
									e.preventDefault();
									submitAction(ref.current.input);
								}}
							>
								<input
									ref={inputEl}
									value={s.input}
									onChange={(e) => set({ input: e.target.value })}
									placeholder="Describe your own action…"
									disabled={inputDisabled}
									autoComplete="off"
									autoCorrect="off"
									spellCheck={false}
									style={{
										flex: 1,
										fontFamily: SERIF,
										fontSize: 15.5,
										padding: "12px 14px",
										border: `2px solid ${INK}`,
										background: PANEL,
										color: INK,
										outline: "none",
									}}
								/>
								<button
									type="submit"
									className="hr-btn-red"
									disabled={inputDisabled}
									style={{
										fontFamily: PIRATA,
										fontSize: 18,
										padding: "0 22px",
										background: RED,
										color: "#fff",
										border: `2px solid ${RED}`,
										cursor: inputDisabled ? "not-allowed" : "pointer",
										opacity: inputDisabled ? 0.6 : 1,
									}}
								>
									Act
								</button>
							</form>
						</div>
					</div>
				</div>

				{/* sidebar */}
				<div
					className="hr-sidebar"
					style={{
						flex: "none",
						width: 316,
						borderLeft: `2px solid ${INK}`,
						background: "#e2dac6",
						overflowY: "auto",
						padding: "20px 18px 30px",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 14,
							paddingBottom: 16,
							borderBottom: `2px solid ${INK}`,
						}}
					>
						<div
							style={{
								position: "relative",
								width: 76,
								height: 76,
								flex: "none",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<div
								style={{
									position: "absolute",
									inset: -5,
									borderRadius: "50%",
									background:
										"repeating-conic-gradient(rgba(210,59,34,.55) 0deg 2deg, transparent 2deg 17deg)",
									WebkitMask:
										"radial-gradient(circle, transparent 55%, #000 58%, #000 73%, transparent 76%)",
									mask: "radial-gradient(circle, transparent 55%, #000 58%, #000 73%, transparent 76%)",
									animation: "hr-spin 70s linear infinite",
								}}
							/>
							<div
								style={{
									width: 70,
									height: 70,
									background: `url('${avatarUri(c?.class ?? "Fighter")}') center/cover no-repeat`,
									boxShadow: "0 4px 14px rgba(0,0,0,.28)",
									animation: "hr-breathe 4.5s ease-in-out infinite",
								}}
							/>
						</div>
						<div style={{ minWidth: 0 }}>
							<div
								style={{
									fontFamily: PIRATA,
									fontSize: 21,
									lineHeight: 1,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
							>
								{c?.name}
							</div>
							<div
								style={{
									fontSize: 11.5,
									letterSpacing: ".05em",
									textTransform: "uppercase",
									color: DIM,
									fontWeight: 600,
									marginTop: 3,
								}}
							>
								Level {c?.level} {c?.class} · {c?.background}
							</div>
						</div>
					</div>

					{/* HP */}
					<div style={{ marginTop: 16 }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "baseline",
								marginBottom: 5,
							}}
						>
							<Cap>Health</Cap>
							<span style={{ fontFamily: PIRATA, fontSize: 16, color: INK }}>
								{s.hp}/{s.maxHp}
							</span>
						</div>
						<div
							style={{
								height: 12,
								border: `2px solid ${INK}`,
								background: BONE,
								overflow: "hidden",
								position: "relative",
								animation: lowHp ? "hr-borderpulse 1.6s ease-in-out infinite" : undefined,
							}}
						>
							<div
								style={{
									width: `${hpPct}%`,
									height: "100%",
									background: RED,
									transition: "width .4s ease",
								}}
							/>
							<div
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "40%",
									height: "100%",
									background:
										"linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)",
									animation: "hr-shimmer 3.4s ease-in-out infinite",
								}}
							/>
						</div>
					</div>

					{/* XP */}
					<div style={{ marginTop: 12 }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "baseline",
								marginBottom: 5,
							}}
						>
							<Cap>Experience</Cap>
							<span style={{ fontSize: 12, color: DIM }}>
								{c?.xp} / {need}
							</span>
						</div>
						<div
							style={{
								height: 8,
								border: `1.5px solid ${INK}`,
								background: BONE,
								overflow: "hidden",
							}}
						>
							<div
								style={{
									width: `${xpPct}%`,
									height: "100%",
									background: INK,
									transition: "width .4s ease",
								}}
							/>
						</div>
					</div>

					{/* stats */}
					<div style={{ marginTop: 20 }}>
						<Cap mb>Abilities</Cap>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
							{c &&
								STAT_KEYS.map((k) => (
									<div
										key={k}
										style={{
											border: `2px solid ${INK}`,
											padding: "7px 4px",
											textAlign: "center",
											background: BONE,
										}}
									>
										<div style={{ fontSize: 10, letterSpacing: ".08em", fontWeight: 600, color: DIM }}>
											{k}
										</div>
										<div style={{ fontFamily: PIRATA, fontSize: 22, lineHeight: 1.1 }}>
											{c.stats[k]}
										</div>
										<div style={{ fontSize: 11, fontWeight: 600, color: modColor(c.stats[k]) }}>
											{modStr(c.stats[k])}
										</div>
									</div>
								))}
						</div>
					</div>

					{/* inventory */}
					<div style={{ marginTop: 20 }}>
						<Cap mb>Pack</Cap>
						<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
							{s.inventory.map((it, i) => (
								<div
									key={i}
									style={{
										fontSize: 14,
										padding: "7px 11px",
										border: `1.5px solid ${INK}`,
										background: BONE,
										display: "flex",
										alignItems: "center",
										gap: 9,
									}}
								>
									<span style={{ color: RED }}>◆</span>
									{it}
								</div>
							))}
							{s.inventory.length === 0 && (
								<div style={{ fontSize: 13, color: FAINT, fontStyle: "italic" }}>
									Your pack is empty.
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* dice overlay */}
			{s.diceOverlay && <DiceModal d={s.diceOverlay} />}

			{/* end overlay */}
			{ended && (
				<EndOverlay status={s.status} onNew={goNew} onTitle={goTitle} />
			)}

			{/* damage / heal flash */}
			{s.flash && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						pointerEvents: "none",
						zIndex: 46,
						background: `radial-gradient(circle at 50% 50%, transparent 45%, ${
							s.flash === "damage" ? "rgba(210,59,34,.5)" : "rgba(47,125,58,.42)"
						} 100%)`,
						animation: "hr-flash .68s ease both",
					}}
				/>
			)}

			{/* notice toast */}
			{s.notice && (
				<div
					style={{
						position: "fixed",
						top: 74,
						left: "50%",
						transform: "translateX(-50%)",
						background: INK,
						color: GOLD,
						border: `2px solid ${GOLD}`,
						padding: "10px 20px",
						fontFamily: PIRATA,
						fontSize: 18,
						zIndex: 55,
						animation: "hr-pop .35s ease both",
					}}
				>
					✦ {s.notice}
				</div>
			)}
		</main>
	);
}

/* ------------------------------------------------------------------ *
 *  Presentational pieces
 * ------------------------------------------------------------------ */

/** The Hollowreach d20 emblem — an ink hexagon with a blackletter "20". */
function D20({ size, fontSize }: { size: number; fontSize: number }) {
	return (
		<div
			style={{
				position: "relative",
				width: size,
				height: size,
				background: INK,
				color: RED,
				clipPath: "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: PIRATA,
				fontSize,
				flex: "none",
				boxShadow: size > 40 ? "0 8px 30px rgba(0,0,0,.25)" : undefined,
			}}
		>
			20
		</div>
	);
}

function Step({ n, label }: { n: number; label: string }) {
	return (
		<div
			style={{
				fontSize: 12,
				letterSpacing: ".18em",
				textTransform: "uppercase",
				color: DIM,
				fontWeight: 600,
				marginBottom: 8,
			}}
		>
			{n} · {label}
		</div>
	);
}

function Cap({ children, mb }: { children: React.ReactNode; mb?: boolean }) {
	return (
		<span
			style={{
				fontSize: 11,
				letterSpacing: ".16em",
				textTransform: "uppercase",
				color: DIM,
				fontWeight: 600,
				display: mb ? "block" : undefined,
				marginBottom: mb ? 8 : undefined,
			}}
		>
			{children}
		</span>
	);
}

function LogRow({
	entry,
	typing,
	typed,
}: {
	entry: LogEntry;
	typing: boolean;
	typed: number;
}) {
	return (
		<div style={{ animation: "hr-fadeUp .35s ease both" }}>
			{entry.kind === "gm" && (
				<div style={{ fontSize: 18.5, lineHeight: 1.66, color: "#2a2520" }}>
					{typing ? entry.text.slice(0, typed) : entry.text}
					{typing && (
						<span
							style={{
								display: "inline-block",
								width: 9,
								color: RED,
								animation: "hr-blink 1s step-end infinite",
							}}
						>
							▌
						</span>
					)}
				</div>
			)}
			{entry.kind === "player" && (
				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<div
						style={{
							maxWidth: "80%",
							background: INK,
							color: BONE,
							padding: "9px 15px",
							fontSize: 15,
							fontStyle: "italic",
						}}
					>
						<span
							style={{
								color: GOLD,
								fontStyle: "normal",
								fontFamily: PIRATA,
								fontSize: 13,
								marginRight: 6,
							}}
						>
							YOU
						</span>
						{entry.text}
					</div>
				</div>
			)}
			{entry.kind === "dice" && (
				<div
					style={{
						display: "flex",
						alignItems: "stretch",
						border: `2px solid ${INK}`,
						maxWidth: 380,
						margin: "2px auto",
					}}
				>
					<div
						style={{
							width: 50,
							flex: "none",
							background: entry.success ? "#2f7d3a" : RED,
							color: "#fff",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontFamily: PIRATA,
							fontSize: 24,
						}}
					>
						{entry.roll}
					</div>
					<div style={{ padding: "7px 14px", flex: 1 }}>
						<div
							style={{
								fontSize: 11,
								letterSpacing: ".14em",
								textTransform: "uppercase",
								color: DIM,
								fontWeight: 600,
							}}
						>
							{entry.skill} ·{" "}
							{`${entry.roll}${entry.mod >= 0 ? "+" : ""}${entry.mod}=${entry.total} vs DC ${entry.dc}`}
						</div>
						<div
							style={{
								fontSize: 16,
								fontWeight: 600,
								color: entry.success ? "#2f7d3a" : RED,
							}}
						>
							{entry.success ? "SUCCESS" : "FAILURE"}
						</div>
					</div>
				</div>
			)}
			{entry.kind === "loot" && (
				<div
					style={{
						textAlign: "center",
						fontSize: 13,
						letterSpacing: ".06em",
						color: "#a06a1e",
						fontWeight: 600,
					}}
				>
					✦ {entry.text}
				</div>
			)}
			{entry.kind === "system" && (
				<div
					style={{
						textAlign: "center",
						fontSize: 12,
						letterSpacing: ".14em",
						textTransform: "uppercase",
						color: FAINT,
						fontWeight: 600,
					}}
				>
					{entry.text}
				</div>
			)}
		</div>
	);
}

function DiceModal({ d }: { d: DiceOverlay }) {
	const isResult = d.phase === "result";
	const roll = d.roll ?? d.face;
	const verdict =
		roll === 20
			? "CRITICAL!"
			: roll === 1
				? "FUMBLE!"
				: d.success
					? "SUCCESS"
					: "FAILURE";
	const vColor = roll === 20 ? "#e9cd87" : d.success ? "#7ec07a" : RED;
	const dieAnim =
		d.phase === "rolling"
			? "hr-shake .35s linear infinite"
			: roll === 20
				? "hr-pop .3s ease both, hr-glow 1.1s ease infinite"
				: "hr-pop .3s ease both";
	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(20,18,15,.82)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 50,
				animation: "hr-veil .25s ease both",
			}}
		>
			<div
				style={{
					fontSize: 13,
					letterSpacing: ".28em",
					textTransform: "uppercase",
					color: GOLD,
					marginBottom: 18,
				}}
			>
				{d.skill} Check · DC {d.dc}
			</div>
			<div
				style={{
					width: 130,
					height: 130,
					background: "linear-gradient(150deg,#2a2218,#15110b)",
					border: `2px solid ${GOLD}`,
					color: "#e9cd87",
					clipPath: "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: PIRATA,
					fontSize: 62,
					textShadow: "0 0 22px rgba(212,168,75,.6)",
					animation: dieAnim,
				}}
			>
				{d.face}
			</div>
			{isResult && (
				<div style={{ marginTop: 22, textAlign: "center", animation: "hr-pop .3s ease both" }}>
					<div style={{ fontSize: 15, color: "#cdbf9f" }}>
						{d.face}{" "}
						<span style={{ opacity: 0.6 }}>
							{(d.mod >= 0 ? "+" : "") + d.mod}
						</span>{" "}
						= <span style={{ color: "#fff", fontWeight: 600 }}>{d.total}</span> vs DC{" "}
						{d.dc}
					</div>
					<div style={{ fontFamily: PIRATA, fontSize: 46, color: vColor, marginTop: 4 }}>
						{verdict}
					</div>
				</div>
			)}
		</div>
	);
}

function EndOverlay({
	status,
	onNew,
	onTitle,
}: {
	status: Status;
	onNew: () => void;
	onTitle: () => void;
}) {
	const dead = status === "dead";
	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(20,18,15,.92)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 60,
				textAlign: "center",
				padding: 40,
				animation: "hr-veil .4s ease both",
			}}
		>
			<div
				style={{
					fontSize: 13,
					letterSpacing: ".4em",
					textTransform: "uppercase",
					color: dead ? RED : GOLD,
				}}
			>
				{dead ? "Here ends the tale" : "The deed is done"}
			</div>
			<div
				style={{
					fontFamily: PIRATA,
					fontSize: 74,
					lineHeight: 1,
					color: BONE,
					margin: "12px 0 14px",
				}}
			>
				{dead ? "You Have Fallen" : "Victory"}
			</div>
			<div
				style={{
					maxWidth: 440,
					fontSize: 18,
					color: "#cdbf9f",
					lineHeight: 1.5,
					fontStyle: "italic",
				}}
			>
				{dead
					? "The dark keeps what it takes. But every hero leaves a story — and a new one waits to be rolled."
					: "You walk out of the dark with the tale intact. Few do. Rest, and let the next adventure find you."}
			</div>
			<div style={{ display: "flex", gap: 14, marginTop: 34 }}>
				<button
					type="button"
					className="hr-btn-red"
					onClick={onNew}
					style={{
						fontFamily: PIRATA,
						fontSize: 20,
						padding: "13px 26px",
						background: RED,
						color: "#fff",
						border: `2px solid ${RED}`,
						cursor: "pointer",
					}}
				>
					New Adventure
				</button>
				<button
					type="button"
					onClick={onTitle}
					style={{
						fontFamily: SERIF,
						fontWeight: 600,
						fontSize: 15,
						padding: "13px 22px",
						background: "transparent",
						color: BONE,
						border: `2px solid ${BONE}`,
						cursor: "pointer",
					}}
				>
					Your Tales
				</button>
			</div>
		</div>
	);
}
