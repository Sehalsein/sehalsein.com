# sehalsein.com

Sehal Sein's portfolio and browser lab, built with TanStack Start and deployed
as a Cloudflare Worker.

## Development

```bash
pnpm install
pnpm dev
```

The app uses TanStack Router's generated file routes in `src/routes`. The
homepage, résumé, and `/now` are server-rendered; canvas-heavy experiences opt
out of SSR and load their engines only in the browser.

Useful commands:

```bash
pnpm build       # Cloudflare production bundle + TypeScript
pnpm preview     # run the bundle locally in workerd
pnpm test        # unit tests
pnpm cf-typegen  # regenerate Cloudflare binding types
pnpm deploy      # build and deploy with Wrangler
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
