/**
 * Sitemap segment for the dish × city long-tail SEO surface:
 *   - /vegan-places/{country}/{city}/best-vegan/         (hub pages)
 *   - /vegan-places/{country}/{city}/best-vegan/{dish}   (dish pages)
 *
 * Generation strategy:
 *   1. Pull every live place once with the minimum columns needed for dish
 *      matching (name, description, cuisine_types, subcategory, city,
 *      country).
 *   2. Group by (city, country) in memory.
 *   3. For each city, score every dish against the city's places and emit
 *      a URL entry per dish that has >= 3 matches (the same density gate
 *      the page renderer uses).
 *   4. Emit one hub URL per city that has at least 1 qualifying dish.
 *
 * One query, in-memory loop. Avoids per-city Supabase round-trips that
 * would blow past Vercel function timeouts at sitemap-build time.
 */

import { createClient } from '@supabase/supabase-js'
import { DISHES } from '@/lib/dish-keywords'

const SITE_URL = 'https://www.plantspack.com'

// 12h cache - dish-page set is stable enough day-to-day that we don't
// need to regenerate hourly. Aligns with the dish-page revalidate (24h)
// so the sitemap never references a non-existent page.
export const revalidate = 43200

interface PlaceRow {
  name: string | null
  description: string | null
  cuisine_types: unknown
  subcategory: string | null
  city: string | null
  country: string | null
}

function matchScore(p: PlaceRow, needles: string[]): number {
  const name = (p.name ?? '').toLowerCase()
  const desc = (p.description ?? '').toLowerCase()
  const cuisines = ((p.cuisine_types ?? []) as unknown[])
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
    .map(c => c.toLowerCase())
  const subcat = (p.subcategory ?? '').toLowerCase()
  let score = 0
  for (const n of needles) {
    const needle = n.toLowerCase()
    if (name.includes(needle)) { score += 10; continue }
    if (cuisines.some(c => c.includes(needle))) { score += 6; continue }
    if (subcat === needle || subcat.includes(needle)) { score += 4; continue }
    if (desc.includes(needle)) { score += 2; continue }
  }
  return score
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-')
}

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Pull every live place in batches (Supabase caps each call at 1000 rows).
  const all: PlaceRow[] = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data } = await sb.from('places')
      .select('name, description, cuisine_types, subcategory, city, country')
      .is('archived_at', null)
      .not('city', 'is', null)
      .not('country', 'is', null)
      .range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    all.push(...(data as PlaceRow[]))
    if (data.length < PAGE) break
    from += PAGE
  }

  // Group by (city, country)
  const byCity = new Map<string, PlaceRow[]>()
  for (const p of all) {
    if (!p.city || !p.country) continue
    const key = `${p.country}|${p.city}`
    let arr = byCity.get(key)
    if (!arr) { arr = []; byCity.set(key, arr) }
    arr.push(p)
  }

  // Build URL list
  const urls: string[] = []

  for (const [key, places] of byCity) {
    const [country, city] = key.split('|')
    if (!country || !city) continue
    if (places.length < 3) continue  // tiny cities have no useful dish pages
    const countrySlug = slugify(country)
    const citySlug = slugify(city)

    let cityHasAnyDish = false
    for (const dish of DISHES) {
      const minScore = dish.specialised ? 6 : 4
      let count = 0
      for (const p of places) {
        if (matchScore(p, dish.needles) >= minScore) {
          count++
          if (count >= 3) break  // early-exit at the density gate
        }
      }
      if (count >= 3) {
        urls.push(`${SITE_URL}/vegan-places/${countrySlug}/${citySlug}/best-vegan/${dish.slug}`)
        cityHasAnyDish = true
      }
    }
    if (cityHasAnyDish) {
      urls.push(`${SITE_URL}/vegan-places/${countrySlug}/${citySlug}/best-vegan`)
    }
  }

  // Build XML. No lastmod: stamping now() on every regeneration is the
  // dishonest-freshness pattern Google learns to distrust site-wide, and we
  // have no cheap per-dish timestamp. Bare <loc> is the honest option.
  // (changefreq/priority dropped too — Google ignores both.)
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u}</loc>
  </url>`).join('\n')}
</urlset>
`

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400',
    },
  })
}
