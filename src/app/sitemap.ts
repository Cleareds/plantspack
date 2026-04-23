import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { slugifyCityOrCountry } from '@/lib/places/slugify'

const SITE_URL = 'https://plantspack.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

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

async function fetchAll<T>(table: string, select: string, filters?: (q: any) => any): Promise<T[]> {
  const all: T[] = []
  let offset = 0
  const batchSize = 1000
  while (true) {
    let query = supabase.from(table).select(select).range(offset, offset + batchSize - 1)
    if (filters) query = filters(query)
    const { data } = await query
    if (!data || data.length === 0) break
    all.push(...(data as T[]))
    if (data.length < batchSize) break
    offset += batchSize
  }
  return all
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
  opening_hours: string | null
  updated_at: string | null
  created_at: string | null
}

function placeTier(p: PlaceRow): SegmentId {
  const hasDescription = !!(p.description && p.description.trim().length > 40)
  const hasImage = !!(p.main_image_url || (p.images && p.images.length > 0))
  const hasReview = (p.review_count || 0) > 0
  const isFullyVegan = p.vegan_level === 'fully_vegan'
  const hasHours = !!(p.opening_hours && p.opening_hours.trim().length > 0)

  // priority: strong signals — rich content AND trust signal
  if (hasDescription && hasImage && (hasReview || isFullyVegan)) return 'priority'
  // content: at least one meaningful signal
  if (hasDescription || hasImage || hasReview || hasHours) return 'content'
  return 'thin'
}

export default async function sitemap({ id }: { id: SegmentId }): Promise<MetadataRoute.Sitemap> {
  // Fetch all places once; bucket them by tier. Faster than 3 separate
  // queries with complex filters — most fields are cheap.
  const [places, posts, packs] = await Promise.all([
    fetchAll<PlaceRow>(
      'places',
      'slug, city, country, description, images, main_image_url, review_count, vegan_level, opening_hours, updated_at, created_at',
      q => q.is('archived_at', null),
    ),
    fetchAll<any>(
      'posts',
      'slug, category, created_at, updated_at',
      q => q.eq('privacy', 'public').is('deleted_at', null).in('category', ['recipe', 'event']),
    ),
    fetchAll<any>(
      'packs',
      'slug, updated_at, created_at',
      q => q.eq('is_published', true),
    ),
  ])

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

    // Priority-tier places.
    for (const p of byTier.priority) {
      entries.push({
        url: `${SITE_URL}/place/${p.slug}`,
        lastModified: p.updated_at || p.created_at || undefined,
        changeFrequency: 'weekly',
        priority: 0.8,
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

    // Content-tier places.
    for (const p of byTier.content) {
      entries.push({
        url: `${SITE_URL}/place/${p.slug}`,
        lastModified: p.updated_at || p.created_at || undefined,
        changeFrequency: 'weekly',
        priority: 0.6,
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
