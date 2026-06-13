"use client";

import { useWorldStore } from "../store";

/**
 * Lazy WebAudio singleton. Nothing exists until `unlockAudio()` runs inside
 * a user gesture (browser autoplay policy); every play function no-ops
 * before that. All sound is synthesized — no audio assets to download.
 */

export type AudioBus = {
	ctx: AudioContext;
	/** dry output, gain follows the mute toggle */
	master: GainNode;
	/** wet send — a small generated-impulse reverb into master */
	reverb: ConvolverNode;
};

let bus: AudioBus | null = null;

export function audioBus(): AudioBus | null {
	return bus;
}

/** soft exponential-decay noise impulse ≈ a small open field */
function makeImpulse(ctx: AudioContext): AudioBuffer {
	const len = Math.floor(ctx.sampleRate * 1.6);
	const buf = ctx.createBuffer(2, len, ctx.sampleRate);
	for (let ch = 0; ch < 2; ch++) {
		const data = buf.getChannelData(ch);
		for (let i = 0; i < len; i++) {
			data[i] = (Math.random() * 2 - 1) * Math.exp(-3.2 * (i / len));
		}
	}
	return buf;
}

export function unlockAudio(): AudioBus | null {
	if (bus) {
		void bus.ctx.resume();
		return bus;
	}
	if (typeof window === "undefined") return null;
	const Ctx =
		window.AudioContext ??
		(window as unknown as { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	if (!Ctx) return null;

	const ctx = new Ctx();
	const master = ctx.createGain();
	master.gain.value = useWorldStore.getState().muted ? 0 : 1;
	master.connect(ctx.destination);

	const reverb = ctx.createConvolver();
	reverb.buffer = makeImpulse(ctx);
	const wet = ctx.createGain();
	wet.gain.value = 0.18;
	reverb.connect(wet);
	wet.connect(master);

	bus = { ctx, master, reverb };

	useWorldStore.subscribe((s) => {
		if (!bus) return;
		const t = bus.ctx.currentTime;
		bus.master.gain.cancelScheduledValues(t);
		bus.master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.08);
	});

	return bus;
}
