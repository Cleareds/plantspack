/**
 * Sitemap index at /sitemap.xml.
 *
 * Next.js `generateSitemaps()` in src/app/sitemap.ts produces the three
 * segments at /sitemap/priority.xml, /sitemap/content.xml, /sitemap/thin.xml
 * — but it does NOT auto-generate a top-level index that ties them
 * together. Without an index, Google can only discover segments we submit
 * manually in GSC, and robots.txt `Sitemap:` directives pointing at
 * /sitemap.xml return 404.
 *
 * This route fills that gap: returns a standard sitemapindex XML that
 * lists all segments. Google fetches this, then fetches each child in turn.
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
