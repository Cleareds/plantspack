import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = 'https://plantspack.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Fetch all rows with pagination (Supabase caps at 1000 per query)
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  // Static pages
  entries.push(
    { url: SITE_URL, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/map`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/vegan-places`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/recipes`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/events`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/packs`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/support`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
  )

  // Places — use slug, paginate to get ALL
  try {
    const places = await fetchAll<any>('places', 'slug, updated_at, created_at')
    for (const place of places) {
      if (!place.slug) continue
      entries.push({
        url: `${SITE_URL}/place/${place.slug}`,
        lastModified: place.updated_at || place.created_at,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  } catch (e) {
    console.error('[Sitemap] Error fetching places:', e)
  }

  // Recipes and events — use slug
  try {
    const posts = await fetchAll<any>('posts', 'slug, category, created_at, updated_at', q =>
      q.eq('privacy', 'public').is('deleted_at', null).in('category', ['recipe', 'event'])
    )
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
  } catch (e) {
    console.error('[Sitemap] Error fetching posts:', e)
  }

  // Vegan places directory: country and city pages
  try {
    const placeLocations = await fetchAll<any>('places', 'city, country')
    const countries = new Set<string>()
    const cityCountry = new Set<string>()

    for (const p of placeLocations) {
      if (!p.country) continue
      const cs = p.country.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      countries.add(cs)
      if (p.city) {
        const ct = p.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        cityCountry.add(`${cs}/${ct}`)
      }
    }

    for (const country of countries) {
      entries.push({ url: `${SITE_URL}/vegan-places/${country}`, changeFrequency: 'daily', priority: 0.85 })
    }
    for (const cc of cityCountry) {
      entries.push({ url: `${SITE_URL}/vegan-places/${cc}`, changeFrequency: 'daily', priority: 0.9 })
    }
  } catch (e) {
    console.error('[Sitemap] Error fetching place locations:', e)
  }

  // Packs — use slug
  try {
    const packs = await fetchAll<any>('packs', 'slug, updated_at, created_at', q =>
      q.eq('is_published', true)
    )
    for (const pack of packs) {
      if (!pack.slug) continue
      entries.push({
        url: `${SITE_URL}/packs/${pack.slug}`,
        lastModified: pack.updated_at || pack.created_at,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
  } catch (e) {
    console.error('[Sitemap] Error fetching packs:', e)
  }

  return entries
}
