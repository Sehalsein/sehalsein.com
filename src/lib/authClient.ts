"use client";

import { createAuthClient } from "better-auth/react";
import { sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_BASE_URL || "",
	plugins: [sentinelClient()],
});

export const { signIn, signOut, useSession } = authClient;
