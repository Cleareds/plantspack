import {withSentryConfig} from '@sentry/nextjs';
import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },

  // Configure remote image domains for Next.js Image component
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com',
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
      },
      // Common CDNs hosting place imagery scraped from restaurant/hotel websites.
      // Without these entries Next/Image can't optimize → we serve raw bytes
      // (no WebP, no resize, no lazy-hints) which hurts place-page LCP.
      { protocol: 'https', hostname: '**.wp.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.wixstatic.com' },
      { protocol: 'https', hostname: '**.squarespace-cdn.com' },
      { protocol: 'https', hostname: '**.shopifycdn.com' },
      { protocol: 'https', hostname: '**.unsplash.com' },
    ],
    // Use AVIF + WebP where the browser supports it. Roughly halves image
    // bytes vs raw JPEG for typical restaurant hero photos.
    formats: ['image/avif', 'image/webp'],
  },

  // Exclude mobileapp folder from Next.js compilation
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/mobileapp/**'],
    };
    return config;
  },

  async headers() {
    return [
      {
        // Cache static assets (images, fonts, etc.) for 1 year
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache public images for 1 day
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        // Public-read API routes (place/city/content data) — safe to cache briefly
        source: '/api/places/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=10, stale-while-revalidate=59' }],
      },
      {
        source: '/api/cities/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=10, stale-while-revalidate=59' }],
      },
      {
        source: '/api/scores',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=300' }],
      },
      {
        source: '/api/stats',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=300' }],
      },
      {
        source: '/api/supporters',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=300' }],
      },
      {
        source: '/api/posts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=10, stale-while-revalidate=59' }],
      },
      {
        source: '/api/hashtags/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=10, stale-while-revalidate=59' }],
      },
      {
        source: '/api/recipes/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=10, stale-while-revalidate=59' }],
      },
      {
        source: '/api/health',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        // Default: all other /api/* routes are private/user-specific — never cache publicly
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, no-cache, must-revalidate' }],
      },
      {
        // No cache for auth/mutation API routes
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/api/stripe/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        // No cache for admin pages (user-specific)
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // No cache for profile pages (user-specific)
        source: '/profile/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // No cache for auth pages
        source: '/auth/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // Short cache for public pages (10 seconds with stale-while-revalidate)
        // Excludes: api, admin, profile, auth, static assets
        source: '/((?!api|admin|profile|auth|_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=10, stale-while-revalidate=59',
          },
        ],
      },
    ]
  },

  async redirects() {
    return [
      {
        source: '/pricing',
        destination: '/support',
        permanent: true,
      },
      // Consolidate public profile URLs on /profile/
      {
        source: '/user/:username',
        destination: '/profile/:username',
        permanent: true,
      },
      {
        source: '/user/:username/:path*',
        destination: '/profile/:username/:path*',
        permanent: true,
      },

      // ── City name canonicalisation redirects ──────────────────────────────
      // Local-language → English city names. Added 2026-04 when we standardised
      // all city names to English in the DB.

      // Italy
      { source: '/vegan-places/italy/roma', destination: '/vegan-places/italy/rome', permanent: true },
      { source: '/vegan-places/italy/milano', destination: '/vegan-places/italy/milan', permanent: true },
      { source: '/vegan-places/italy/firenze', destination: '/vegan-places/italy/florence', permanent: true },
      { source: '/vegan-places/italy/venezia', destination: '/vegan-places/italy/venice', permanent: true },
      { source: '/vegan-places/italy/napoli', destination: '/vegan-places/italy/naples', permanent: true },
      { source: '/vegan-places/italy/torino', destination: '/vegan-places/italy/turin', permanent: true },

      // Austria
      { source: '/vegan-places/austria/wien', destination: '/vegan-places/austria/vienna', permanent: true },

      // Germany
      { source: '/vegan-places/germany/munchen', destination: '/vegan-places/germany/munich', permanent: true },
      { source: '/vegan-places/germany/m%C3%BCnchen', destination: '/vegan-places/germany/munich', permanent: true },
      { source: '/vegan-places/germany/koln', destination: '/vegan-places/germany/cologne', permanent: true },
      { source: '/vegan-places/germany/k%C3%B6ln', destination: '/vegan-places/germany/cologne', permanent: true },

      // Spain
      { source: '/vegan-places/spain/sevilla', destination: '/vegan-places/spain/seville', permanent: true },

      // Portugal
      { source: '/vegan-places/portugal/lisboa', destination: '/vegan-places/portugal/lisbon', permanent: true },

      // Netherlands
      { source: '/vegan-places/netherlands/den-haag', destination: '/vegan-places/netherlands/the-hague', permanent: true },

      // Belgium
      { source: '/vegan-places/belgium/antwerpen', destination: '/vegan-places/belgium/antwerp', permanent: true },
      { source: '/vegan-places/belgium/gent', destination: '/vegan-places/belgium/ghent', permanent: true },
      { source: '/vegan-places/belgium/brugge', destination: '/vegan-places/belgium/bruges', permanent: true },
      { source: '/vegan-places/belgium/liege', destination: '/vegan-places/belgium/li%C3%A8ge', permanent: true },

      // Switzerland
      { source: '/vegan-places/switzerland/luzern', destination: '/vegan-places/switzerland/lucerne', permanent: true },
      { source: '/vegan-places/switzerland/z%C3%BCrich', destination: '/vegan-places/switzerland/zurich', permanent: true },
      { source: '/vegan-places/switzerland/gen%C3%A8ve', destination: '/vegan-places/switzerland/geneva', permanent: true },

      // Czech Republic
      { source: '/vegan-places/czech-republic/praha', destination: '/vegan-places/czech-republic/prague', permanent: true },

      // Poland
      { source: '/vegan-places/poland/warszawa', destination: '/vegan-places/poland/warsaw', permanent: true },
      { source: '/vegan-places/poland/wroc%C5%82aw', destination: '/vegan-places/poland/wroclaw', permanent: true },
      { source: '/vegan-places/poland/bia%C5%82ystok', destination: '/vegan-places/poland/bialystok', permanent: true },

      // Romania
      { source: '/vegan-places/romania/bucure%C8%99ti', destination: '/vegan-places/romania/bucharest', permanent: true },
      { source: '/vegan-places/romania/constan%C8%9Ba', destination: '/vegan-places/romania/constanta', permanent: true },

      // Turkey
      { source: '/vegan-places/turkey/%C4%B0zmir', destination: '/vegan-places/turkey/izmir', permanent: true },
      { source: '/vegan-places/turkey/kad%C4%B1k%C3%B6y', destination: '/vegan-places/turkey/istanbul', permanent: true },
      { source: '/vegan-places/turkey/ka%C5%9F', destination: '/vegan-places/turkey/kas', permanent: true },

      // Israel
      { source: '/vegan-places/israel/tel-aviv', destination: '/vegan-places/israel/tel-aviv', permanent: false }, // same slug, no-op
      { source: '/vegan-places/israel/beer-sheva', destination: '/vegan-places/israel/beersheba', permanent: true },

      // Ukraine
      { source: '/vegan-places/ukraine/dnipropetrovsk', destination: '/vegan-places/ukraine/dnipro', permanent: true },

      // Vietnam
      { source: '/vegan-places/vietnam/h%C3%A0-n%E1%BB%99i', destination: '/vegan-places/vietnam/hanoi', permanent: true },
      { source: '/vegan-places/vietnam/h%E1%BB%99i-an-ward', destination: '/vegan-places/vietnam/hoi-an', permanent: true },
      { source: '/vegan-places/vietnam/hu%E1%BA%BF', destination: '/vegan-places/vietnam/hue', permanent: true },
      { source: '/vegan-places/vietnam/h%E1%BA%A3i-ph%C3%B2ng', destination: '/vegan-places/vietnam/hai-phong', permanent: true },
      { source: '/vegan-places/vietnam/ph%C3%BA-qu%E1%BB%91c', destination: '/vegan-places/vietnam/phu-quoc', permanent: true },
      { source: '/vegan-places/vietnam/bu%C3%B4n-ma-thu%E1%BB%99t', destination: '/vegan-places/vietnam/buon-ma-thuot', permanent: true },
      { source: '/vegan-places/vietnam/ph%C6%B0%E1%BB%9Dng-m%C5%A9i-n%C3%A9', destination: '/vegan-places/vietnam/mui-ne', permanent: true },
    ]
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "cleareds",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});