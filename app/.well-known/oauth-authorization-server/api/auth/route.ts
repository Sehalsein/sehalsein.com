import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { auth } from "@/src/lib/auth";

export const runtime = "nodejs";

export const GET = oauthProviderAuthServerMetadata(auth);
