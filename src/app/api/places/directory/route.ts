import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Edge cache for crawler-heavy listing endpoints. Short TTL + long SWR so
 * the first request regenerates in background while stale content is
 * returned instantly. Big multiplier on Supabase request reduction when
 * multiple SSR pages regenerate against the same endpoint.
 */
const CACHE_HEADERS = {
  'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
}

/**
 * GET /api/places/directory — Directory data for SEO pages
 * ?level=countries — List countries with place counts
 * ?level=cities&country=germany — List cities in a country
 * ?level=places&country=germany&city=berlin — List places in a city
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level') || 'countries'
    const country = searchParams.get('country')
    const city = searchParams.get('city')
    const category = searchParams.get('category')
    const sort = searchParams.get('sort') || 'count'
    // Accept an optional `limit` for callers that want a small slice (previews,
    // sample grids). Default 200. Cap removed for city-places queries — we
    // paginate server-side so large cities (Berlin has 1300+) return in full.
    const requestedLimit = parseInt(searchParams.get('limit') || '200')

    if (level === 'countries') {
      // Get countries with place counts and stats for SEO descriptions
      // Supabase caps at 1000 rows per query — paginate to get all
      const allData: any[] = []
      let from = 0
      const batchSize = 1000
      while (true) {
        const { data: batch, error: batchError } = await supabase
          .from('places')
          .select('country, category, vegan_level, is_pet_friendly, cuisine_types, city, name')
          .is('archived_at', null)
          .not('country', 'is', null)
          .neq('country', '')
          .range(from, from + batchSize - 1)
        if (batchError) throw batchError
        if (!batch || batch.length === 0) break
        allData.push(...batch)
        if (batch.length < batchSize) break
        from += batchSize
      }

      const data = allData
      const error = null
      if (error) throw error

      const countryMap: Record<string, {
        count: number, categories: Record<string, number>,
        fullyVegan: number, petFriendly: number,
        cuisines: Record<string, number>, cities: Set<string>,
        sampleNames: string[]
      }> = {}

      for (const row of data || []) {
        const c = row.country!
        if (!countryMap[c]) countryMap[c] = { count: 0, categories: {}, fullyVegan: 0, petFriendly: 0, cuisines: {}, cities: new Set(), sampleNames: [] }
        const s = countryMap[c]
        s.count++
        s.categories[row.category] = (s.categories[row.category] || 0) + 1
        if (row.vegan_level === 'fully_vegan') s.fullyVegan++
        if (row.is_pet_friendly) s.petFriendly++
        if (row.city) s.cities.add(row.city)
        if (s.sampleNames.length < 5) s.sampleNames.push(row.name)
        for (const ct of (row.cuisine_types || [])) {
          if (ct && ct !== 'vegan') s.cuisines[ct] = (s.cuisines[ct] || 0) + 1
        }
      }

      const countries = Object.entries(countryMap)
        .map(([name, s]) => ({
          name,
          slug: toSlug(name),
          count: s.count,
          stats: {
            total: s.count,
            categories: s.categories,
            fullyVegan: s.fullyVegan,
            petFriendly: s.petFriendly,
            cuisines: Object.entries(s.cuisines).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k),
            sampleNames: s.sampleNames,
            cityCount: s.cities.size,
          },
        }))
        .sort((a, b) => b.count - a.count)

      return NextResponse.json({ countries, total: data?.length || 0 }, { headers: CACHE_HEADERS })
    }

    if (level === 'cities' && country) {
      // Get cities in a country with place counts — paginate past 1000 row limit
      const allCityData: any[] = []
      let cityFrom = 0
      while (true) {
        const { data: batch, error: batchError } = await supabase
          .from('places')
          .select('city, country, category, vegan_level, is_pet_friendly, cuisine_types, name')
          .is('archived_at', null)
          .not('city', 'is', null)
          .neq('city', '')
          .ilike('country', fromSlug(country))
          .range(cityFrom, cityFrom + 999)
        if (batchError) throw batchError
        if (!batch || batch.length === 0) break
        allCityData.push(...batch)
        if (batch.length < 1000) break
        cityFrom += 1000
      }

      const data = allCityData
      const error = null
      if (error) throw error

      const cityMap: Record<string, {
        count: number, categories: Record<string, number>,
        fullyVegan: number, petFriendly: number,
        cuisines: Record<string, number>, sampleNames: string[]
      }> = {}

      for (const row of data || []) {
        const c = row.city!
        if (!cityMap[c]) cityMap[c] = { count: 0, categories: {}, fullyVegan: 0, petFriendly: 0, cuisines: {}, sampleNames: [] }
        const s = cityMap[c]
        s.count++
        s.categories[row.category] = (s.categories[row.category] || 0) + 1
        if (row.vegan_level === 'fully_vegan') s.fullyVegan++
        if (row.is_pet_friendly) s.petFriendly++
        if (s.sampleNames.length < 8) s.sampleNames.push(row.name)
        for (const ct of (row.cuisine_types || [])) {
          if (ct && ct !== 'vegan') s.cuisines[ct] = (s.cuisines[ct] || 0) + 1
        }
      }

      const cities = Object.entries(cityMap)
        .map(([name, s]) => ({
          name,
          slug: toSlug(name),
          count: s.count,
          stats: {
            total: s.count,
            categories: s.categories,
            fullyVegan: s.fullyVegan,
            petFriendly: s.petFriendly,
            cuisines: Object.entries(s.cuisines).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k),
            sampleNames: s.sampleNames,
          },
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, Math.min(requestedLimit, 500))

      // Get actual country name from DB (proper casing)
      const dbCountryName = data?.[0]?.country || fromSlugDisplay(country)

      return NextResponse.json({ cities, country: dbCountryName }, { headers: CACHE_HEADERS })
    }

    if (level === 'places' && country && !city) {
      // Get all places in a country (for country pages)
      let query = supabase
        .from('places')
        .select('id, slug, name, category, subcategory, address, description, images, main_image_url, average_rating, review_count, is_pet_friendly, vegan_level, website, phone, opening_hours, latitude, longitude, city, country, cuisine_types, verification_level')
        .is('archived_at', null)
        .ilike('country', fromSlug(country))

      if (category) {
        query = query.eq('category', category)
      }

      if (sort === 'rating') {
        query = query.order('average_rating', { ascending: false, nullsFirst: false })
      } else {
        query = query.order('name', { ascending: true })
      }

      // Country-level list — paginate past Supabase's 1000-row default so
      // mid-size countries (Belgium ~566, France ~1400, UK ~3000) are not
      // truncated. Hard-cap at 5000 to avoid runaway dumps for the US/India.
      const hardCap = Math.min(requestedLimit || 3000, 5000)
      const allCountryPlaces: any[] = []
      let from = 0
      while (allCountryPlaces.length < hardCap) {
        const remaining = hardCap - allCountryPlaces.length
        const pageSize = Math.min(1000, remaining)
        const { data: page, error } = await query.range(from, from + pageSize - 1)
        if (error) throw error
        if (!page || page.length === 0) break
        allCountryPlaces.push(...page)
        if (page.length < pageSize) break
        from += pageSize
      }
      const data = allCountryPlaces

      const dbCountry = data?.[0]?.country || fromSlugDisplay(country)

      return NextResponse.json({
        places: data || [],
        country: dbCountry,
        total: data?.length || 0,
      }, { headers: CACHE_HEADERS })
    }

    if (level === 'places' && country && city) {
      // Look up actual city name from directory view (handles hyphens, accents etc.).
      // CRITICAL: match country too — otherwise e.g. "oxford" returns Oxford NZ
      // on a /united-kingdom/oxford URL because both share a city_slug.
      // .single() fails and .maybeSingle() returns null when multiple view
      // rows match — happens for casing/accent variants in the same country
      // (e.g. "Paris"/"paris", "Montreal"/"Montréal"). Order by place_count
      // and take the biggest row.
      const { data: cityRows } = await supabase
        .from('directory_cities')
        .select('city, country')
        .eq('city_slug', city)
        .ilike('country', fromSlug(country))
        .order('place_count', { ascending: false })
        .limit(1)

      const cityRow = cityRows?.[0]
      const actualCity = cityRow?.city || fromSlug(city)
      const actualCountry = cityRow?.country || fromSlug(country)

      // Paginate server-side through Supabase's 1000-row-per-request cap so
      // large cities (Berlin 1300+) return in full. The cap-free `all`
      // output is what the client paginates at 30 rows/page in the UI.
      const selectCols = 'id, slug, name, category, subcategory, address, description, images, main_image_url, average_rating, review_count, is_pet_friendly, vegan_level, website, phone, opening_hours, latitude, longitude, city, country, cuisine_types, verification_level'
      const all: any[] = []
      const BATCH = 1000
      let from = 0
      while (true) {
        let q = supabase
          .from('places')
          .select(selectCols)
          .is('archived_at', null)
          .ilike('city', actualCity)
          .ilike('country', actualCountry)
        if (category) q = q.eq('category', category)
        if (sort === 'rating') q = q.order('average_rating', { ascending: false, nullsFirst: false })
        else                    q = q.order('name',           { ascending: true })
        const { data: batch, error } = await q.range(from, from + BATCH - 1)
        if (error) throw error
        if (!batch || batch.length === 0) break
        all.push(...batch)
        if (batch.length < BATCH) break
        from += BATCH
      }

      const dbCity = all[0]?.city || fromSlugDisplay(city)
      const dbCountry = all[0]?.country || fromSlugDisplay(country)

      return NextResponse.json({
        places: all,
        city: dbCity,
        country: dbCountry,
        total: all.length,
      }, { headers: CACHE_HEADERS })
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  } catch (error) {
    console.error('[Directory API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch directory data' }, { status: 500 })
  }
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function fromSlug(slug: string): string {
  // Convert slug back to approximate name for ilike matching
  // "united-kingdom" → "united kingdom" (ilike is case-insensitive)
  return slug.replace(/-/g, ' ')
}

function fromSlugDisplay(slug: string): string {
  // Convert slug to display name with proper capitalization
  // "united-kingdom" → "United Kingdom"
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
