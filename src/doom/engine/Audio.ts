/**
 * Every sound in the game is synthesized in the browser at play time — noise
 * bursts through swept filters for guns and explosions, detuned oscillators for
 * monsters and doors. Nothing is sampled, so the whole soundscape costs zero
 * bytes of download.
 */

export type SoundName =
	| "pistol"
	| "shotgun"
	| "chaingun"
	| "punch"
	| "hitwall"
	| "pickup"
	| "pickupWeapon"
	| "pickupHealth"
	| "pickupKey"
	| "doorOpen"
	| "doorClose"
	| "doorLocked"
	| "switch"
	| "playerPain"
	| "playerDeath"
	| "gruntAlert"
	| "houndAlert"
	| "impAlert"
	| "enemyPain"
	| "enemyDeath"
	| "gruntShoot"
	| "fireball"
	| "explode"
	| "secret"
	| "exit"
	| "menuMove"
	| "menuSelect";

interface ToneSpec {
	type?: OscillatorType;
	from: number;
	to?: number;
	dur: number;
	gain?: number;
	delay?: number;
	/** Sine wobble depth in Hz, for monster voices. */
	vibrato?: number;
}

interface NoiseSpec {
	dur: number;
	gain?: number;
	filter?: BiquadFilterType;
	from?: number;
	to?: number;
	q?: number;
	delay?: number;
}

export class Audio {
	muted = false;

	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private noise: AudioBuffer | null = null;
	private lastPlayed = new Map<SoundName, number>();

	/** Created lazily: browsers refuse an AudioContext before a user gesture. */
	private ensure(): AudioContext | null {
		if (typeof window === "undefined") return null;
		if (!this.ctx) {
			const Ctor =
				window.AudioContext ??
				(window as unknown as { webkitAudioContext?: typeof AudioContext })
					.webkitAudioContext;
			if (!Ctor) return null;
			this.ctx = new Ctor();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.5;
			this.master.connect(this.ctx.destination);

			// Two seconds of white noise, reused by every percussive sound.
			const frames = Math.floor(this.ctx.sampleRate * 2);
			this.noise = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
			const data = this.noise.getChannelData(0);
			for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
		}
		if (this.ctx.state === "suspended") void this.ctx.resume();
		return this.ctx;
	}

	/** Call from a click/keypress so the context is allowed to start. */
	resume(): void {
		this.ensure();
	}

	setMuted(muted: boolean): void {
		this.muted = muted;
		if (this.master) this.master.gain.value = muted ? 0 : 0.5;
	}

	play(name: SoundName, volume = 1): void {
		const ctx = this.ensure();
		if (!ctx || this.muted || volume <= 0.01) return;

		// Cheap voice limiter: a room full of monsters would otherwise stack
		// dozens of identical growls into clipping mush.
		const now = ctx.currentTime;
		const last = this.lastPlayed.get(name) ?? -1;
		if (now - last < 0.03) return;
		this.lastPlayed.set(name, now);

		const v = Math.min(1, volume);
		switch (name) {
			case "pistol":
				this.noiseBurst({ dur: 0.09, gain: 0.5 * v, filter: "bandpass", from: 2200, to: 700, q: 1.2 });
				this.tone({ type: "square", from: 320, to: 120, dur: 0.05, gain: 0.14 * v });
				break;
			case "chaingun":
				this.noiseBurst({ dur: 0.07, gain: 0.42 * v, filter: "bandpass", from: 2600, to: 900, q: 1.6 });
				this.tone({ type: "square", from: 420, to: 160, dur: 0.04, gain: 0.1 * v });
				break;
			case "shotgun":
				this.noiseBurst({ dur: 0.32, gain: 0.7 * v, filter: "lowpass", from: 4200, to: 260, q: 0.9 });
				this.tone({ type: "sine", from: 110, to: 42, dur: 0.28, gain: 0.35 * v });
				// The pump, a beat later.
				this.noiseBurst({ dur: 0.05, gain: 0.22 * v, filter: "highpass", from: 1800, to: 2600, delay: 0.42 });
				break;
			case "punch":
				this.noiseBurst({ dur: 0.08, gain: 0.35 * v, filter: "lowpass", from: 900, to: 200 });
				break;
			case "hitwall":
				this.noiseBurst({ dur: 0.05, gain: 0.2 * v, filter: "highpass", from: 2600, to: 4200 });
				break;
			case "gruntShoot":
				this.noiseBurst({ dur: 0.11, gain: 0.4 * v, filter: "bandpass", from: 1700, to: 600, q: 1.1 });
				break;
			case "pickup":
				this.tone({ type: "square", from: 720, to: 1180, dur: 0.09, gain: 0.16 * v });
				break;
			case "pickupHealth":
				this.tone({ type: "sine", from: 520, to: 780, dur: 0.14, gain: 0.2 * v });
				this.tone({ type: "sine", from: 780, to: 1040, dur: 0.14, gain: 0.14 * v, delay: 0.07 });
				break;
			case "pickupWeapon":
				this.tone({ type: "square", from: 380, to: 380, dur: 0.08, gain: 0.18 * v });
				this.tone({ type: "square", from: 570, to: 570, dur: 0.1, gain: 0.18 * v, delay: 0.08 });
				this.tone({ type: "square", from: 760, to: 760, dur: 0.14, gain: 0.16 * v, delay: 0.18 });
				break;
			case "pickupKey":
				this.tone({ type: "triangle", from: 660, to: 660, dur: 0.1, gain: 0.2 * v });
				this.tone({ type: "triangle", from: 990, to: 990, dur: 0.16, gain: 0.18 * v, delay: 0.1 });
				break;
			case "doorOpen":
				this.tone({ type: "sawtooth", from: 58, to: 104, dur: 0.85, gain: 0.16 * v });
				this.noiseBurst({ dur: 0.85, gain: 0.14 * v, filter: "lowpass", from: 300, to: 900 });
				break;
			case "doorClose":
				this.tone({ type: "sawtooth", from: 104, to: 52, dur: 0.75, gain: 0.15 * v });
				this.noiseBurst({ dur: 0.75, gain: 0.13 * v, filter: "lowpass", from: 800, to: 220 });
				this.noiseBurst({ dur: 0.09, gain: 0.3 * v, filter: "lowpass", from: 400, to: 120, delay: 0.75 });
				break;
			case "doorLocked":
				this.tone({ type: "square", from: 150, to: 110, dur: 0.18, gain: 0.18 * v });
				break;
			case "switch":
				this.noiseBurst({ dur: 0.04, gain: 0.3 * v, filter: "bandpass", from: 1200, to: 800, q: 3 });
				this.noiseBurst({ dur: 0.05, gain: 0.26 * v, filter: "bandpass", from: 900, to: 600, q: 3, delay: 0.08 });
				break;
			case "playerPain":
				this.tone({ type: "square", from: 240, to: 150, dur: 0.22, gain: 0.24 * v, vibrato: 22 });
				this.noiseBurst({ dur: 0.16, gain: 0.16 * v, filter: "bandpass", from: 700, to: 380, q: 1.4 });
				break;
			case "playerDeath":
				this.tone({ type: "sawtooth", from: 220, to: 55, dur: 1.3, gain: 0.3 * v, vibrato: 14 });
				this.noiseBurst({ dur: 1.2, gain: 0.22 * v, filter: "lowpass", from: 1400, to: 200 });
				break;
			case "gruntAlert":
				this.tone({ type: "sawtooth", from: 300, to: 190, dur: 0.36, gain: 0.2 * v, vibrato: 26 });
				break;
			case "houndAlert":
				this.noiseBurst({ dur: 0.4, gain: 0.28 * v, filter: "bandpass", from: 480, to: 260, q: 2.4 });
				this.tone({ type: "sawtooth", from: 130, to: 90, dur: 0.4, gain: 0.16 * v, vibrato: 32 });
				break;
			case "impAlert":
				this.tone({ type: "triangle", from: 880, to: 520, dur: 0.5, gain: 0.16 * v, vibrato: 60 });
				break;
			case "enemyPain":
				this.tone({ type: "square", from: 420, to: 300, dur: 0.12, gain: 0.18 * v, vibrato: 40 });
				break;
			case "enemyDeath":
				this.tone({ type: "sawtooth", from: 300, to: 70, dur: 0.7, gain: 0.24 * v, vibrato: 18 });
				this.noiseBurst({ dur: 0.6, gain: 0.2 * v, filter: "lowpass", from: 1200, to: 180 });
				break;
			case "fireball":
				this.noiseBurst({ dur: 0.3, gain: 0.24 * v, filter: "bandpass", from: 600, to: 1800, q: 0.8 });
				break;
			case "explode":
				this.noiseBurst({ dur: 0.7, gain: 0.75 * v, filter: "lowpass", from: 2600, to: 90, q: 0.7 });
				this.tone({ type: "sine", from: 90, to: 32, dur: 0.6, gain: 0.4 * v });
				break;
			case "secret":
				this.tone({ type: "triangle", from: 523, to: 523, dur: 0.12, gain: 0.16 * v });
				this.tone({ type: "triangle", from: 659, to: 659, dur: 0.12, gain: 0.16 * v, delay: 0.12 });
				this.tone({ type: "triangle", from: 880, to: 880, dur: 0.22, gain: 0.16 * v, delay: 0.24 });
				break;
			case "exit":
				this.tone({ type: "sawtooth", from: 440, to: 110, dur: 1.1, gain: 0.22 * v });
				this.tone({ type: "sine", from: 220, to: 55, dur: 1.2, gain: 0.2 * v });
				break;
			case "menuMove":
				this.tone({ type: "square", from: 620, to: 620, dur: 0.04, gain: 0.1 * v });
				break;
			case "menuSelect":
				this.tone({ type: "square", from: 440, to: 880, dur: 0.12, gain: 0.14 * v });
				break;
		}
	}

	/** World sound: quieter with distance, silent past ~22 cells. */
	playAt(name: SoundName, distance: number, volume = 1): void {
		const attenuated = volume * Math.max(0, 1 - distance / 22) ** 1.7;
		if (attenuated > 0.02) this.play(name, attenuated);
	}

	private tone(spec: ToneSpec): void {
		const ctx = this.ctx;
		if (!ctx || !this.master) return;
		const start = ctx.currentTime + (spec.delay ?? 0);
		const osc = ctx.createOscillator();
		osc.type = spec.type ?? "sine";
		osc.frequency.setValueAtTime(spec.from, start);
		osc.frequency.exponentialRampToValueAtTime(
			Math.max(20, spec.to ?? spec.from),
			start + spec.dur,
		);

		const gain = ctx.createGain();
		const peak = spec.gain ?? 0.2;
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.dur);

		osc.connect(gain).connect(this.master);
		osc.start(start);
		osc.stop(start + spec.dur + 0.02);

		if (spec.vibrato) {
			const lfo = ctx.createOscillator();
			lfo.frequency.value = 11;
			const depth = ctx.createGain();
			depth.gain.value = spec.vibrato;
			lfo.connect(depth).connect(osc.frequency);
			lfo.start(start);
			lfo.stop(start + spec.dur + 0.02);
		}
	}

	private noiseBurst(spec: NoiseSpec): void {
		const ctx = this.ctx;
		if (!ctx || !this.master || !this.noise) return;
		const start = ctx.currentTime + (spec.delay ?? 0);
		const src = ctx.createBufferSource();
		src.buffer = this.noise;
		src.loop = true;
		// Random read offset so repeated shots never sound like a loop.
		const offset = Math.random() * 1.5;

		let node: AudioNode = src;
		if (spec.filter) {
			const filter = ctx.createBiquadFilter();
			filter.type = spec.filter;
			filter.Q.value = spec.q ?? 1;
			filter.frequency.setValueAtTime(spec.from ?? 1000, start);
			filter.frequency.exponentialRampToValueAtTime(
				Math.max(30, spec.to ?? spec.from ?? 1000),
				start + spec.dur,
			);
			node = src.connect(filter);
		}

		const gain = ctx.createGain();
		const peak = spec.gain ?? 0.3;
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(peak, start + 0.006);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.dur);

		node.connect(gain).connect(this.master);
		src.start(start, offset, spec.dur + 0.05);
		src.stop(start + spec.dur + 0.05);
	}

	dispose(): void {
		this.ctx?.close().catch(() => undefined);
		this.ctx = null;
		this.master = null;
		this.noise = null;
	}
}
