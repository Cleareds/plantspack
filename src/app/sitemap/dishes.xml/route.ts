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
import { matchScoreFor, minScore, DISH_PAGE_MIN_PLACES } from '@/lib/dish-match'
import { toSlug } from '@/lib/slug'

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
  category: string | null
  city: string | null
  country: string | null
}

// Scoring lives in @/lib/dish-match, shared with dish-page-data.ts. A local
// copy used to live here and had already drifted (it never applied the
// subcategoryHint bonus), so the sitemap could advertise a URL the page then
// refused to render.

// Must transliterate, not just hyphenate. A bare lowercase+hyphen pass emitted
// accented <loc> values ("/vegan-places/vietnam/hội-an-tây-ward/best-vegan"),
// Google crawled them, and every one came back 500 because ISR routes cannot
// carry a character above Latin-1 (GSC "Server error (5xx)", 2026-07-28).
function slugify(s: string): string {
  return toSlug(s)
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
      .select('name, description, cuisine_types, subcategory, category, city, country')
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
    // tiny cities have no useful dish pages
    if (places.length < DISH_PAGE_MIN_PLACES) continue
    const countrySlug = slugify(country)
    const citySlug = slugify(city)

    let cityHasAnyDish = false
    for (const dish of DISHES) {
      const gate = minScore(dish)
      let count = 0
      for (const p of places) {
        if (matchScoreFor(p, dish) >= gate) {
          count++
          if (count >= DISH_PAGE_MIN_PLACES) break  // early-exit at the density gate
        }
      }
      if (count >= DISH_PAGE_MIN_PLACES) {
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
