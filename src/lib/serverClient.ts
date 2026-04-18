import { createAuthClient } from "better-auth/client";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import type { Auth as BetterAuthBase } from "better-auth/types";
import { getAuth } from "@/src/lib/auth";

function createServerClient() {
	// Better Auth's oauthProviderResourceClient<T extends Auth> is bivariant,
	// so our plugin-augmented return type doesn't match. Cast to the base
	// Auth shape only for this one hand-off.
	const auth = getAuth() as unknown as BetterAuthBase;
	return createAuthClient({
		baseURL: process.env.BETTER_AUTH_URL,
		plugins: [oauthProviderResourceClient(auth)],
	});
}

export type ServerClient = ReturnType<typeof createServerClient>;

let cached: ServerClient | null = null;

export function getServerClient(): ServerClient {
	if (cached) return cached;
	cached = createServerClient();
	return cached;
}
