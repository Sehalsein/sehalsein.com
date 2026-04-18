import { getServerClient } from "@/src/lib/serverClient";

export const runtime = "nodejs";

// Source of truth for our canonical origin. Must match verifyOptions.audience
// in app/api/mcp/route.ts — otherwise MCP clients reject the handshake as a
// resource mismatch (e.g. on Netlify preview deploys the request host is the
// preview subdomain). Always derive from BETTER_AUTH_URL, never from req.url.
function canonicalOrigin(req: Request): string {
	if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
	const url = new URL(req.url);
	return `${url.protocol}//${url.host}`;
}

export const GET = async (req: Request) => {
	const serverClient = getServerClient();
	const origin = canonicalOrigin(req);
	const metadata = await serverClient.getProtectedResourceMetadata({
		resource: `${origin}/api/mcp`,
		// Must match the `issuer` advertised in /.well-known/openid-configuration
		// (= baseURL + basePath). Our basePath is /api/auth.
		authorization_servers: [`${origin}/api/auth`],
	});
	return new Response(JSON.stringify(metadata), {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control":
				"public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
		},
	});
};
