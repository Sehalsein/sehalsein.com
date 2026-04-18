import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { mcp } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import { getDb, schema } from "@/src/lib/db";

type Auth = ReturnType<typeof betterAuth>;

let cached: Auth | null = null;

function buildOptions(): BetterAuthOptions {
	return {
		database: drizzleAdapter(getDb(), {
			provider: "pg",
			schema,
		}),
		secret: process.env.BETTER_AUTH_SECRET,
		baseURL: process.env.BETTER_AUTH_URL,
		user: {
			additionalFields: {
				githubLogin: { type: "string", required: false },
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
			mcp({
				loginPage: "/guestbook",
			}),
			dash(),
		],
	};
}

export function getAuth(): Auth {
	if (cached) return cached;
	cached = betterAuth(buildOptions());
	return cached;
}
