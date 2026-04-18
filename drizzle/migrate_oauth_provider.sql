-- Migration: replace Better Auth mcp plugin tables with oauth-provider + jwt plugin tables.
-- Safe because the old oauth_application/oauth_access_token/oauth_consent tables are empty.

DROP TABLE IF EXISTS "oauth_consent" CASCADE;
DROP TABLE IF EXISTS "oauth_access_token" CASCADE;
DROP TABLE IF EXISTS "oauth_application" CASCADE;

CREATE TABLE IF NOT EXISTS "jwks" (
  "id" text PRIMARY KEY,
  "public_key" text NOT NULL,
  "private_key" text NOT NULL,
  "created_at" timestamp NOT NULL,
  "expires_at" timestamp
);

CREATE TABLE IF NOT EXISTS "oauth_client" (
  "id" text PRIMARY KEY,
  "client_id" text NOT NULL UNIQUE,
  "client_secret" text,
  "disabled" boolean DEFAULT false,
  "skip_consent" boolean,
  "enable_end_session" boolean,
  "subject_type" text,
  "scopes" text[],
  "user_id" text REFERENCES "user"("id"),
  "created_at" timestamp,
  "updated_at" timestamp,
  "name" text,
  "uri" text,
  "icon" text,
  "contacts" text[],
  "tos" text,
  "policy" text,
  "software_id" text,
  "software_version" text,
  "software_statement" text,
  "redirect_uris" text[] NOT NULL,
  "post_logout_redirect_uris" text[],
  "token_endpoint_auth_method" text,
  "grant_types" text[],
  "response_types" text[],
  "public" boolean,
  "type" text,
  "require_pkce" boolean,
  "reference_id" text,
  "metadata" jsonb
);

CREATE TABLE IF NOT EXISTS "oauth_refresh_token" (
  "id" text PRIMARY KEY,
  "token" text NOT NULL,
  "client_id" text NOT NULL REFERENCES "oauth_client"("client_id"),
  "session_id" text REFERENCES "session"("id") ON DELETE SET NULL,
  "user_id" text NOT NULL REFERENCES "user"("id"),
  "reference_id" text,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL,
  "revoked" timestamp,
  "auth_time" timestamp,
  "scopes" text[] NOT NULL
);

CREATE TABLE IF NOT EXISTS "oauth_access_token" (
  "id" text PRIMARY KEY,
  "token" text UNIQUE,
  "client_id" text NOT NULL REFERENCES "oauth_client"("client_id"),
  "session_id" text REFERENCES "session"("id") ON DELETE SET NULL,
  "user_id" text REFERENCES "user"("id"),
  "reference_id" text,
  "refresh_id" text REFERENCES "oauth_refresh_token"("id"),
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL,
  "scopes" text[] NOT NULL
);

CREATE TABLE IF NOT EXISTS "oauth_consent" (
  "id" text PRIMARY KEY,
  "client_id" text NOT NULL REFERENCES "oauth_client"("client_id"),
  "user_id" text REFERENCES "user"("id"),
  "reference_id" text,
  "scopes" text[] NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);
