/**
 * Manual sitemap index at /sitemap-index.xml.
 *
 * Next.js `generateSitemaps()` in src/app/sitemap.ts produces the three
 * segments at /sitemap/priority.xml, /sitemap/content.xml, /sitemap/thin.xml
 * but it does NOT auto-generate a top-level index and /sitemap.xml is
 * reserved (returns 404). We publish the index at a non-reserved path so
 * GSC and crawlers have one URL that covers everything.
 *
 * robots.txt points at this path as the primary Sitemap: directive, plus
 * each segment individually as a belt-and-braces fallback.
 */

const SITE_URL = 'https://www.plantspack.com'
// The 'thin' segment was retired 2026-05-11. After the main_image_url
// backfill, every active place qualifies as at least 'content', so the
// thin sitemap was rendering with zero <url> entries and triggering
// "missing required url tag" errors in Google Search Console. The
// route at /sitemap/thin.xml now returns 410 Gone for legacy crawlers.
const SEGMENTS = ['priority', 'content', 'dishes'] as const

export function GET() {
  // No lastmod on the index entries: stamping request-time meant "everything
  // changed right now" on every fetch, which is the fake-freshness pattern
  // Google learns to ignore. The real freshness signal is the per-URL
  // lastmod inside each segment (from DB timestamps, 2026-07-10).
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SEGMENTS.map(
    id => `  <sitemap>
    <loc>${SITE_URL}/sitemap/${id}.xml</loc>
  </sitemap>`,
  ).join('\n')}
</sitemapindex>
`
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
