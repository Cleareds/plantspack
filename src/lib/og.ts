// Shared default social-share image (Open Graph + Twitter).
//
// Why this exists: Next.js does NOT deep-merge `openGraph` across segments. The
// moment a page sets its own `openGraph: {...}` block, it REPLACES the parent
// (and the file-based src/app/opengraph-image.tsx fallback) wholesale - so any
// page that set openGraph without `images` ended up emitting NO og:image, and
// scrapers (Instagram, Facebook, WhatsApp) fell back to the Organization logo
// in our JSON-LD. Every page that defines a custom openGraph/twitter block must
// therefore set `images` explicitly. Use this constant so they stay consistent.
//
// The 1200x630 banner lives at /public/og-default.png. The relative URL is
// absolutized by `metadataBase` (set in src/app/layout.tsx).
export const OG_DEFAULT_IMAGE = {
  url: '/og-default.png',
  width: 1200,
  height: 630,
  alt: 'Plants Pack - vegan places, city rankings, and free vegan tools',
} as const

// Array form for direct use in metadata `images` fields.
export const OG_DEFAULT_IMAGES = [OG_DEFAULT_IMAGE]
