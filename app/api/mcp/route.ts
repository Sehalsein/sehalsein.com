import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTools } from "@/src/lib/mcp/server";
import { getAuth } from "@/src/lib/auth";

export const runtime = "nodejs";

const baseHandler = createMcpHandler(
	(server) => registerTools(server),
	{
		serverInfo: {
			name: "sehalsein.com",
			version: "1.0.0",
		},
	},
	{
		basePath: "/api",
		disableSse: true,
		verboseLogs: false,
	},
);

const handler = withMcpAuth(
	baseHandler,
	async (req, bearerToken) => {
		if (!bearerToken) return undefined;
		try {
			const auth = getAuth();
			const api = auth.api as unknown as {
				getMcpSession: (opts: { headers: Headers }) => Promise<{
					clientId: string;
					scopes?: string;
					userId?: string;
				} | null>;
			};
			const session = await api.getMcpSession({
				headers: req.headers,
			});
			if (!session) return undefined;
			return {
				token: bearerToken,
				clientId: session.clientId,
				scopes: session.scopes?.split(" ") ?? [],
				extra: {
					userId: session.userId,
				},
			};
		} catch {
			return undefined;
		}
	},
	{ required: false },
);

export { handler as GET, handler as POST, handler as DELETE };
