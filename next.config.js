/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playground engine (folio-derived) build-time flags. Ported from the engine's
  // old Vite VITE_* vars to NEXT_PUBLIC_*. MINIMAL = the stripped /playground build.
  env: {
    NEXT_PUBLIC_MINIMAL: 'true',
    NEXT_PUBLIC_DAY_CYCLE_PROGRESS: '0.05',
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ]
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
}

module.exports = nextConfig
