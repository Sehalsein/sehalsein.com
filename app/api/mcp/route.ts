import { createMcpHandler } from "mcp-handler";
import { mcpHandler } from "@better-auth/oauth-provider";
import { registerTools } from "@/src/lib/mcp/server";

export const runtime = "nodejs";

const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const resource = `${baseUrl}/api/mcp`;

const inner = mcpHandler(
	{
		jwksUrl: `${baseUrl}/api/auth/jwks`,
		verifyOptions: {
			audience: resource,
			issuer: baseUrl,
		},
	},
	async (req, jwt) =>
		createMcpHandler(
			(server) => registerTools(server, { jwt }),
			{
				serverInfo: {
					name: "sehalsein.com",
					version: "1.0.0",
				},
			},
			{
				basePath: "/api",
				disableSse: true,
				verboseLogs: true,
			},
		)(req),
);

async function handler(req: Request) {
	try {
		const res = await inner(req);
		if (!res.ok && res.status !== 401) {
			try {
				const body = await res.clone().text();
				console.error(
					`[mcp:${res.status}] ${req.method} ${new URL(req.url).pathname} → ${body.slice(0, 1000)}`,
				);
			} catch {
				/* ignore */
			}
		}
		return res;
	} catch (err) {
		console.error(
			"[mcp:throw]",
			err instanceof Error
				? { message: err.message, stack: err.stack }
				: err,
		);
		return new Response(
			JSON.stringify({
				error: "internal_server_error",
				message: err instanceof Error ? err.message : String(err),
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}

export { handler as GET, handler as POST, handler as DELETE };
