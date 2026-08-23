import { createFileRoute } from "@tanstack/react-router";
import { streamChat, type ChatMessage } from "@/src/lib/ai/chat";

export const Route = createFileRoute("/api/chat")({
	server: { handlers: { POST: handleChat } },
});

function convertMessages(
	messages: Array<{
		role: string;
		content?: string;
		parts?: Array<{ type: string; text?: string }>;
	}>,
): ChatMessage[] {
	return messages
		.filter((message) => message.role === "user" || message.role === "assistant")
		.map((message) => ({
			role: message.role as "user" | "assistant",
			content:
				message.content ||
				message.parts
					?.filter((part) => part.type === "text" && part.text)
					.map((part) => part.text)
					.join("") ||
				"",
		}));
}

async function handleChat({ request }: { request: Request }) {
	try {
		const body = await request.json();
		const messages = convertMessages(body.messages || []);
		if (messages.length === 0) {
			return Response.json({ error: "no messages provided." }, { status: 400 });
		}

		const result = streamChat({ messages });
		const reader = result.textStream.getReader();
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async pull(controller) {
				try {
					const { done, value } = await reader.read();
					if (done) return controller.close();
					controller.enqueue(encoder.encode(value));
				} catch (error) {
					const message = error instanceof Error ? error.message : "stream error";
					controller.enqueue(encoder.encode(`\n[error: ${cleanError(message)}]`));
					controller.close();
				}
			},
			cancel: () => reader.cancel(),
		});
		return new Response(stream, {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "unexpected error";
		console.error("Chat API error:", message);
		return new Response(cleanError(message), { status: 500 });
	}
}

function cleanError(message: string) {
	return message
		.replace(/Error \[.*?\]: /, "")
		.replace(/\. Manage it using.*/, ".");
}
