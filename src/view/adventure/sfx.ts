/* Hollowreach sound effects — synthesized, not sampled.
 *
 * Everything here is built from oscillators and filtered noise at runtime, so
 * there are no audio files to ship or license, and the whole layer costs a few
 * hundred bytes of code. Nothing to do with the ElevenLabs narration in
 * ./narrator.ts — these are the table sounds: dice, steel, coin, hurt. */

export const SFX_PREF_KEY = "hollowreach_sfx_v1";

/** Effects default ON — they're free, local, and the page is a game. */
export function loadSfxPref(): boolean {
	if (typeof localStorage === "undefined") return true;
	try {
		return localStorage.getItem(SFX_PREF_KEY) !== "off";
	} catch {
		return true;
	}
}

export function writeSfxPref(on: boolean): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(SFX_PREF_KEY, on ? "on" : "off");
	} catch {
		/* storage unavailable */
	}
}

type ToneOpts = {
	type?: OscillatorType;
	/** Seconds from now to start. */
	at?: number;
	dur?: number;
	gain?: number;
	/** Glide to this frequency across the note. */
	to?: number;
	/** Lowpass cutoff; omit for none. */
	lp?: number;
	/** Fade-in time; a hair of attack keeps clicks out of soft sounds. */
	attack?: number;
};

type NoiseOpts = {
	at?: number;
	dur?: number;
	gain?: number;
	type?: BiquadFilterType;
	freq?: number;
	/** Sweep the filter to this frequency — whooshes and clatter. */
	to?: number;
	q?: number;
};

export class Sfx {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private noise: AudioBuffer | null = null;

	/** Live preference; the page owns the toggle and writes this. */
	enabled = true;

	/** Resolves the context, creating and resuming it on demand. Returns null
	 * where Web Audio isn't available (SSR, ancient browsers) so every call
	 * site can simply no-op. */
	private ac(): AudioContext | null {
		if (!this.enabled || typeof window === "undefined") return null;
		if (!this.ctx) {
			const AC =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext?: typeof AudioContext })
					.webkitAudioContext;
			if (!AC) return null;
			this.ctx = new AC();
			this.master = this.ctx.createGain();
			// Deliberately quiet: this plays under narration, not over it.
			this.master.gain.value = 0.22;
			this.master.connect(this.ctx.destination);
		}
		// Autoplay policy parks the context until a gesture; every effect is
		// downstream of a click, so resuming here is always in time.
		if (this.ctx.state === "suspended") void this.ctx.resume();
		return this.ctx;
	}

	/** One second of white noise, reused as the source for every noisy sound. */
	private noiseBuffer(ctx: AudioContext): AudioBuffer {
		if (!this.noise) {
			const len = ctx.sampleRate;
			const buf = ctx.createBuffer(1, len, ctx.sampleRate);
			const data = buf.getChannelData(0);
			for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
			this.noise = buf;
		}
		return this.noise;
	}

	private tone(freq: number, o: ToneOpts = {}): void {
		const ctx = this.ac();
		if (!ctx || !this.master) return;
		const t = ctx.currentTime + (o.at ?? 0);
		const dur = o.dur ?? 0.2;
		const peak = o.gain ?? 0.3;
		const attack = o.attack ?? 0.005;

		const osc = ctx.createOscillator();
		osc.type = o.type ?? "triangle";
		osc.frequency.setValueAtTime(freq, t);
		if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + dur);

		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(peak, t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

		let node: AudioNode = osc;
		if (o.lp) {
			const f = ctx.createBiquadFilter();
			f.type = "lowpass";
			f.frequency.setValueAtTime(o.lp, t);
			osc.connect(f);
			node = f;
		}
		node.connect(g).connect(this.master);
		osc.start(t);
		osc.stop(t + dur + 0.02);
	}

	private burst(o: NoiseOpts = {}): void {
		const ctx = this.ac();
		if (!ctx || !this.master) return;
		const t = ctx.currentTime + (o.at ?? 0);
		const dur = o.dur ?? 0.08;
		const peak = o.gain ?? 0.25;

		const src = ctx.createBufferSource();
		src.buffer = this.noiseBuffer(ctx);
		// Start at a random offset so repeated taps never sound identical.
		const offset = Math.random() * 0.5;

		const f = ctx.createBiquadFilter();
		f.type = o.type ?? "bandpass";
		f.frequency.setValueAtTime(o.freq ?? 800, t);
		if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + dur);
		f.Q.value = o.q ?? 1;

		const g = ctx.createGain();
		g.gain.setValueAtTime(peak, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

		src.connect(f).connect(g).connect(this.master);
		src.start(t, offset, dur + 0.02);
		src.stop(t + dur + 0.02);
	}

	/* ----------------------------- the kit ----------------------------- */

	/** Submitting an action — a soft paper tick, easy to hear a hundred times. */
	click(): void {
		this.burst({ dur: 0.025, freq: 1600, q: 0.7, gain: 0.09 });
	}

	/** The d20 tumbling. Sized to the ~800ms roll animation in AdventurePage. */
	diceRoll(): void {
		// Irregular taps, losing energy as the die slows — even spacing reads
		// as a machine rather than something bouncing across a table.
		let t = 0;
		for (let i = 0; i < 9; i++) {
			const energy = 1 - i / 11;
			this.burst({
				at: t,
				dur: 0.03 + Math.random() * 0.02,
				freq: 380 + Math.random() * 520,
				q: 2.4,
				gain: 0.16 * energy,
			});
			t += 0.055 + Math.random() * 0.05;
		}
	}

	/** The die coming to rest — one firmer knock with a little body under it. */
	diceLand(): void {
		this.burst({ dur: 0.05, freq: 320, q: 1.8, gain: 0.28 });
		this.tone(150, { type: "sine", dur: 0.11, gain: 0.16, to: 90 });
	}

	/** Check passed: an open, rising fifth. */
	success(at = 0): void {
		this.tone(523.25, { at, dur: 0.16, gain: 0.2, attack: 0.012 });
		this.tone(783.99, { at: at + 0.085, dur: 0.24, gain: 0.18, attack: 0.012 });
	}

	/** Check failed: a sagging minor third, dulled by a lowpass. */
	failure(at = 0): void {
		this.tone(311.13, { at, dur: 0.18, gain: 0.18, type: "sawtooth", lp: 900 });
		this.tone(233.08, {
			at: at + 0.1,
			dur: 0.34,
			gain: 0.16,
			type: "sawtooth",
			lp: 700,
			to: 220,
		});
	}

	/** Natural 20 — a bright four-note climb with a ring on top. */
	crit(at = 0): void {
		[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
			this.tone(f, { at: at + i * 0.062, dur: 0.26, gain: 0.19, attack: 0.008 }),
		);
		this.tone(1567.98, { at: at + 0.26, dur: 0.5, gain: 0.08, type: "sine" });
	}

	/** Natural 1 — the floor drops out. */
	fumble(at = 0): void {
		this.tone(146.83, { at, dur: 0.5, gain: 0.22, type: "square", lp: 420, to: 73 });
		this.burst({ at, dur: 0.16, type: "lowpass", freq: 500, gain: 0.2 });
	}

	/** Taking damage — a dull impact with a body-blow thump beneath it. */
	hurt(at = 0): void {
		this.burst({ at, dur: 0.17, type: "lowpass", freq: 760, gain: 0.32 });
		this.tone(160, { at, dur: 0.24, gain: 0.3, type: "sine", to: 62 });
	}

	/** Recovering HP — a soft lift, nothing triumphant. */
	heal(at = 0): void {
		this.tone(440, { at, dur: 0.3, gain: 0.14, type: "sine", to: 660, attack: 0.05 });
		this.tone(659.25, {
			at: at + 0.13,
			dur: 0.34,
			gain: 0.11,
			type: "sine",
			attack: 0.05,
		});
	}

	/** A weapon cutting air — filtered noise sweeping down. */
	attack(at = 0): void {
		this.burst({ at, dur: 0.19, freq: 2600, to: 420, q: 0.9, gain: 0.2 });
	}

	/** A blow landing on the enemy — brighter and shorter than taking one. */
	enemyHit(at = 0): void {
		this.burst({ at, dur: 0.075, freq: 1100, q: 1.4, gain: 0.26 });
		this.tone(210, { at, dur: 0.13, gain: 0.2, type: "sine", to: 115 });
	}

	/** Something steps out of the dark. */
	enemyAppear(at = 0): void {
		this.tone(87.31, { at, dur: 0.85, gain: 0.24, type: "sawtooth", lp: 300, to: 116.54 });
		this.tone(130.81, { at: at + 0.12, dur: 0.7, gain: 0.12, type: "sawtooth", lp: 380 });
	}

	/** Picking something up — a small inharmonic ting, like coin on stone. */
	loot(at = 0): void {
		this.tone(1174.66, { at, dur: 0.42, gain: 0.13, type: "sine" });
		this.tone(1567.98, { at: at + 0.02, dur: 0.34, gain: 0.08, type: "sine" });
	}

	/** Losing an item — the same shape, inverted and duller. */
	lose(at = 0): void {
		this.tone(659.25, { at, dur: 0.22, gain: 0.11, type: "sine", to: 440, lp: 1400 });
	}

	/** Experience gained — a quick blip that won't wear out its welcome. */
	xp(at = 0): void {
		this.tone(880, { at, dur: 0.11, gain: 0.12, to: 1318.51 });
	}

	/** Levelling — a full ascending figure with a pad under it. */
	levelUp(at = 0): void {
		[392, 523.25, 659.25, 783.99].forEach((f, i) =>
			this.tone(f, { at: at + i * 0.075, dur: 0.34, gain: 0.18, attack: 0.01 }),
		);
		this.tone(196, { at, dur: 0.9, gain: 0.1, type: "sine", attack: 0.08 });
	}

	/** Death — a long collapse into the dark. */
	death(at = 0): void {
		this.tone(146.83, {
			at,
			dur: 1.7,
			gain: 0.26,
			type: "sawtooth",
			lp: 500,
			to: 55,
			attack: 0.04,
		});
		this.tone(110, { at: at + 0.2, dur: 1.4, gain: 0.14, type: "sine", to: 49 });
	}

	/** Victory — a plain major fanfare; the run has earned it. */
	victory(at = 0): void {
		[392, 523.25, 659.25].forEach((f) =>
			this.tone(f, { at, dur: 1.1, gain: 0.15, attack: 0.02 }),
		);
		this.tone(783.99, { at: at + 0.16, dur: 1.0, gain: 0.17, attack: 0.02 });
		this.tone(1046.5, { at: at + 0.34, dur: 0.9, gain: 0.13, attack: 0.02 });
	}

	/** Let the player hear what they just switched on. */
	preview(): void {
		this.diceLand();
		this.success(0.12);
	}

	/** Release the hardware when the page goes away. */
	dispose(): void {
		void this.ctx?.close();
		this.ctx = null;
		this.master = null;
		this.noise = null;
	}
}
