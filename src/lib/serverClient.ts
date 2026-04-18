import { createAuthClient } from "better-auth/client";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";

function createServerClient() {
	// The resource client accepts auth as an optional parameter for inferring
	// config. We omit it to avoid a Better Auth generic-variance issue between
	// our plugin-augmented `betterAuth()` return type and the client's base
	// `Auth` constraint — we pass the same values explicitly at the call site
	// of getProtectedResourceMetadata, which is the whole surface we use.
	return createAuthClient({
		baseURL: process.env.BETTER_AUTH_URL,
		plugins: [oauthProviderResourceClient()],
	});
}

export type ServerClient = ReturnType<typeof createServerClient>;

let cached: ServerClient | null = null;

export function getServerClient(): ServerClient {
	if (cached) return cached;
	cached = createServerClient();
	return cached;
}
