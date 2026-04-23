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

const SITE_URL = 'https://plantspack.com'
const SEGMENTS = ['priority', 'content', 'thin'] as const

export function GET() {
  const now = new Date().toISOString()
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SEGMENTS.map(
    id => `  <sitemap>
    <loc>${SITE_URL}/sitemap/${id}.xml</loc>
    <lastmod>${now}</lastmod>
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
