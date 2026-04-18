import { createMcpHandler } from "mcp-handler";
import { mcpHandler } from "@better-auth/oauth-provider";
import { registerTools } from "@/src/lib/mcp/server";

export const runtime = "nodejs";

const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

const handler = mcpHandler(
	{
		jwksUrl: `${baseUrl}/api/auth/jwks`,
		verifyOptions: {
			issuer: `${baseUrl}/api/auth`,
			audience: `${baseUrl}/api/mcp`,
		},
	},
	async (req, jwt) =>
		createMcpHandler(
			(server) => registerTools(server, { jwt }),
			{
				serverInfo: { name: "sehalsein.com", version: "1.0.0" },
			},
			{
				basePath: "/api",
				disableSse: true,
				verboseLogs: false,
			},
		)(req),
);

export { handler as GET, handler as POST, handler as DELETE };
