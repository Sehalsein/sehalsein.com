"use client";

import { audioBus } from "./audio";

let lastThud = 0;
let liveThuds = 0;

/** soft physical thunk — noise burst + a pitch-dropping sine body */
export function thud(intensity = 1): void {
	const bus = audioBus();
	if (!bus) return;
	const now = performance.now();
	if (now - lastThud < 70 || liveThuds >= 4) return;
	lastThud = now;
	liveThuds++;

	const { ctx, master, reverb } = bus;
	const t = ctx.currentTime;
	const amp = 0.12 + 0.3 * Math.min(1, intensity);

	const noise = ctx.createBufferSource();
	const len = Math.floor(ctx.sampleRate * 0.09);
	const buf = ctx.createBuffer(1, len, ctx.sampleRate);
	const data = buf.getChannelData(0);
	for (let i = 0; i < len; i++) {
		data[i] = (Math.random() * 2 - 1) * Math.exp(-18 * (i / len));
	}
	noise.buffer = buf;
	const lp = ctx.createBiquadFilter();
	lp.type = "lowpass";
	lp.frequency.value = 420;

	const body = ctx.createOscillator();
	body.type = "sine";
	body.frequency.setValueAtTime(120, t);
	body.frequency.exponentialRampToValueAtTime(58, t + 0.09);

	const gain = ctx.createGain();
	gain.gain.setValueAtTime(amp, t);
	gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

	noise.connect(lp);
	lp.connect(gain);
	body.connect(gain);
	gain.connect(master);
	gain.connect(reverb);

	noise.start(t);
	body.start(t);
	body.stop(t + 0.18);
	body.onended = () => {
		liveThuds--;
		gain.disconnect();
	};
}

/** friendly two-tone klaxon */
export function horn(): void {
	const bus = audioBus();
	if (!bus) return;
	const { ctx, master, reverb } = bus;
	const t = ctx.currentTime;
	for (const [freq, delay] of [
		[440, 0],
		[554, 0.02],
	] as const) {
		const osc = ctx.createOscillator();
		osc.type = "square";
		osc.frequency.value = freq;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.0001, t + delay);
		gain.gain.linearRampToValueAtTime(0.06, t + delay + 0.02);
		gain.gain.setValueAtTime(0.06, t + delay + 0.18);
		gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.3);
		osc.connect(gain);
		gain.connect(master);
		gain.connect(reverb);
		osc.start(t + delay);
		osc.stop(t + delay + 0.32);
		osc.onended = () => gain.disconnect();
	}
}

/** tiny UI blip for focusing stations and toggling things */
export function blip(): void {
	const bus = audioBus();
	if (!bus) return;
	const { ctx, master } = bus;
	const t = ctx.currentTime;
	const osc = ctx.createOscillator();
	osc.type = "square";
	osc.frequency.value = 880;
	const gain = ctx.createGain();
	gain.gain.setValueAtTime(0.05, t);
	gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
	osc.connect(gain);
	gain.connect(master);
	osc.start(t);
	osc.stop(t + 0.06);
	osc.onended = () => gain.disconnect();
}
