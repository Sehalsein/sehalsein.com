import * as ai from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { initLogger, wrapAISDK } from "braintrust";
import { RESUME_DATA } from "@/src/data/resume";

initLogger({
	projectName: "sehalsein.com",
	apiKey: process.env.BRAINTRUST_API_KEY,
});

const wrapped = wrapAISDK(ai);

const openrouter = createOpenRouter({
	apiKey: process.env.OPEN_ROUTER_KEY,
});

export const MODEL_ID = "moonshotai/kimi-k2.5";

export const SYSTEM_PROMPT = `You are a terminal assistant embedded in Sehal Sein's personal website (sehalsein.com).
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

export type ChatMessage = {
	role: "user" | "assistant" | "system";
	content: string;
};

export function streamChat(opts: { messages: ChatMessage[] }) {
	return wrapped.streamText({
		model: openrouter(MODEL_ID),
		system: SYSTEM_PROMPT,
		messages: opts.messages,
		providerOptions: {
			openrouter: {
				provider: {
					only: ["cloudflare"],
					allow_fallbacks: false,
				},
			},
		},
	});
}

export async function completeChat(question: string): Promise<string> {
	const result = wrapped.generateText({
		model: openrouter(MODEL_ID),
		system: SYSTEM_PROMPT,
		messages: [{ role: "user", content: question }],
	});
	const { text } = await result;
	return text;
}
