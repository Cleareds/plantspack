import { MetadataRoute } from 'next'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { slugifyCityOrCountry } from '@/lib/places/slugify'

const SITE_URL = 'https://plantspack.com'

// Force runtime execution. Default sitemap.ts behaviour is static (build-time),
// which on Vercel does NOT have SUPABASE_SERVICE_ROLE_KEY available — the
// module-level createClient() call ended up with empty strings and every
// query returned an empty array, producing empty-urlset sitemaps in prod.
export const dynamic = 'force-dynamic'
export const revalidate = 3600 // still allow the CDN to cache for 1 hour

// Lazy-init inside the function so env vars are read at request time.
function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('[sitemap] Missing Supabase env vars at request time')
  }
  return createClient(url, key)
}

/**
 * Why tier the sitemap:
 *
 * GSC reports ~40K place pages stuck in "Discovered – currently not indexed"
 * — Google is crawl-budget-throttling on a young domain with many URLs. The
 * fix is to guide Googlebot to the highest-value pages first by splitting
 * the sitemap into small, topic-focused segments. Small sitemaps get
 * re-crawled more frequently.
 *
 *   - priority: homepage + static + all countries (~177) + all cities (~500)
 *               + places with (description AND photo AND (review OR fully-vegan)).
 *               Target: ≤ 2K URLs; gets re-crawled quickly.
 *   - content:  recipes + events + packs + places with ANY of
 *               (description, photo, hours, review) but not in priority.
 *   - thin:     places with none of the above — still submitted so they're
 *               discoverable, but we don't expect them to rank without user-
 *               contributed content.
 *
 * Next.js auto-generates a sitemap index at /sitemap.xml listing each
 * segment (/sitemap/priority.xml, /sitemap/content.xml, /sitemap/thin.xml).
 */

type SegmentId = 'priority' | 'content' | 'thin'

export async function generateSitemaps() {
  return [
    { id: 'priority' as const },
    { id: 'content' as const },
    { id: 'thin' as const },
  ]
}

async function fetchAll<T>(sb: SupabaseClient, table: string, select: string, filters?: (q: any) => any): Promise<T[]> {
  // Get the total count first so we can fire all pages in parallel.
  // Sequential 1000-row pagination through 37K rows takes ~11s on Vercel;
  // 10-way parallel fetching drops it to ~1-2s.
  let countQuery = sb.from(table).select('id', { count: 'exact', head: true })
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
  const all: T[] = new Array(total)

  for (let start = 0; start < pages; start += concurrency) {
    const batch = Array.from({ length: Math.min(concurrency, pages - start) }, (_, i) => start + i)
    const results = await Promise.all(
      batch.map(async (pageIdx) => {
        const from = pageIdx * batchSize
        const to = Math.min(from + batchSize - 1, total - 1)
        let q = sb.from(table).select(select).range(from, to)
        if (filters) q = filters(q)
        const { data, error } = await q
        if (error) {
          console.error(`[sitemap] page fetch failed for ${table} range ${from}-${to}:`, error.message)
          return { from, rows: [] as T[] }
        }
        return { from, rows: (data || []) as T[] }
      }),
    )
    for (const { from, rows } of results) {
      for (let i = 0; i < rows.length; i++) all[from + i] = rows[i]
    }
  }
  return all.filter(Boolean)
}

interface PlaceRow {
  slug: string | null
  city: string | null
  country: string | null
  description: string | null
  images: string[] | null
  main_image_url: string | null
  review_count: number | null
  vegan_level: string | null
  // Can be a raw TEXT string OR a JSONB object like {Mon: "10-22", ...}.
  opening_hours: string | Record<string, string> | null
  updated_at: string | null
  created_at: string | null
}

// Google's image sitemap spec only accepts absolute http(s) URLs. Extra
// defense on top of the DB cleanup: filter anything that's not a clean
// absolute URL so one bad row can't poison the whole sitemap.
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
        // Cap per page — Google processes up to 1000 but there's no benefit
        // past a handful for a directory page, and smaller sitemaps re-crawl
        // faster.
        if (out.length >= 5) break
      }
    }
  }
  return out
}

function placeTier(p: PlaceRow): SegmentId {
  const hasDescription = !!(p.description && p.description.trim().length > 40)
  const hasImage = !!(p.main_image_url || (p.images && p.images.length > 0))
  const hasReview = (p.review_count || 0) > 0
  const isFullyVegan = p.vegan_level === 'fully_vegan'
  const hasHours =
    !!p.opening_hours &&
    (typeof p.opening_hours === 'string'
      ? p.opening_hours.trim().length > 0
      : Object.keys(p.opening_hours).length > 0)

  // priority: strong signals — rich content AND trust signal
  if (hasDescription && hasImage && (hasReview || isFullyVegan)) return 'priority'
  // content: at least one meaningful signal
  if (hasDescription || hasImage || hasReview || hasHours) return 'content'
  return 'thin'
}

export default async function sitemap({ id }: { id: SegmentId }): Promise<MetadataRoute.Sitemap> {
  const sb = getSupabase()
  // Fetch all places once; bucket them by tier. Faster than 3 separate
  // queries with complex filters — most fields are cheap.
  const [places, posts, packs] = await Promise.all([
    fetchAll<PlaceRow>(
      sb,
      'places',
      'slug, city, country, description, images, main_image_url, review_count, vegan_level, opening_hours, updated_at, created_at',
      q => q.is('archived_at', null),
    ),
    fetchAll<any>(
      sb,
      'posts',
      'slug, category, created_at, updated_at',
      q => q.eq('privacy', 'public').is('deleted_at', null).in('category', ['recipe', 'event']),
    ),
    fetchAll<any>(
      sb,
      'packs',
      'slug, updated_at, created_at',
      q => q.eq('is_published', true),
    ),
  ])

  console.log(`[sitemap ${id}] fetched: places=${places.length}, posts=${posts.length}, packs=${packs.length}`)

  // Pre-bucket places by tier (single pass).
  const byTier: Record<SegmentId, PlaceRow[]> = { priority: [], content: [], thin: [] }
  for (const p of places) {
    if (!p.slug) continue
    byTier[placeTier(p)].push(p)
  }

  const entries: MetadataRoute.Sitemap = []

  if (id === 'priority') {
    // Static top-level pages.
    entries.push(
      { url: SITE_URL, changeFrequency: 'daily', priority: 1.0 },
      { url: `${SITE_URL}/map`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/vegan-places`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/recipes`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/events`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/packs`, changeFrequency: 'daily', priority: 0.8 },
      { url: `${SITE_URL}/city-ranks`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/support`, changeFrequency: 'monthly', priority: 0.5 },
      { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
      { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    )

    // Countries + cities — these are the high-value hub pages Google should
    // crawl first, since they internally link to everything else.
    const countries = new Set<string>()
    const cityCountry = new Set<string>()
    for (const p of places) {
      if (!p.country) continue
      const cs = slugifyCityOrCountry(p.country)
      if (!cs) continue
      countries.add(cs)
      if (p.city) {
        const ct = slugifyCityOrCountry(p.city)
        if (ct) cityCountry.add(`${cs}/${ct}`)
      }
    }
    for (const country of countries) {
      entries.push({ url: `${SITE_URL}/vegan-places/${country}`, changeFrequency: 'daily', priority: 0.85 })
    }
    for (const cc of cityCountry) {
      entries.push({ url: `${SITE_URL}/vegan-places/${cc}`, changeFrequency: 'daily', priority: 0.9 })
    }

    // Priority-tier places — include image URLs so Google discovers them
    // as part of the image index. MetadataRoute.Sitemap's `images` field
    // emits <image:image> children on each <url> entry.
    for (const p of byTier.priority) {
      const imageUrls = collectImageUrls(p)
      entries.push({
        url: `${SITE_URL}/place/${p.slug}`,
        lastModified: p.updated_at || p.created_at || undefined,
        changeFrequency: 'weekly',
        priority: 0.8,
        ...(imageUrls.length > 0 ? { images: imageUrls } : {}),
      })
    }
  }

  if (id === 'content') {
    // Recipes + events.
    for (const post of posts) {
      if (!post.slug) continue
      const prefix = post.category === 'recipe' ? 'recipe' : 'event'
      entries.push({
        url: `${SITE_URL}/${prefix}/${post.slug}`,
        lastModified: post.updated_at || post.created_at,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }

    // Packs.
    for (const pack of packs) {
      if (!pack.slug) continue
      entries.push({
        url: `${SITE_URL}/packs/${pack.slug}`,
        lastModified: pack.updated_at || pack.created_at,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }

    // Content-tier places — include images where present (even if there's
    // only one, it's a legit Google-indexable image).
    for (const p of byTier.content) {
      const imageUrls = collectImageUrls(p)
      entries.push({
        url: `${SITE_URL}/place/${p.slug}`,
        lastModified: p.updated_at || p.created_at || undefined,
        changeFrequency: 'weekly',
        priority: 0.6,
        ...(imageUrls.length > 0 ? { images: imageUrls } : {}),
      })
    }
  }

  if (id === 'thin') {
    for (const p of byTier.thin) {
      entries.push({
        url: `${SITE_URL}/place/${p.slug}`,
        lastModified: p.updated_at || p.created_at || undefined,
        changeFrequency: 'monthly',
        priority: 0.3,
      })
    }
  }

  return entries
}
