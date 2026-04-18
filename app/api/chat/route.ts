import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { RESUME_DATA } from "@/src/data/resume";

const openrouter = createOpenRouter({
	apiKey: process.env.OPEN_ROUTER_KEY,
});

// Simple in-memory rate limiter: 10 msgs/min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);
	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
		return false;
	}
	entry.count++;
	return entry.count > 10;
}

const systemPrompt = `You are a terminal assistant embedded in Sehal Sein's personal website (sehalsein.com).
You know everything about Sehal from his resume data below.
Answer questions about his experience, skills, projects, and background.
Keep responses concise and terminal-friendly — short paragraphs, no markdown headers, no bullet points.
Match the vibe: casual, dev-humor, like chatting with a senior engineer.
If asked something you don't know about Sehal, say so honestly.
Do not use markdown formatting — no #, ##, **, \`\`\`, etc. Just plain text.

Resume data:
- Name: ${RESUME_DATA.name}
- Role: Sr Software Engineer
- Location: ${RESUME_DATA.location}
- Email: ${RESUME_DATA.email}
- Phone: ${RESUME_DATA.phone}
- Summary: ${RESUME_DATA.summary}
- Skills: ${RESUME_DATA.skills.map((s) => s.title).join(", ")}
- Social: ${RESUME_DATA.social.map((s) => `${s.name}: ${s.url}`).join(", ")}
- Experience:
${RESUME_DATA.experience
	.map(
		(e) =>
			`  * ${e.company} — ${e.position} (${e.duration.from}${e.duration.to ? `–${e.duration.to}` : "–present"})${e.description.length > 0 ? `: ${e.description.join(". ")}` : ""}`,
	)
	.join("\n")}
- Education:
${RESUME_DATA.education
	.map(
		(e) =>
			`  * ${e.name} — ${e.institution}, ${e.location} (${e.duration.from}–${e.duration.to})`,
	)
	.join("\n")}
- Certifications: ${RESUME_DATA.certifications.map((c) => `${c.name} (${c.issuer}, ${c.issued})`).join(", ")}`;

// Convert v6 UI message format (parts) to model message format (content)
function convertMessages(
	messages: Array<{
		role: string;
		content?: string;
		parts?: Array<{ type: string; text?: string }>;
	}>,
): Array<{ role: "user" | "assistant"; content: string }> {
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
		const ip =
			req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
			req.headers.get("x-real-ip") ||
			"unknown";

		if (isRateLimited(ip)) {
			return Response.json(
				{ error: "rate limit exceeded. slow down." },
				{ status: 429 },
			);
		}

		const body = await req.json();
		const messages = convertMessages(body.messages || []);

		if (messages.length === 0) {
			return Response.json({ error: "no messages provided." }, { status: 400 });
		}

		const result = streamText({
			model: openrouter("moonshotai/kimi-k2.5"),
			system: systemPrompt,
			messages,
			providerOptions: {
				openrouter: {
					provider: {
						only: ["cloudflare"],
						allow_fallbacks: false,
					},
				},
			},
		});

		// Stream the response, wrapping in error handling
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
					controller.enqueue(
						encoder.encode(`\n[error: ${clean}]`),
					);
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
		// Clean up the error message for the user
		const userMessage = message
			.replace(/Error \[.*?\]: /, "")
			.replace(/\. Manage it using.*/, ".");
		console.error("Chat API error:", message);
		return new Response(userMessage, { status: 500 });
	}
}
