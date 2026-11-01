import { createFileRoute } from "@tanstack/react-router";
import { isAPIError } from "better-auth/api";
import {
	requestToResourceInput,
	verifyAccessTokenRequest,
} from "better-auth/oauth2";
import { createMcpHandler } from "mcp-handler";
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
	const baseUrl = process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;

	let jwt: Awaited<ReturnType<typeof verifyAccessTokenRequest>>;
	try {
		jwt = await verifyAccessTokenRequest(requestToResourceInput(request), {
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
