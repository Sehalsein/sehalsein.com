import { createFileRoute } from "@tanstack/react-router";
import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { getAuth } from "@/src/lib/auth";

export const Route = createFileRoute("/api/auth/.well-known/openid-configuration")({
	server: {
		handlers: {
			GET: ({ request }) => oauthProviderOpenIdConfigMetadata(getAuth())(request),
		},
	},
});
