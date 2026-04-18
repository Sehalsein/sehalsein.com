"use client";

import { createAuthClient } from "better-auth/react";
import { sentinelClient } from "@better-auth/infra/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_BASE_URL || "",
	plugins: [sentinelClient(), oauthProviderClient()],
});

export const { signIn, signOut, useSession } = authClient;
