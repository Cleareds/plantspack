// /sitemap/thin.xml — retired 2026-05-11.
//
// After the main_image_url backfill, every active place has at least
// one signal (image, description, hours, vegan-level, etc.) and so
// qualifies as 'content' or 'priority'. The thin segment was rendering
// with zero <url> entries, which Google Search Console flagged as
// "missing required url tag". Removed from the sitemap index and
// robots.txt; this route returns 410 Gone so cached crawlers drop it
// from their index rather than re-fetching as a broken file.

export const dynamic = 'force-dynamic'

export function GET() {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<!-- /sitemap/thin.xml retired 2026-05-11. See /sitemap-index.xml for active sitemaps. -->\n`,
    {
      status: 410,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    },
  )
}
