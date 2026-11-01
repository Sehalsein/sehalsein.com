import { createFileRoute } from "@tanstack/react-router";
import { isAPIError } from "better-auth/api";
import { verifyBearerToken } from "better-auth/oauth2";
import { createMcpHandler } from "mcp-handler";
import { getAuthBaseUrl } from "@/src/lib/auth";
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

async function handleMcp({ request }: { request: Request }) {
	const baseUrl = getAuthBaseUrl();
	const authorization = request.headers.get("authorization") ?? "";
	const token = authorization.startsWith("Bearer ")
		? authorization.slice("Bearer ".length)
		: "";

	let jwt: Awaited<ReturnType<typeof verifyBearerToken>>;
	try {
		// Bearer only: DPoP-bound tokens are rejected rather than accepted
		// without a shared replay store across Worker instances.
		jwt = await verifyBearerToken(token, {
			jwksUrl: `${baseUrl}/api/auth/jwks`,
			verifyOptions: {
				issuer: `${baseUrl}/api/auth`,
				audience: `${baseUrl}/api/mcp`,
			},
		});
	} catch (error) {
		if (!isAPIError(error)) throw error;
		// Point MCP clients at the protected-resource metadata so they can start the OAuth flow.
		return new Response(error.message, {
			status: error.statusCode,
			headers: {
				"WWW-Authenticate": `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource/api/mcp"`,
			},
		});
	}

	return createMcpHandler((server) => registerTools(server, { jwt }), {
		serverInfo: { name: "sehalsein.com", version: "2.0.0" },
		verboseLogs: false,
	})(request);
}
