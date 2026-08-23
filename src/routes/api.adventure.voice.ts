import { createFileRoute } from "@tanstack/react-router";
import { narrate, narrationVoiceConfigured } from "@/src/lib/ai/narrator";

export const Route = createFileRoute("/api/adventure/voice")({
	server: { handlers: { POST: handleVoice } },
});

async function handleVoice({ request }: { request: Request }) {
	if (!narrationVoiceConfigured()) {
		return new Response("voice is not configured", { status: 503 });
	}

	try {
		const body = await request.json();
		const value = typeof body?.text === "string" ? body.text.trim() : "";
		if (!value) return new Response("no text provided", { status: 400 });
		return new Response(await narrate(value), {
			headers: {
				"Content-Type": "audio/mpeg",
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		console.error("Adventure voice error:", error);
		return new Response("the narrator has lost their voice", { status: 502 });
	}
}
