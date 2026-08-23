import { createFileRoute } from "@tanstack/react-router";
import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { getAuth } from "@/src/lib/auth";

export const Route = createFileRoute("/.well-known/oauth-authorization-server/api/auth")({
	server: {
		handlers: {
			GET: ({ request }) => oauthProviderAuthServerMetadata(getAuth())(request),
		},
	},
});
