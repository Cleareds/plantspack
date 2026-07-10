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
import { log } from '@/lib/logger'

const SITE_URL = 'https://www.plantspack.com'

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

// Date-only lastmod (YYYY-MM-DD). Google reads lastmod only when it's
// honest — these all come from real DB timestamps, never now(). Day
// granularity is enough for crawl scheduling and keeps the XML small.
function isoDate(ts: string | null | undefined): string | undefined {
  return ts ? ts.slice(0, 10) : undefined
}

interface SitemapEntry {
  url: string
  lastModified?: string
  images?: string[]
}

function renderUrlEntry(e: SitemapEntry): string {
  const parts: string[] = [`  <url>`, `    <loc>${xmlEscape(e.url)}</loc>`]
  if (e.lastModified) parts.push(`    <lastmod>${xmlEscape(e.lastModified)}</lastmod>`)
  if (e.images && e.images.length > 0) {
    for (const img of e.images) {
      parts.push(`    <image:image><image:loc>${xmlEscape(img)}</image:loc></image:image>`)
    }
  }
  parts.push(`  </url>`)
  return parts.join('\n')
}

export async function buildSitemap(id: SegmentId): Promise<string> {
  log.debug(`[sitemap ${id}] START`)
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
      'slug, category, created_at, updated_at, event_data',
      (q) => q.eq('privacy', 'public').is('deleted_at', null).in('category', ['recipe', 'event', 'article']),
    ),
    fetchAll<any>(
      sb,
      'packs',
      'slug, updated_at, created_at',
      (q) => q.eq('is_published', true),
    ),
  ])

  log.debug(`[sitemap ${id}] fetched places=${places.length} posts=${posts.length} packs=${packs.length}`)

  const byTier: Record<SegmentId, PlaceRow[]> = { priority: [], content: [], thin: [] }
  for (const p of places) {
    if (!p.slug) continue
    byTier[placeTier(p)].push(p)
  }

  const entries: SitemapEntry[] = []

  if (id === 'priority') {
    // Google ignores changefreq/priority (lastmod is the only freshness
    // field it reads, and only when it's honest) — so static URLs carry
    // just <loc>, and dated content carries <loc> + a real <lastmod>.
    entries.push(
      { url: SITE_URL },
      { url: `${SITE_URL}/map` },
      { url: `${SITE_URL}/vegan-places` },
      { url: `${SITE_URL}/vegan-summer-destinations` },
      { url: `${SITE_URL}/recipes` },
      { url: `${SITE_URL}/events` },
      { url: `${SITE_URL}/packs` },
      { url: `${SITE_URL}/city-ranks` },
      { url: `${SITE_URL}/blog` },
      { url: `${SITE_URL}/support` },
      { url: `${SITE_URL}/about` },
      { url: `${SITE_URL}/contact` },
    )

    // Blog articles — high-priority evergreen content, sitemap-priority tier.
    for (const post of posts) {
      if (post.category !== 'article' || !post.slug) continue
      entries.push({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: isoDate(post.updated_at || post.created_at),
      })
    }

    const countries = new Set<string>()
    const cityCountry = new Set<string>()
    // Track place counts per (country, city) so we can skip thin city pages
    // (<5 places). The city page noindexes itself when below the threshold;
    // we mirror that here to keep the sitemap and the per-page directive in
    // agreement.
    const cityCountryCounts = new Map<string, number>()
    // Track total places per country so we can skip thin country hubs
    // (<5 places). Mirrors the city <5 rule and the country page's own
    // noindex directive — a 1-4 place country hub is too thin to earn
    // rankings and was padding "Discovered – currently not indexed".
    const countryCounts = new Map<string, number>()
    // Track fully_vegan counts per country and per city so we only emit
    // /fully-vegan URLs when there's at least one verified FV venue.
    const countryFvCounts = new Map<string, number>()
    const cityFvCounts = new Map<string, number>()
    // Honest per-hub lastmod: the newest place updated_at/created_at in the
    // country/city (separately for the FV subset, since /fully-vegan only
    // changes when an FV place does). Date-only granularity — enough for
    // crawl scheduling, and stable across regenerations. Supabase returns
    // uniform ISO +00:00 timestamps, so string max is a correct max.
    const countryMax = new Map<string, string>()
    const cityMax = new Map<string, string>()
    const countryFvMax = new Map<string, string>()
    const cityFvMax = new Map<string, string>()
    const bump = (m: Map<string, string>, k: string, ts: string) => {
      if (ts > (m.get(k) || '')) m.set(k, ts)
    }
    for (const p of places) {
      if (!p.country) continue
      const cs = slugifyCityOrCountry(p.country)
      if (!cs) continue
      countries.add(cs)
      countryCounts.set(cs, (countryCounts.get(cs) ?? 0) + 1)
      const isFv = p.vegan_level === 'fully_vegan'
      if (isFv) countryFvCounts.set(cs, (countryFvCounts.get(cs) ?? 0) + 1)
      const ts = (p.updated_at || p.created_at || '').slice(0, 10)
      if (ts) {
        bump(countryMax, cs, ts)
        if (isFv) bump(countryFvMax, cs, ts)
      }
      if (p.city) {
        const ct = slugifyCityOrCountry(p.city)
        if (ct) {
          const k = `${cs}/${ct}`
          cityCountry.add(k)
          cityCountryCounts.set(k, (cityCountryCounts.get(k) ?? 0) + 1)
          if (isFv) cityFvCounts.set(k, (cityFvCounts.get(k) ?? 0) + 1)
          if (ts) {
            bump(cityMax, k, ts)
            if (isFv) bump(cityFvMax, k, ts)
          }
        }
      }
    }
    for (const country of countries) {
      // Skip thin country hubs (<5 places) — they self-noindex at the page
      // level, so advertising them in the sitemap only contradicts that.
      if ((countryCounts.get(country) ?? 0) < 5) continue
      entries.push({ url: `${SITE_URL}/vegan-places/${country}`, lastModified: countryMax.get(country) })
      // The /fully-vegan country page noindexes itself when there are <5
      // fully-vegan venues (a 2-venue "list" is thin), so only advertise it
      // once it clears that floor — keeps the sitemap and page in agreement.
      if ((countryFvCounts.get(country) ?? 0) >= 5) {
        entries.push({ url: `${SITE_URL}/vegan-places/${country}/fully-vegan`, lastModified: countryFvMax.get(country) })
      }
    }
    for (const cc of cityCountry) {
      if ((cityCountryCounts.get(cc) ?? 0) < 5) continue
      entries.push({ url: `${SITE_URL}/vegan-places/${cc}`, lastModified: cityMax.get(cc) })
      if ((cityFvCounts.get(cc) ?? 0) > 0) {
        entries.push({ url: `${SITE_URL}/vegan-places/${cc}/fully-vegan`, lastModified: cityFvMax.get(cc) })
      }
    }
    // Region landing pages (Belgium today; generic for any seeded country).
    const { data: regionRows } = await sb
      .from('country_regions')
      .select('country_slug, region_slug')
    for (const r of regionRows || []) {
      entries.push({
        url: `${SITE_URL}/vegan-places/${r.country_slug}/region/${r.region_slug}`,
      })
    }
    for (const p of byTier.priority) {
      const imgs = collectImageUrls(p)
      entries.push({
        url: `${SITE_URL}/place/${p.slug}`,
        lastModified: isoDate(p.updated_at || p.created_at),
        ...(imgs.length > 0 ? { images: imgs } : {}),
      })
    }
  } else if (id === 'content') {
    const eventCountrySlugs = new Set<string>()
    for (const post of posts) {
      if (!post.slug) continue
      // Articles are already in the priority tier; skip here to avoid dupes.
      if (post.category === 'article') continue
      if (post.category === 'event') {
        const ed = post.event_data || {}
        // Mirror the page-level noindex: drop events that ended >21 days ago so
        // the sitemap doesn't advertise stale events Google won't surface.
        const endIso = ed.end_time || ed.start_time
        if (endIso && Date.now() - new Date(endIso).getTime() > 21 * 864e5) continue
        if (ed.country) { const cs = slugifyCityOrCountry(ed.country); if (cs) eventCountrySlugs.add(cs) }
        entries.push({
          url: `${SITE_URL}/event/${post.slug}`,
          lastModified: isoDate(post.updated_at || post.created_at),
        })
        continue
      }
      // recipe
      entries.push({
        url: `${SITE_URL}/recipe/${post.slug}`,
        lastModified: isoDate(post.updated_at || post.created_at),
      })
    }
    // Country event hubs (/events/[country]) — one per country with upcoming events.
    for (const cs of eventCountrySlugs) {
      entries.push({ url: `${SITE_URL}/events/${cs}` })
    }
    for (const pack of packs) {
      if (!pack.slug) continue
      entries.push({
        url: `${SITE_URL}/packs/${pack.slug}`,
        lastModified: isoDate(pack.updated_at || pack.created_at),
      })
    }
    for (const p of byTier.content) {
      const imgs = collectImageUrls(p)
      entries.push({
        url: `${SITE_URL}/place/${p.slug}`,
        lastModified: isoDate(p.updated_at || p.created_at),
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

  log.debug(`[sitemap ${id}] DONE — ${entries.length} entries`)
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
