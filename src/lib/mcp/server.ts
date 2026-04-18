import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RESUME_DATA } from "@/src/data/resume";
import { NOW_LAST_UPDATED, NOW_SECTIONS } from "@/src/data/now";
import { completeChat } from "@/src/lib/ai/chat";
import { rateLimit } from "@/src/lib/rateLimit";

function textResult(value: unknown) {
	const content =
		typeof value === "string" ? value : JSON.stringify(value, null, 2);
	return { content: [{ type: "text" as const, text: content }] };
}

function errorResult(message: string) {
	return {
		content: [{ type: "text" as const, text: message }],
		isError: true,
	};
}

export function registerTools(server: McpServer) {
	server.registerTool(
		"get_resume",
		{
			title: "Get resume",
			description:
				"Returns Sehal Sein's full structured resume data: experience, education, skills, certifications, and contact info.",
			inputSchema: {},
		},
		async () => textResult(RESUME_DATA),
	);

	server.registerTool(
		"get_experience",
		{
			title: "Get experience",
			description:
				"Returns Sehal's work experience, optionally filtered by company name (case-insensitive substring).",
			inputSchema: {
				company: z
					.string()
					.optional()
					.describe(
						"Filter to entries whose company name contains this substring.",
					),
			},
		},
		async ({ company }) => {
			const entries = company
				? RESUME_DATA.experience.filter((e) =>
						e.company.toLowerCase().includes(company.toLowerCase()),
					)
				: RESUME_DATA.experience;
			return textResult(entries);
		},
	);

	server.registerTool(
		"get_skills",
		{
			title: "Get skills",
			description: "Returns Sehal's technical skills as a flat list.",
			inputSchema: {},
		},
		async () => textResult(RESUME_DATA.skills.map((s) => s.title)),
	);

	server.registerTool(
		"get_projects",
		{
			title: "Get projects",
			description:
				"Returns projects derived from Sehal's experience — slug, company, year, role, description.",
			inputSchema: {},
		},
		async () =>
			textResult(
				RESUME_DATA.experience.map((e) => ({
					company: e.company,
					position: e.position,
					year: e.duration.to
						? `${e.duration.from}-${e.duration.to}`
						: `${e.duration.from}-present`,
					description: e.description.join(" ") || null,
				})),
			),
	);

	server.registerTool(
		"get_now",
		{
			title: "Get /now",
			description:
				"Returns Sehal's /now page: what he's working on, reading, listening to, learning, and doing in life.",
			inputSchema: {},
		},
		async () =>
			textResult({
				lastUpdated: NOW_LAST_UPDATED,
				sections: NOW_SECTIONS,
			}),
	);

	server.registerResource(
		"resume",
		"resume://sehal",
		{
			title: "Sehal's resume",
			description: "Full structured resume as JSON",
			mimeType: "application/json",
		},
		async (uri) => ({
			contents: [
				{
					uri: uri.href,
					mimeType: "application/json",
					text: JSON.stringify(RESUME_DATA, null, 2),
				},
			],
		}),
	);

	server.registerResource(
		"now",
		"now://sehal",
		{
			title: "Sehal's /now page",
			description: "What Sehal is up to right now",
			mimeType: "application/json",
		},
		async (uri) => ({
			contents: [
				{
					uri: uri.href,
					mimeType: "application/json",
					text: JSON.stringify(
						{
							lastUpdated: NOW_LAST_UPDATED,
							sections: NOW_SECTIONS,
						},
						null,
						2,
					),
				},
			],
		}),
	);

	server.registerTool(
		"ask_sehal",
		{
			title: "Ask Sehal",
			description:
				"Ask an LLM that has Sehal's resume and /now loaded as context. Returns a conversational answer. Requires OAuth sign-in via the MCP client; rate-limited to 20 calls per hour per user.",
			inputSchema: {
				question: z
					.string()
					.min(1)
					.max(1000)
					.describe("Your question for Sehal."),
			},
		},
		async ({ question }, extra) => {
			const authInfo = extra.authInfo;
			if (!authInfo) {
				return errorResult(
					"ask_sehal requires authentication. Sign in via your MCP client's OAuth flow.",
				);
			}
			const subject =
				(authInfo.extra as { userId?: string } | undefined)?.userId ??
				authInfo.clientId ??
				"anonymous";
			const rl = await rateLimit({
				key: `mcp:ask_sehal:${subject}`,
				limit: 20,
				windowSeconds: 60 * 60,
			});
			if (!rl.allowed) {
				return errorResult(
					`rate limit exceeded. resets at ${rl.resetAt.toISOString()}`,
				);
			}
			const answer = await completeChat(question);
			return textResult(answer);
		},
	);
}
