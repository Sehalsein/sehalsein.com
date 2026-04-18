import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { getAuth } from "@/src/lib/auth";

export const runtime = "nodejs";

export const GET = oauthProviderAuthServerMetadata(getAuth());
