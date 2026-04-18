import {
	pgTable,
	text,
	timestamp,
	boolean,
	integer,
	uuid,
	primaryKey,
	jsonb,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	githubLogin: text("github_login"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// ── JWT plugin ─────────────────────────────────────────────────────

export const jwks = pgTable("jwks", {
	id: text("id").primaryKey(),
	publicKey: text("public_key").notNull(),
	privateKey: text("private_key").notNull(),
	createdAt: timestamp("created_at").notNull(),
	expiresAt: timestamp("expires_at"),
});

// ── OAuth Provider plugin (@better-auth/oauth-provider) ───────────

export const oauthClient = pgTable("oauth_client", {
	id: text("id").primaryKey(),
	clientId: text("client_id").notNull().unique(),
	clientSecret: text("client_secret"),
	disabled: boolean("disabled").default(false),
	skipConsent: boolean("skip_consent"),
	enableEndSession: boolean("enable_end_session"),
	subjectType: text("subject_type"),
	scopes: text("scopes").array(),
	userId: text("user_id").references(() => user.id),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at"),
	name: text("name"),
	uri: text("uri"),
	icon: text("icon"),
	contacts: text("contacts").array(),
	tos: text("tos"),
	policy: text("policy"),
	softwareId: text("software_id"),
	softwareVersion: text("software_version"),
	softwareStatement: text("software_statement"),
	redirectUris: text("redirect_uris").array().notNull(),
	postLogoutRedirectUris: text("post_logout_redirect_uris").array(),
	tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
	grantTypes: text("grant_types").array(),
	responseTypes: text("response_types").array(),
	public: boolean("public"),
	type: text("type"),
	requirePKCE: boolean("require_pkce"),
	referenceId: text("reference_id"),
	metadata: jsonb("metadata"),
});

export const oauthRefreshToken = pgTable("oauth_refresh_token", {
	id: text("id").primaryKey(),
	token: text("token").notNull(),
	clientId: text("client_id")
		.notNull()
		.references(() => oauthClient.clientId),
	sessionId: text("session_id").references(() => session.id, {
		onDelete: "set null",
	}),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
	referenceId: text("reference_id"),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull(),
	revoked: timestamp("revoked"),
	authTime: timestamp("auth_time"),
	scopes: text("scopes").array().notNull(),
});

export const oauthAccessToken = pgTable("oauth_access_token", {
	id: text("id").primaryKey(),
	token: text("token").unique(),
	clientId: text("client_id")
		.notNull()
		.references(() => oauthClient.clientId),
	sessionId: text("session_id").references(() => session.id, {
		onDelete: "set null",
	}),
	userId: text("user_id").references(() => user.id),
	referenceId: text("reference_id"),
	refreshId: text("refresh_id").references(() => oauthRefreshToken.id),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull(),
	scopes: text("scopes").array().notNull(),
});

export const oauthConsent = pgTable("oauth_consent", {
	id: text("id").primaryKey(),
	clientId: text("client_id")
		.notNull()
		.references(() => oauthClient.clientId),
	userId: text("user_id").references(() => user.id),
	referenceId: text("reference_id"),
	scopes: text("scopes").array().notNull(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

// ── App-specific tables ────────────────────────────────────────────

export const guestbookEntry = pgTable("guestbook_entry", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	githubLogin: text("github_login").notNull(),
	avatarUrl: text("avatar_url").notNull(),
	message: text("message").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rateLimitBucket = pgTable(
	"rate_limit_bucket",
	{
		key: text("key").notNull(),
		windowStart: timestamp("window_start").notNull(),
		count: integer("count").notNull().default(0),
	},
	(t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);
