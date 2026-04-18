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
		logger: {
			level: "debug",
			log: (level, message, ...args) => {
				// Surface in Netlify/Vercel function logs.
				// eslint-disable-next-line no-console
				console[level === "debug" ? "log" : level](
					`[better-auth:${level}]`,
					message,
					...args,
				);
			},
		},
		onAPIError: {
			throw: false,
			onError: (error) => {
				// eslint-disable-next-line no-console
				console.error(
					"[better-auth:onAPIError]",
					error instanceof Error
						? { message: error.message, stack: error.stack }
						: error,
				);
			},
		},
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

// Named export for the Better Auth CLI (`pnpm exec @better-auth/cli generate`).
// The CLI statically imports this file, so it must be a concrete `auth` value
// (not a function). Evaluated lazily at first access via the getter pattern.
export const auth = new Proxy({} as Auth, {
	get(_target, prop) {
		return Reflect.get(getAuth() as object, prop);
	},
});
