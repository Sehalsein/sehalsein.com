"use client";

import { audioBus } from "./audio";

export type Engine = {
	update: (speedNorm: number, throttle: number, drifting: boolean) => void;
	dispose: () => void;
};

/** brown noise loop buffer for tire wash */
function makeBrownNoise(ctx: AudioContext): AudioBuffer {
	const len = ctx.sampleRate * 2;
	const buf = ctx.createBuffer(1, len, ctx.sampleRate);
	const data = buf.getChannelData(0);
	let last = 0;
	for (let i = 0; i < len; i++) {
		const white = Math.random() * 2 - 1;
		last = (last + 0.02 * white) / 1.02;
		data[i] = last * 3.5;
	}
	return buf;
}

/**
 * A toy-truck engine out of two detuned saws through a lowpass, plus a
 * brown-noise band for tire wash at speed. Call update() once per frame.
 */
export function createEngine(): Engine | null {
	const bus = audioBus();
	if (!bus) return null;
	const { ctx, master } = bus;

	const osc1 = ctx.createOscillator();
	osc1.type = "sawtooth";
	osc1.frequency.value = 52;
	const osc2 = ctx.createOscillator();
	osc2.type = "sawtooth";
	osc2.frequency.value = 78;
	osc2.detune.value = 9;

	const filter = ctx.createBiquadFilter();
	filter.type = "lowpass";
	filter.frequency.value = 300;
	filter.Q.value = 0.8;

	const gain = ctx.createGain();
	gain.gain.value = 0;

	osc1.connect(filter);
	osc2.connect(filter);
	filter.connect(gain);
	gain.connect(master);

	const noise = ctx.createBufferSource();
	noise.buffer = makeBrownNoise(ctx);
	noise.loop = true;
	const noiseBand = ctx.createBiquadFilter();
	noiseBand.type = "bandpass";
	noiseBand.frequency.value = 700;
	noiseBand.Q.value = 0.6;
	const noiseGain = ctx.createGain();
	noiseGain.gain.value = 0;
	noise.connect(noiseBand);
	noiseBand.connect(noiseGain);
	noiseGain.connect(master);

	osc1.start();
	osc2.start();
	noise.start();

	return {
		update(speedNorm, throttle, drifting) {
			const t = ctx.currentTime;
			const rev = Math.min(1, speedNorm + Math.abs(throttle) * 0.15);
			osc1.frequency.setTargetAtTime(52 + 76 * rev, t, 0.08);
			osc2.frequency.setTargetAtTime((52 + 76 * rev) * 1.5, t, 0.08);
			filter.frequency.setTargetAtTime(
				300 + 1100 * rev + Math.abs(throttle) * 220,
				t,
				0.1,
			);
			gain.gain.setTargetAtTime(0.045 + 0.1 * rev, t, 0.12);
			const wash =
				speedNorm > 0.3 ? (speedNorm - 0.3) * 0.09 : 0;
			noiseGain.gain.setTargetAtTime(wash + (drifting ? 0.06 : 0), t, 0.12);
		},
		dispose() {
			for (const n of [osc1, osc2, noise]) {
				try {
					n.stop();
				} catch {
					// already stopped
				}
			}
			gain.disconnect();
			noiseGain.disconnect();
		},
	};
}
