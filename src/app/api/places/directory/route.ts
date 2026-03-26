import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)

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

      return NextResponse.json({ countries, total: data?.length || 0 })
    }

    if (level === 'cities' && country) {
      // Get cities in a country with place counts — paginate past 1000 row limit
      const allCityData: any[] = []
      let cityFrom = 0
      while (true) {
        const { data: batch, error: batchError } = await supabase
          .from('places')
          .select('city, country, category, vegan_level, is_pet_friendly, cuisine_types, name')
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
        .slice(0, limit)

      // Get actual country name from DB (proper casing)
      const dbCountryName = data?.[0]?.country || fromSlugDisplay(country)

      return NextResponse.json({ cities, country: dbCountryName })
    }

    if (level === 'places' && country && city) {
      // Get places in a specific city
      let query = supabase
        .from('places')
        .select('id, slug, name, category, address, description, images, main_image_url, average_rating, review_count, is_pet_friendly, vegan_level, website, phone, opening_hours, google_place_id, latitude, longitude, city, country, cuisine_types')
        .ilike('country', fromSlug(country))
        .ilike('city', fromSlug(city))

      if (category) {
        query = query.eq('category', category)
      }

      if (sort === 'rating') {
        query = query.order('average_rating', { ascending: false, nullsFirst: false })
      } else {
        query = query.order('name', { ascending: true })
      }

      const { data, error } = await query.limit(limit)
      if (error) throw error

      // Use actual DB names for proper casing
      const dbCity = data?.[0]?.city || fromSlugDisplay(city)
      const dbCountry = data?.[0]?.country || fromSlugDisplay(country)

      return NextResponse.json({
        places: data || [],
        city: dbCity,
        country: dbCountry,
        total: data?.length || 0,
      })
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
