import { createAdminClient } from '@/lib/supabase-admin'

// RSS 2.0 feed of public blog articles. Lets aggregators (Feedly,
// Inoreader), vegan blog directories, Mastodon feed bots, and any third
// party that wants to syndicate pull a current list. Cheap to render
// (single query, cached at the edge).
//
// Cached for 1 hour. Aggregators poll on their own schedule; no need to
// regenerate per request.
export const revalidate = 3600

const SITE = 'https://www.plantspack.com'

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const sb = createAdminClient()
  const { data: posts } = await sb
    .from('posts')
    .select('id, slug, title, content, image_url, images, created_at, updated_at, tags, users!inner(username, first_name, last_name)')
    .eq('category', 'article')
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = (posts || []).map((p: any) => {
    const url = `${SITE}/blog/${p.slug || p.id}`
    const title = p.title || (p.content || '').slice(0, 80)
    const description = (p.content || '').replace(/\s+/g, ' ').slice(0, 500)
    const author = p.users?.first_name
      ? `${p.users.first_name} ${p.users.last_name || ''}`.trim()
      : `@${p.users?.username || 'plantspack'}`
    const image = p.image_url || p.images?.[0] || null
    const pubDate = new Date(p.created_at).toUTCString()
    const tags = Array.isArray(p.tags) ? p.tags : []

    return `
    <item>
      <title>${escape(title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escape(description)}</description>
      <dc:creator>${escape(author)}</dc:creator>
      ${image ? `<enclosure url="${escape(image)}" type="image/jpeg" />` : ''}
      ${tags.map((t: string) => `<category>${escape(t)}</category>`).join('\n      ')}
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PlantsPack — Vegan places, ranked by the community</title>
    <link>${SITE}</link>
    <description>Country-by-country audits of fully vegan venues, plus reflections on building a free vegan discovery directory.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE}/icon-512.png</url>
      <title>PlantsPack</title>
      <link>${SITE}</link>
    </image>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
