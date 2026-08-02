import { narrate, narrationVoiceConfigured } from "@/src/lib/ai/narrator";

/**
 * Speak one line of Game Master narration. The client posts the same text it
 * is about to type out, and drives its typewriter off the returned audio's
 * clock so the words appear in step with the voice.
 *
 * A 503 here is not an error state for the player — the client just falls
 * back to a silent, timed typewriter.
 */
export async function POST(req: Request) {
	if (!narrationVoiceConfigured()) {
		return new Response("voice is not configured", { status: 503 });
	}

	try {
		const body = await req.json();
		const text = typeof body?.text === "string" ? body.text.trim() : "";

		if (!text) {
			return new Response("no text provided", { status: 400 });
		}

		const audio = await narrate(text);
		return new Response(audio, {
			headers: {
				"Content-Type": "audio/mpeg",
				"Cache-Control": "no-store",
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "unexpected error";
		console.error("Adventure voice error:", message);
		return new Response("the narrator has lost their voice", { status: 502 });
	}
}
