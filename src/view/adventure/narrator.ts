/* Client half of the spoken Game Master.
 *
 * We download the whole clip before playing rather than streaming it: the
 * typewriter is driven off `audio.duration`, and a streamed <audio> reports
 * duration as NaN until it has buffered. A narration turn is a few seconds of
 * mp3, so the extra wait is small and buys exact word-to-voice sync. */

export const VOICE_PREF_KEY = "hollowreach_voice_v1";

export function loadVoicePref(): boolean {
	if (typeof localStorage === "undefined") return false;
	try {
		return localStorage.getItem(VOICE_PREF_KEY) === "on";
	} catch {
		return false;
	}
}

export function writeVoicePref(on: boolean): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(VOICE_PREF_KEY, on ? "on" : "off");
	} catch {
		/* storage unavailable */
	}
}

type SpeakHandlers = {
	/** Audio is playing; `duration` is its length in seconds. */
	onStart?: (duration: number) => void;
	/** Playback finished, was stopped, or never got off the ground. */
	onEnd?: () => void;
};

export class Narrator {
	private audio: HTMLAudioElement | null = null;
	private url: string | null = null;
	private abort: AbortController | null = null;
	/** Bumped on every speak/stop so stale async work can bail out. */
	private token = 0;

	/** True once the server has told us it can't synthesize; stops us retrying. */
	unavailable = false;

	/** Must run inside a user gesture — browsers only trust an element that has
	 * already been played once, and our real playback starts after an await. */
	unlock(): void {
		const el = this.element();
		el.muted = true;
		el.play().then(
			() => {
				el.pause();
				el.muted = false;
			},
			() => {
				el.muted = false;
			},
		);
	}

	private element(): HTMLAudioElement {
		if (!this.audio) {
			this.audio = new Audio();
			this.audio.preload = "auto";
		}
		return this.audio;
	}

	/** Fraction of the clip played so far (0..1), or null when not speaking. */
	progress(): number | null {
		const el = this.audio;
		if (!el || el.paused || !el.duration || !isFinite(el.duration)) return null;
		return Math.min(1, el.currentTime / el.duration);
	}

	/**
	 * Speak `text`. Resolves true if audio actually played through, false if
	 * voice was unavailable or playback failed — the caller then falls back to
	 * a timed typewriter. `onEnd` fires exactly once either way.
	 */
	async speak(text: string, handlers: SpeakHandlers = {}): Promise<boolean> {
		this.stop();
		if (this.unavailable) {
			handlers.onEnd?.();
			return false;
		}

		const mine = ++this.token;
		const ctrl = new AbortController();
		this.abort = ctrl;

		try {
			const res = await fetch("/api/adventure/voice", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text }),
				signal: ctrl.signal,
			});
			// 503 means the deploy has no key — don't keep asking.
			if (res.status === 503) this.unavailable = true;
			if (!res.ok) throw new Error(String(res.status));

			const blob = await res.blob();
			if (mine !== this.token) return false;

			const url = URL.createObjectURL(blob);
			this.url = url;
			const el = this.element();
			el.src = url;

			const finished = new Promise<void>((resolve) => {
				const done = () => {
					el.removeEventListener("ended", done);
					el.removeEventListener("error", done);
					resolve();
				};
				el.addEventListener("ended", done);
				el.addEventListener("error", done);
			});

			await el.play();
			if (mine !== this.token) return false;

			// `duration` is reliable here: the blob is fully in memory.
			handlers.onStart?.(isFinite(el.duration) ? el.duration : 0);
			await finished;
			if (mine !== this.token) return false;

			handlers.onEnd?.();
			return true;
		} catch {
			if (mine === this.token) handlers.onEnd?.();
			return false;
		}
	}

	/** Cut playback short (skip, toggle off, unmount). */
	stop(): void {
		this.token++;
		this.abort?.abort();
		this.abort = null;
		if (this.audio) {
			this.audio.pause();
			this.audio.removeAttribute("src");
			this.audio.load();
		}
		if (this.url) {
			URL.revokeObjectURL(this.url);
			this.url = null;
		}
	}
}
