/* Text-to-speech for the Hollowreach Game Master, via ElevenLabs.
 * The API key never leaves the server; the client talks to /api/adventure/voice. */

const API = "https://api.elevenlabs.io/v1/text-to-speech";

/** Deep, unhurried narrator ("George"). Override per-deploy with ELEVENLABS_VOICE_ID. */
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

/* Flash v2.5 trades a little warmth for ~75ms time-to-first-byte, which
 * matters here: the voice gates the typewriter, so latency is dead air. */
const MODEL_ID = "eleven_flash_v2_5";

/** Hard ceiling per request. ElevenLabs bills per character, so this bounds
 * the cost of any single call regardless of what the GM decides to write. */
export const MAX_NARRATION_CHARS = 1200;

export function narrationVoiceConfigured(): boolean {
	return !!process.env.ELEVENLABS_API_KEY;
}

/** Synthesize one narration line. Returns the raw audio/mpeg stream. */
export async function narrate(text: string): Promise<ReadableStream<Uint8Array>> {
	const key = process.env.ELEVENLABS_API_KEY;
	if (!key) throw new Error("voice is not configured");

	const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
	const res = await fetch(
		`${API}/${voiceId}/stream?output_format=mp3_44100_128`,
		{
			method: "POST",
			headers: {
				"xi-api-key": key,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				text: text.slice(0, MAX_NARRATION_CHARS),
				model_id: MODEL_ID,
				// Steady and a touch theatrical, without the sing-song of high style.
				voice_settings: {
					stability: 0.45,
					similarity_boost: 0.75,
					style: 0.3,
					use_speaker_boost: true,
				},
			}),
		},
	);

	if (!res.ok || !res.body) {
		const detail = await res.text().catch(() => "");
		throw new Error(
			`elevenlabs ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
		);
	}
	return res.body;
}
