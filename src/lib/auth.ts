import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
import { oauthProvider } from "@better-auth/oauth-provider";
import { dash } from "@better-auth/infra";
import { getDb, schema } from "@/src/lib/db";

function createAuth() {
	const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
	return betterAuth({
		appName: "sehalsein.com",
		database: drizzleAdapter(getDb(), {
			provider: "pg",
			schema,
		}),
		secret: process.env.BETTER_AUTH_SECRET,
		baseURL,
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
				validAudiences: [baseURL, `${baseURL}/api/mcp`],
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

// Named export for the Better Auth CLI (`pnpm exec better-auth generate`).
export const auth = new Proxy({} as Auth, {
	get(_target, prop) {
		return Reflect.get(getAuth() as object, prop);
	},
});
