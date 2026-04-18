import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
import { oauthProvider } from "@better-auth/oauth-provider";
import { dash } from "@better-auth/infra";
import { getDb, schema } from "@/src/lib/db";

function createAuth() {
	return betterAuth({
		appName: "sehalsein.com",
		database: drizzleAdapter(getDb(), {
			provider: "pg",
			schema,
		}),
		secret: process.env.BETTER_AUTH_SECRET,
		baseURL: process.env.BETTER_AUTH_URL,
		disabledPaths: ["/token"],
		user: {
			additionalFields: {
				githubLogin: { type: "string", required: false },
			},
		},
		advanced: {
			ipAddress: {
				ipAddressHeaders: [
					"x-nf-client-connection-ip",
					"x-forwarded-for",
				],
			},
		},
		socialProviders: {
			github: {
				clientId: process.env.GITHUB_CLIENT_ID ?? "",
				clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
				mapProfileToUser: (profile) => ({
					githubLogin: profile.login,
				}),
			},
		},
		plugins: [
			jwt(),
			oauthProvider({
				loginPage: "/guestbook",
				consentPage: "/consent",
				allowDynamicClientRegistration: true,
				allowUnauthenticatedClientRegistration: true,
			}),
			dash(),
		],
	});
}

export type Auth = ReturnType<typeof createAuth>;

let cached: Auth | null = null;

export function getAuth(): Auth {
	if (cached) return cached;
	cached = createAuth();
	return cached;
}
