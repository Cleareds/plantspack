/**
 * Country-region helpers. Generic across all countries — Belgium is just the
 * first seeded set in country_regions. Powers:
 *   - country page "Browse by region" section
 *   - /vegan-places/<country>/region/<region> aggregation pages
 *   - city page back-link banner ("Part of <Region> →")
 */

import { cache } from 'react'
import { createAdminClient } from './supabase-admin'
import { slugifyCityOrCountry } from './places/slugify'

export interface CountryRegion {
  country_slug: string
  region_slug: string
  region_name: string
  description: string | null
  sort_order: number
  city_names: string[]
}

export interface RegionCityStat {
  city: string
  city_slug: string
  place_count: number
  fully_vegan_count: number
}

/**
 * All regions for a country, sorted. Returns [] if the country has no
 * regions seeded yet (most countries today).
 */
export const getRegionsForCountry = cache(async (countrySlug: string): Promise<CountryRegion[]> => {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('country_regions')
    .select('country_slug, region_slug, region_name, description, sort_order, city_names')
    .eq('country_slug', countrySlug)
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('[getRegionsForCountry]', error.message)
    return []
  }
  return (data || []) as CountryRegion[]
})

/**
 * One region by (country_slug, region_slug). Returns null if not found.
 */
export const getRegion = cache(async (countrySlug: string, regionSlug: string): Promise<CountryRegion | null> => {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('country_regions')
    .select('country_slug, region_slug, region_name, description, sort_order, city_names')
    .eq('country_slug', countrySlug)
    .eq('region_slug', regionSlug)
    .maybeSingle()
  if (error) {
    console.error('[getRegion]', error.message)
    return null
  }
  return (data as CountryRegion) || null
})

/**
 * Lookup the region containing a given city name (canonical, as in places.city).
 * Used by the city page to render the "Part of <Region>" back-link banner.
 * Falls back to null if the city isn't in any region.
 */
export const getRegionForCity = cache(async (countrySlug: string, cityName: string): Promise<CountryRegion | null> => {
  if (!cityName) return null
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('country_regions')
    .select('country_slug, region_slug, region_name, description, sort_order, city_names')
    .eq('country_slug', countrySlug)
    .contains('city_names', [cityName])
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[getRegionForCity]', error.message)
    return null
  }
  return (data as CountryRegion) || null
})

/**
 * Per-city aggregate stats inside a region (place_count + fully_vegan_count).
 * Reads directory_cities (the materialized view), filtered to the region's
 * city_names list. Used to render city cards on the region page.
 */
export const getRegionCityStats = async (
  region: CountryRegion,
  countryDisplayName: string,
): Promise<RegionCityStat[]> => {
  if (!region.city_names.length) return []
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('directory_cities')
    .select('city, city_slug, place_count, fully_vegan_count')
    .eq('country', countryDisplayName)
    .in('city', region.city_names)
    .order('place_count', { ascending: false })
  if (error) {
    console.error('[getRegionCityStats]', error.message)
    return []
  }
  return (data || []).map(r => ({
    city: r.city,
    city_slug: r.city_slug || slugifyCityOrCountry(r.city),
    place_count: r.place_count || 0,
    fully_vegan_count: r.fully_vegan_count || 0,
  }))
}

/**
 * All places inside a region. Used by the region page's CityPlacesList +
 * map. Caps at 1000 to keep the SSR payload reasonable; if a region grows
 * beyond that we'll add proper pagination.
 */
export const getRegionPlaces = async (
  region: CountryRegion,
  countryDisplayName: string,
) => {
  if (!region.city_names.length) return []
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('places')
    .select('id, slug, name, category, subcategory, address, description, images, main_image_url, average_rating, review_count, is_pet_friendly, website, phone, opening_hours, google_place_id, latitude, longitude, city, country, vegan_level, cuisine_types')
    .eq('country', countryDisplayName)
    .in('city', region.city_names)
    .is('archived_at', null)
    .order('average_rating', { ascending: false })
    .limit(1000)
  if (error) {
    console.error('[getRegionPlaces]', error.message)
    return []
  }
  return data || []
}
