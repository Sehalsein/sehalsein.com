import { createFileRoute } from "@tanstack/react-router";
import { completeAdventure } from "@/src/lib/ai/adventure";

export const Route = createFileRoute("/api/adventure")({
	server: { handlers: { POST: handleAdventure } },
});

async function handleAdventure({ request }: { request: Request }) {
	try {
		const body = await request.json();
		const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
		if (!prompt) {
			return Response.json({ error: "no prompt provided." }, { status: 400 });
		}
		return new Response(await completeAdventure(prompt), {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "unexpected error";
		console.error("Adventure API error:", message);
		return new Response(message.replace(/Error \[.*?\]: /, ""), { status: 500 });
	}
}
