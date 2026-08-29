# sehalsein.com

Sehal Sein's portfolio and browser lab, built with TanStack Start and deployed
as a Cloudflare Worker.

## Development

```bash
bun install
bun run dev
```

The app uses TanStack Router's generated file routes in `src/routes`. The
homepage, résumé, and `/now` are server-rendered; canvas-heavy experiences opt
out of SSR and load their engines only in the browser.

Useful commands:

```bash
bun run build       # Cloudflare production bundle + TypeScript
bun run preview     # run the bundle locally in workerd
bun test            # unit tests
bun run cf-typegen  # regenerate Cloudflare binding types
bun run deploy      # build and deploy with Wrangler
```

## Environment

Server features read their secrets at request time so they work in the
Cloudflare Workers runtime. Configure the integrations you use:

- `DATABASE_URL`
- `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_TOKEN`
- `OPEN_ROUTER_KEY`
- `BRAINTRUST_API_KEY`
- `ELEVENLABS_API_KEY` and optional `ELEVENLABS_VOICE_ID`
- `VITE_PUBLIC_POSTHOG_KEY` and optional `VITE_PUBLIC_BASE_URL`

For a production Worker, add secrets with `wrangler secret put <NAME>` and set
public build variables in the Cloudflare build environment.

## Cloudflare deployments

Cloudflare Workers Builds is connected directly to GitHub. Pushes to `main`
deploy the `sehalsein-com` Worker; non-production branches upload preview
versions with stable branch aliases and Cloudflare comments their URLs on pull
requests. GitHub Actions is not used for deployment.

Configure the following in both Cloudflare's **production** and **preview**
build environments:

- Secrets: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_SECRET`,
  `GITHUB_TOKEN`, and `OPEN_ROUTER_KEY`
- Variables: `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, and `ADMIN_USER_NAME`
- Optional variable: `VITE_PUBLIC_POSTHOG_KEY`

Use `bun run db:migrate && bun run build` as the build command. Use the following
commands for deployment:

- Production: `node ./node_modules/wrangler/bin/wrangler.js deploy --config dist/server/wrangler.json`
- Preview: `node ./node_modules/wrangler/bin/wrangler.js versions upload --config dist/server/wrangler.json`

Both environments use the same Cloudflare-managed variables and encrypted
Worker secrets, including the existing Neon production connection.

GitHub OAuth only works on a preview whose callback URL is registered in the
GitHub OAuth app; normal portfolio and API previewing does not depend on that
callback.
