// Required OpenID config at the issuer path (= /api/auth).
// Next.js static routes take precedence over the /api/auth/[...all] catch-all.
import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { auth } from "@/src/lib/auth";

export const runtime = "nodejs";

export const GET = oauthProviderOpenIdConfigMetadata(auth);
