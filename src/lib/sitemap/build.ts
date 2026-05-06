/**
 * Sitemap builders — shared between the three /sitemap/*.xml route handlers.
 *
 * We bailed on Next.js `generateSitemaps()` because its execution model
 * (static-by-default, quirky interaction with `dynamic` + `revalidate`)
 * produced empty-urlset sitemaps in prod even when env vars and queries
 * resolved cleanly. Plain Route Handlers give full control: we fetch at
 * request time, build XML ourselves, and set explicit cache headers.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { slugifyCityOrCountry } from '@/lib/places/slugify'

const SITE_URL = 'https://plantspack.com'

export type SegmentId = 'priority' | 'content' | 'thin'

export interface PlaceRow {
  slug: string | null
  city: string | null
  country: string | null
  description: string | null
  images: string[] | null
  main_image_url: string | null
  review_count: number | null
  vegan_level: string | null
  opening_hours: string | Record<string, string> | null
  updated_at: string | null
  created_at: string | null
  website?: string | null
}

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('[sitemap] Missing Supabase env at request time')
  return createClient(url, key)
}

async function fetchAll<T>(
  sb: SupabaseClient,
  table: string,
  select: string,
  filters?: (q: any) => any,
): Promise<T[]> {
  let countQuery: any = sb.from(table).select('id', { count: 'exact', head: true })
  if (filters) countQuery = filters(countQuery)
  const { count, error: countErr } = await countQuery
  if (countErr) {
    console.error(`[sitemap] count failed for ${table}:`, countErr.message)
    return []
  }
  const total = count ?? 0
  if (total === 0) return []

  const batchSize = 1000
  const pages = Math.ceil(total / batchSize)
  const concurrency = 10
  const out: T[] = new Array(total)

  for (let start = 0; start < pages; start += concurrency) {
    const batch = Array.from({ length: Math.min(concurrency, pages - start) }, (_, i) => start + i)
    const results = await Promise.all(
      batch.map(async (pageIdx) => {
        const from = pageIdx * batchSize
        const to = Math.min(from + batchSize - 1, total - 1)
        let q: any = sb.from(table).select(select).range(from, to)
        if (filters) q = filters(q)
        const { data, error } = await q
        if (error) {
          console.error(`[sitemap] page fetch failed for ${table} ${from}-${to}:`, error.message)
          return { from, rows: [] as T[] }
        }
        return { from, rows: (data || []) as T[] }
      }),
    )
    for (const { from, rows } of results) {
      for (let i = 0; i < rows.length; i++) out[from + i] = rows[i]
    }
  }
  return out.filter(Boolean)
}

function isValidImageUrl(u: string | null | undefined): u is string {
  return typeof u === 'string' && /^https?:\/\/[^\s<>"'\\]+$/i.test(u)
}

function collectImageUrls(p: PlaceRow): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  if (isValidImageUrl(p.main_image_url)) {
    seen.add(p.main_image_url)
    out.push(p.main_image_url)
  }
  if (Array.isArray(p.images)) {
    for (const u of p.images) {
      if (isValidImageUrl(u) && !seen.has(u)) {
        seen.add(u)
        out.push(u)
        if (out.length >= 5) break
      }
    }
  }
  return out
}

function placeTier(p: PlaceRow): SegmentId {
  const hasDescription = !!(p.description && p.description.trim().length >= 50)
  const hasImage = !!(p.main_image_url || (p.images && p.images.length > 0))
  const hasReview = (p.review_count || 0) > 0
  const isFullyVegan = p.vegan_level === 'fully_vegan'
  const isMostlyVegan = p.vegan_level === 'mostly_vegan'
  const hasWebsite = !!p.website
  const hasHours =
    !!p.opening_hours &&
    (typeof p.opening_hours === 'string'
      ? p.opening_hours.trim().length > 0
      : Object.keys(p.opening_hours).length > 0)
  if (hasDescription && hasImage && (hasReview || isFullyVegan)) return 'priority'
  // Mirror the per-page noindex predicate so the sitemap never advertises
  // URLs the page tells Google not to index. Vegan-tier (fully/mostly) is
  // always at least 'content' — it's a rare, high-value signal even with
  // no description.
  if (isFullyVegan || isMostlyVegan || hasDescription || hasImage || hasReview || hasHours || hasWebsite) return 'content'
  return 'thin'
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

interface SitemapEntry {
  url: string
  lastModified?: string
  changeFreq?: string
  priority?: number
  images?: string[]
}

function renderUrlEntry(e: SitemapEntry): string {
  const parts: string[] = [`  <url>`, `    <loc>${xmlEscape(e.url)}</loc>`]
  if (e.lastModified) parts.push(`    <lastmod>${xmlEscape(e.lastModified)}</lastmod>`)
  if (e.changeFreq) parts.push(`    <changefreq>${e.changeFreq}</changefreq>`)
  if (e.priority !== undefined) parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`)
  if (e.images && e.images.length > 0) {
    for (const img of e.images) {
      parts.push(`    <image:image><image:loc>${xmlEscape(img)}</image:loc></image:image>`)
    }
  }
  parts.push(`  </url>`)
  return parts.join('\n')
}

export async function buildSitemap(id: SegmentId): Promise<string> {
  console.log(`[sitemap ${id}] START`)
  const sb = getSupabase()

  const [places, posts, packs] = await Promise.all([
    fetchAll<PlaceRow>(
      sb,
      'places',
      'slug, city, country, description, images, main_image_url, review_count, vegan_level, opening_hours, website, updated_at, created_at',
      (q) => q.is('archived_at', null),
    ),
    fetchAll<any>(
      sb,
      'posts',
      'slug, category, created_at, updated_at',
      (q) => q.eq('privacy', 'public').is('deleted_at', null).in('category', ['recipe', 'event', 'article']),
    ),
    fetchAll<any>(
      sb,
      'packs',
      'slug, updated_at, created_at',
      (q) => q.eq('is_published', true),
    ),
  ])

  console.log(`[sitemap ${id}] fetched places=${places.length} posts=${posts.length} packs=${packs.length}`)

  const byTier: Record<SegmentId, PlaceRow[]> = { priority: [], content: [], thin: [] }
  for (const p of places) {
    if (!p.slug) continue
    byTier[placeTier(p)].push(p)
  }

  const entries: SitemapEntry[] = []

  if (id === 'priority') {
    entries.push(
      { url: SITE_URL, changeFreq: 'daily', priority: 1.0 },
      { url: `${SITE_URL}/map`, changeFreq: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/vegan-places`, changeFreq: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/recipes`, changeFreq: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/events`, changeFreq: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/packs`, changeFreq: 'daily', priority: 0.8 },
      { url: `${SITE_URL}/city-ranks`, changeFreq: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/blog`, changeFreq: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/support`, changeFreq: 'monthly', priority: 0.5 },
      { url: `${SITE_URL}/about`, changeFreq: 'monthly', priority: 0.5 },
      { url: `${SITE_URL}/contact`, changeFreq: 'yearly', priority: 0.3 },
    )

    // Blog articles — high-priority evergreen content, sitemap-priority tier.
    for (const post of posts) {
      if (post.category !== 'article' || !post.slug) continue
      entries.push({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.updated_at || post.created_at,
        changeFreq: 'weekly',
        priority: 0.9,
      })
    }

    const countries = new Set<string>()
    const cityCountry = new Set<string>()
    // Track place counts per (country, city) so we can skip thin city pages
    // (<5 places). The city page noindexes itself when below the threshold;
    // we mirror that here to keep the sitemap and the per-page directive in
    // agreement.
    const cityCountryCounts = new Map<string, number>()
    for (const p of places) {
      if (!p.country) continue
      const cs = slugifyCityOrCountry(p.country)
      if (!cs) continue
      countries.add(cs)
      if (p.city) {
        const ct = slugifyCityOrCountry(p.city)
        if (ct) {
          const k = `${cs}/${ct}`
          cityCountry.add(k)
          cityCountryCounts.set(k, (cityCountryCounts.get(k) ?? 0) + 1)
        }
      }
    }
    for (const country of countries) {
      entries.push({ url: `${SITE_URL}/vegan-places/${country}`, changeFreq: 'daily', priority: 0.85 })
    }
    for (const cc of cityCountry) {
      if ((cityCountryCounts.get(cc) ?? 0) < 5) continue
      entries.push({ url: `${SITE_URL}/vegan-places/${cc}`, changeFreq: 'daily', priority: 0.9 })
    }
    // Region landing pages (Belgium today; generic for any seeded country).
    const { data: regionRows } = await sb
      .from('country_regions')
      .select('country_slug, region_slug')
    for (const r of regionRows || []) {
      entries.push({
        url: `${SITE_URL}/vegan-places/${r.country_slug}/region/${r.region_slug}`,
        changeFreq: 'weekly',
        priority: 0.85,
      })
    }
    for (const p of byTier.priority) {
      const imgs = collectImageUrls(p)
      entries.push({
        url: `${SITE_URL}/place/${p.slug}`,
        lastModified: p.updated_at || p.created_at || undefined,
        changeFreq: 'weekly',
        priority: 0.8,
        ...(imgs.length > 0 ? { images: imgs } : {}),
      })
    }
  } else if (id === 'content') {
    for (const post of posts) {
      if (!post.slug) continue
      // Articles are already in the priority tier; skip here to avoid dupes.
      if (post.category === 'article') continue
      const prefix = post.category === 'recipe' ? 'recipe' : 'event'
      entries.push({
        url: `${SITE_URL}/${prefix}/${post.slug}`,
        lastModified: post.updated_at || post.created_at,
        changeFreq: 'weekly',
        priority: 0.7,
      })
    }
    for (const pack of packs) {
      if (!pack.slug) continue
      entries.push({
        url: `${SITE_URL}/packs/${pack.slug}`,
        lastModified: pack.updated_at || pack.created_at,
        changeFreq: 'weekly',
        priority: 0.6,
      })
    }
    for (const p of byTier.content) {
      const imgs = collectImageUrls(p)
      entries.push({
        url: `${SITE_URL}/place/${p.slug}`,
        lastModified: p.updated_at || p.created_at || undefined,
        changeFreq: 'weekly',
        priority: 0.6,
        ...(imgs.length > 0 ? { images: imgs } : {}),
      })
    }
  } else {
    // Thin tier intentionally emits no place URLs. These pages carry
    // <meta robots="noindex"> at the page level, so listing them in a
    // sitemap would only contradict that signal. Kept as an empty
    // sitemap so the sitemap index URL remains stable.
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    entries.map(renderUrlEntry).join('\n') +
    `\n</urlset>\n`

  console.log(`[sitemap ${id}] DONE — ${entries.length} entries`)
  return body
}

export function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
