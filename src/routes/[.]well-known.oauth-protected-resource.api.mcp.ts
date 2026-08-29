import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/src/lib/serverClient";

export const Route = createFileRoute("/.well-known/oauth-protected-resource/api/mcp")({
	server: { handlers: { GET: protectedResourceMetadata } },
});

async function protectedResourceMetadata({ request }: { request: Request }) {
	const origin = process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;
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
