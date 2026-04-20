/**
 * Server-side directory queries using materialized views.
 * Each function = 1 Supabase query. Wrapped in React cache()
 * to deduplicate across generateMetadata() and page render.
 */

import { cache } from 'react'
import { createAdminClient } from './supabase-admin'

export interface CountryStats {
  country: string
  place_count: number
  eat_count: number
  store_count: number
  hotel_count: number
  fully_vegan_count: number
  pet_friendly_count: number
  city_count: number
  top_cuisines: string[]
  sample_names: string[]
}

export interface CityStats {
  city: string
  country: string
  place_count: number
  eat_count: number
  store_count: number
  hotel_count: number
  fully_vegan_count: number
  pet_friendly_count: number
  top_cuisines: string[]
  sample_names: string[]
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Get all countries with stats — 1 query to directory_countries view
 */
export const getCountries = cache(async () => {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('directory_countries')
    .select('*')
    .order('place_count', { ascending: false })

  if (error) {
    console.error('[getCountries]', error.message)
    return { countries: [], total: 0 }
  }

  const countries = (data || []).map((row: any) => ({
    name: row.country,
    slug: row.country_slug || toSlug(row.country),
    count: row.place_count,
    stats: {
      total: row.place_count,
      categories: { eat: row.eat_count, store: row.store_count, hotel: row.hotel_count },
      fullyVegan: row.fully_vegan_count,
      petFriendly: row.pet_friendly_count,
      cuisines: (row.top_cuisines || []).filter(Boolean),
      sampleNames: (row.sample_names || []).filter(Boolean),
      cityCount: row.city_count,
    },
  }))

  const total = countries.reduce((s: number, c: any) => s + c.count, 0)
  return { countries, total }
})

/**
 * Get cities for a country — 1 query to directory_cities view
 * Matches on country_slug (accent-safe) via the country_slug column in directory_countries
 */
export const getCities = cache(async (countrySlug: string) => {
  const supabase = createAdminClient()

  // First get the actual country name from the slug
  const { data: countryRow } = await supabase
    .from('directory_countries')
    .select('country')
    .eq('country_slug', countrySlug)
    .single()

  const actualCountry = countryRow?.country || countrySlug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

  const { data, error } = await supabase
    .from('directory_cities')
    .select('*')
    .eq('country', actualCountry)
    .order('place_count', { ascending: false })

  if (error) {
    console.error('[getCities]', error.message)
    return { cities: [], country: actualCountry }
  }

  const cities = (data || []).map((row: any) => ({
    name: row.city,
    slug: row.city_slug || toSlug(row.city),
    count: row.place_count,
    stats: {
      total: row.place_count,
      categories: { eat: row.eat_count, store: row.store_count, hotel: row.hotel_count },
      fullyVegan: row.fully_vegan_count,
      petFriendly: row.pet_friendly_count,
      cuisines: (row.top_cuisines || []).filter(Boolean),
      sampleNames: (row.sample_names || []).filter(Boolean),
    },
  }))

  return { cities, country: actualCountry }
})

/**
 * Get places for a city — looks up actual city name from view, then 1 query to places
 * No cache() — force-dynamic pages need fresh data every time
 */
export const getCityPlaces = async (countrySlug: string, citySlug: string) => {
  const supabase = createAdminClient()

  // Look up actual city + country names from the slug-indexed view.
  // CRITICAL: filter by country too — otherwise cities that share a slug
  // (e.g. Oxford UK vs Oxford NZ) resolve to whichever row sorts first.
  // Use .limit(1).order(place_count) instead of .maybeSingle() — same-country
  // casing/accent variants ("Paris"/"paris", "Montreal"/"Montréal") produce
  // multiple rows for the same (country_slug, city_slug), and maybeSingle()
  // returns null on multi-match, silently falling back to slug→title-case.
  const { data: cityRows } = await supabase
    .from('directory_cities')
    .select('city, country')
    .eq('city_slug', citySlug)
    .ilike('country', countrySlug.replace(/-/g, ' '))
    .order('place_count', { ascending: false })
    .limit(1)

  const cityRow = cityRows?.[0]
  const actualCity = cityRow?.city || citySlug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  const actualCountry = cityRow?.country || countrySlug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

  // Use ilike on both city + country to catch casing/accent variants in the
  // underlying places rows (a city_slug can aggregate "Paris" AND "paris").
  const { data, error } = await supabase
    .from('places')
    .select('id, slug, name, category, address, description, images, main_image_url, average_rating, review_count, is_pet_friendly, website, phone, opening_hours, google_place_id, latitude, longitude, city, country, vegan_level, cuisine_types')
    .ilike('country', actualCountry)
    .ilike('city', actualCity)
    .order('name', { ascending: true })
    .limit(500)

  if (error) {
    console.error('[getCityPlaces]', error.message)
    return { places: [], city: actualCity, country: actualCountry, total: 0 }
  }

  return {
    places: data || [],
    city: actualCity,
    country: actualCountry,
    total: data?.length || 0,
  }
}

/**
 * Get a single place with all details — 1 query
 */
export const getPlace = cache(async (idOrSlug: string) => {
  const supabase = createAdminClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
  const column = isUuid ? 'id' : 'slug'

  const { data: place, error } = await supabase
    .from('places')
    .select(`
      *,
      users:created_by (id, username, first_name, last_name, avatar_url),
      favorite_places (id, user_id)
    `)
    .eq(column, idOrSlug)
    .single()

  if (error || !place) return null

  // Rating data is already denormalized on the places table (average_rating, review_count)
  return place
})
