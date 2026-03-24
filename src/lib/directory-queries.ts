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
    slug: toSlug(row.country),
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
 */
export const getCities = cache(async (countrySlug: string) => {
  const supabase = createAdminClient()
  const countryName = countrySlug.replace(/-/g, ' ')

  const { data, error } = await supabase
    .from('directory_cities')
    .select('*')
    .ilike('country', countryName)
    .order('place_count', { ascending: false })

  if (error) {
    console.error('[getCities]', error.message)
    return { cities: [], country: countryName }
  }

  // Get actual country name from first row
  const actualCountry = data?.[0]?.country || countryName.replace(/\b\w/g, (c: string) => c.toUpperCase())

  const cities = (data || []).map((row: any) => ({
    name: row.city,
    slug: toSlug(row.city),
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
 * Get places for a city — 1 query to places table
 */
export const getCityPlaces = cache(async (countrySlug: string, citySlug: string) => {
  const supabase = createAdminClient()
  const countryName = countrySlug.replace(/-/g, ' ')
  const cityName = citySlug.replace(/-/g, ' ')

  const { data, error } = await supabase
    .from('places')
    .select('id, slug, name, category, address, description, images, main_image_url, average_rating, review_count, is_pet_friendly, website, latitude, longitude, city, country, vegan_level, cuisine_types')
    .ilike('country', countryName)
    .ilike('city', cityName)
    .order('name', { ascending: true })
    .limit(500)

  if (error) {
    console.error('[getCityPlaces]', error.message)
    return { places: [], city: cityName, country: countryName, total: 0 }
  }

  const actualCity = data?.[0]?.city || cityName.replace(/\b\w/g, (c: string) => c.toUpperCase())
  const actualCountry = data?.[0]?.country || countryName.replace(/\b\w/g, (c: string) => c.toUpperCase())

  return {
    places: data || [],
    city: actualCity,
    country: actualCountry,
    total: data?.length || 0,
  }
})

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
