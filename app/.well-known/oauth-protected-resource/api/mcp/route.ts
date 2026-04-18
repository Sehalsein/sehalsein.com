import { getServerClient } from "@/src/lib/serverClient";

export const runtime = "nodejs";

// Source of truth for our canonical origin. Must match the MCP route's
// `verifyOptions.audience` (see app/api/mcp/route.ts) — otherwise the SDK
// rejects the handshake as a protected-resource mismatch. On Netlify preview
// deploys the request host is the preview subdomain, which would desync from
// the JWT's audience, so never derive this from `req.url`.
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
		authorization_servers: [origin],
	});
	return new Response(JSON.stringify(metadata), {
		headers: { "Content-Type": "application/json" },
	});
};
