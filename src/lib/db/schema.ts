import {
	pgTable,
	text,
	timestamp,
	boolean,
	integer,
	uuid,
	primaryKey,
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

// ── OIDC Provider (for Better Auth mcp plugin) ────────────────────

export const oauthApplication = pgTable("oauth_application", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	icon: text("icon"),
	metadata: text("metadata"),
	clientId: text("client_id").notNull().unique(),
	clientSecret: text("client_secret"),
	redirectUrls: text("redirect_urls").notNull(),
	type: text("type").notNull(),
	disabled: boolean("disabled").default(false),
	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const oauthAccessToken = pgTable("oauth_access_token", {
	id: text("id").primaryKey(),
	accessToken: text("access_token").notNull().unique(),
	refreshToken: text("refresh_token").notNull().unique(),
	accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),
	clientId: text("client_id").references(() => oauthApplication.clientId, {
		onDelete: "cascade",
	}),
	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
	scopes: text("scopes").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const oauthConsent = pgTable("oauth_consent", {
	id: text("id").primaryKey(),
	clientId: text("client_id").references(() => oauthApplication.clientId, {
		onDelete: "cascade",
	}),
	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
	scopes: text("scopes").notNull(),
	consentGiven: boolean("consent_given").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
