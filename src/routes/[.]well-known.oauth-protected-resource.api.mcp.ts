import { createFileRoute } from "@tanstack/react-router";
import { getAuthBaseUrl } from "@/src/lib/auth";
import { getServerClient } from "@/src/lib/serverClient";

export const Route = createFileRoute("/.well-known/oauth-protected-resource/api/mcp")({
	server: { handlers: { GET: protectedResourceMetadata } },
});

async function protectedResourceMetadata() {
	const origin = getAuthBaseUrl();
	const metadata = await getServerClient().getProtectedResourceMetadata({
		resource: `${origin}/api/mcp`,
		authorization_servers: [`${origin}/api/auth`],
	});
	return Response.json(metadata, {
		headers: {
			"Cache-Control":
				"public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
		},
	});
}
