"use client";

import { audioBus } from "./audio";

let running = false;
let chirpTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Endless generative ambience: a very quiet detuned minor-third pad
 * breathing through a slow filter, with sparse birdlike chirps. ~-30 dB,
 * felt more than heard.
 */
export function startAmbience(): void {
	const bus = audioBus();
	if (!bus || running) return;
	running = true;
	const { ctx, master, reverb } = bus;

	const pad = ctx.createGain();
	pad.gain.value = 0;
	pad.connect(master);
	pad.connect(reverb);

	const filter = ctx.createBiquadFilter();
	filter.type = "lowpass";
	filter.frequency.value = 600;
	filter.connect(pad);

	for (const [freq, detune] of [
		[261.63, -4], // C4
		[311.13, 5], // Eb4
	] as const) {
		const osc = ctx.createOscillator();
		osc.type = "triangle";
		osc.frequency.value = freq;
		osc.detune.value = detune;
		osc.connect(filter);
		osc.start();
	}

	// slow breath on the filter
	const lfo = ctx.createOscillator();
	lfo.frequency.value = 0.05;
	const lfoGain = ctx.createGain();
	lfoGain.gain.value = 240;
	lfo.connect(lfoGain);
	lfoGain.connect(filter.frequency);
	lfo.start();

	// fade the pad in gently
	pad.gain.setTargetAtTime(0.022, ctx.currentTime, 2.5);

	const chirp = () => {
		if (!running) return;
		const t = ctx.currentTime;
		const osc = ctx.createOscillator();
		osc.type = "sine";
		const f = 1200 + Math.random() * 600;
		osc.frequency.setValueAtTime(f, t);
		osc.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.07);
		osc.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.16);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.014, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
		osc.connect(g);
		g.connect(reverb);
		osc.start(t);
		osc.stop(t + 0.25);
		osc.onended = () => g.disconnect();
		chirpTimer = setTimeout(chirp, 6000 + Math.random() * 8000);
	};
	chirpTimer = setTimeout(chirp, 3000);
}

export function stopAmbience(): void {
	running = false;
	if (chirpTimer) clearTimeout(chirpTimer);
}
