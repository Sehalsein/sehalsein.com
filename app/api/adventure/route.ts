import { completeAdventure } from "@/src/lib/ai/adventure";

/**
 * One Game Master turn. The client builds the full prompt (character sheet,
 * recent events, the action taken) and posts it here; we return the model's
 * raw text, which is expected to be a single JSON object the client parses.
 */
export async function POST(req: Request) {
	try {
		const body = await req.json();
		const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

		if (!prompt) {
			return Response.json(
				{ error: "no prompt provided." },
				{ status: 400 },
			);
		}

		const text = await completeAdventure(prompt);
		return new Response(text, {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "unexpected error";
		const userMessage = message
			.replace(/Error \[.*?\]: /, "")
			.replace(/\. Manage it using.*/, ".");
		console.error("Adventure API error:", message);
		return new Response(userMessage, { status: 500 });
	}
}
