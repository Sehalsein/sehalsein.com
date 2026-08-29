import { createFileRoute } from "@tanstack/react-router";
import { createMcpHandler } from "mcp-handler";
import { mcpHandler } from "@better-auth/oauth-provider";
import { registerTools } from "@/src/lib/mcp/server";

export const Route = createFileRoute("/api/mcp")({
	server: {
		handlers: {
			GET: handleMcp,
			POST: handleMcp,
			DELETE: handleMcp,
		},
	},
});

function handleMcp({ request }: { request: Request }) {
	const baseUrl = process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;
	return mcpHandler(
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
				{ serverInfo: { name: "sehalsein.com", version: "2.0.0" } },
				{ basePath: "/api", disableSse: true, verboseLogs: false },
			)(req),
	)(request);
}
