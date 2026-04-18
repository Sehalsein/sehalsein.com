import { getServerClient } from "@/src/lib/serverClient";

export const runtime = "nodejs";

export const GET = async (req: Request) => {
	const serverClient = getServerClient();
	const url = new URL(req.url);
	const origin = `${url.protocol}//${url.host}`;
	const metadata = await serverClient.getProtectedResourceMetadata({
		resource: `${origin}/api/mcp`,
		authorization_servers: [origin],
	});
	return new Response(JSON.stringify(metadata), {
		headers: { "Content-Type": "application/json" },
	});
};
