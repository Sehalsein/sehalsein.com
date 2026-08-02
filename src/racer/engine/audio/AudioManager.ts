import { clamp01, lerp } from "../../shared/math";

/**
 * Synthesized game audio — no sample files needed for the core loop.
 *
 * The engine note is two detuned saws through a lowpass; skids are filtered
 * noise. Everything hangs off a master gain so mute/volume is one knob, and
 * new channels (music, ambience) can be added without touching callers.
 */
export class AudioManager {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private engineOscs: OscillatorNode[] = [];
	private engineGain: GainNode | null = null;
	private engineFilter: BiquadFilterNode | null = null;
	private skidGain: GainNode | null = null;
	private muted = false;
	private started = false;

	/** Must be called from a user gesture (browser autoplay policy). */
	start(): void {
		if (this.started || typeof window === "undefined") return;
		this.started = true;
		const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return;
		this.ctx = new Ctor();
		this.master = this.ctx.createGain();
		this.master.gain.value = this.muted ? 0 : 0.5;
		this.master.connect(this.ctx.destination);

		// engine: two detuned saws -> lowpass -> gain
		this.engineFilter = this.ctx.createBiquadFilter();
		this.engineFilter.type = "lowpass";
		this.engineFilter.frequency.value = 400;
		this.engineGain = this.ctx.createGain();
		this.engineGain.gain.value = 0;
		this.engineFilter.connect(this.engineGain);
		this.engineGain.connect(this.master);
		for (const detune of [0, 8]) {
			const osc = this.ctx.createOscillator();
			osc.type = "sawtooth";
			osc.frequency.value = 50;
			osc.detune.value = detune;
			osc.connect(this.engineFilter);
			osc.start();
			this.engineOscs.push(osc);
		}

		// skid: looped noise -> bandpass -> gain
		const noiseLength = this.ctx.sampleRate;
		const buffer = this.ctx.createBuffer(1, noiseLength, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < noiseLength; i++) data[i] = Math.random() * 2 - 1;
		const noise = this.ctx.createBufferSource();
		noise.buffer = buffer;
		noise.loop = true;
		const bandpass = this.ctx.createBiquadFilter();
		bandpass.type = "bandpass";
		bandpass.frequency.value = 900;
		bandpass.Q.value = 0.8;
		this.skidGain = this.ctx.createGain();
		this.skidGain.gain.value = 0;
		noise.connect(bandpass);
		bandpass.connect(this.skidGain);
		this.skidGain.connect(this.master);
		noise.start();
	}

	/** Drive engine pitch/volume from normalized rpm and skid from drift. */
	updateVehicleSound(rpm: number, drift: number, boosting: boolean): void {
		if (!this.ctx || !this.engineGain || !this.engineFilter || !this.skidGain) return;
		const t = this.ctx.currentTime;
		const r = clamp01(rpm);
		const freq = lerp(45, 170, r) * (boosting ? 1.25 : 1);
		for (const osc of this.engineOscs) osc.frequency.setTargetAtTime(freq, t, 0.05);
		this.engineFilter.frequency.setTargetAtTime(lerp(320, 1600, r), t, 0.08);
		this.engineGain.gain.setTargetAtTime(lerp(0.05, 0.24, r), t, 0.08);
		this.skidGain.gain.setTargetAtTime(clamp01(drift - 0.25) * 0.4, t, 0.05);
	}

	/** Short percussive thump for collisions; intensity 0..1. */
	playImpact(intensity: number): void {
		if (!this.ctx || !this.master) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(90, t);
		osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
		gain.gain.setValueAtTime(clamp01(intensity) * 0.5, t);
		gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
		osc.connect(gain);
		gain.connect(this.master);
		osc.start(t);
		osc.stop(t + 0.2);
	}

	/** UI blip (countdown, checkpoints). */
	playBeep(freq: number, durationSec = 0.09, volume = 0.2): void {
		if (!this.ctx || !this.master) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = "square";
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(volume, t);
		gain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);
		osc.connect(gain);
		gain.connect(this.master);
		osc.start(t);
		osc.stop(t + durationSec + 0.02);
	}

	toggleMute(): boolean {
		this.muted = !this.muted;
		if (this.master && this.ctx) {
			this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
		}
		return this.muted;
	}

	dispose(): void {
		this.ctx?.close().catch(() => {});
		this.ctx = null;
		this.started = false;
		this.engineOscs = [];
	}
}
