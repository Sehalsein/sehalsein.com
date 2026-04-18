import { streamChat, type ChatMessage } from "@/src/lib/ai/chat";

// Convert v6 UI message format (parts) to model message format (content)
function convertMessages(
	messages: Array<{
		role: string;
		content?: string;
		parts?: Array<{ type: string; text?: string }>;
	}>,
): ChatMessage[] {
	return messages
		.filter((m) => m.role === "user" || m.role === "assistant")
		.map((m) => {
			let content = m.content || "";
			if (!content && m.parts) {
				content = m.parts
					.filter((p) => p.type === "text" && p.text)
					.map((p) => p.text)
					.join("");
			}
			return {
				role: m.role as "user" | "assistant",
				content,
			};
		});
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
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
					if (done) {
						controller.close();
						return;
					}
					controller.enqueue(encoder.encode(value));
				} catch (err) {
					const msg =
						err instanceof Error ? err.message : "stream error";
					const clean = msg
						.replace(/Error \[.*?\]: /, "")
						.replace(/\. Manage it using.*/, ".");
					controller.enqueue(encoder.encode(`\n[error: ${clean}]`));
					controller.close();
				}
			},
			cancel() {
				reader.cancel();
			},
		});

		return new Response(stream, {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "unexpected error";
		const userMessage = message
			.replace(/Error \[.*?\]: /, "")
			.replace(/\. Manage it using.*/, ".");
		console.error("Chat API error:", message);
		return new Response(userMessage, { status: 500 });
	}
}
