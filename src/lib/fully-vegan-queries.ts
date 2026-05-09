import { cache } from 'react'
import { createAdminClient } from './supabase-admin'

/**
 * SSR-friendly fetch of fully_vegan places for a country (and optionally a
 * specific city). Returns the full HTML-renderable list — name, slug, city,
 * address, image, last_verified_at, verification_method — so the
 * /fully-vegan filter pages can serve crawlable content without client JS.
 *
 * Used by /vegan-places/<country>/fully-vegan and
 * /vegan-places/<country>/<city>/fully-vegan.
 */
export interface FullyVeganPlace {
  id: string
  slug: string | null
  name: string
  city: string | null
  country: string
  category: string | null
  subcategory: string | null
  address: string | null
  description: string | null
  main_image_url: string | null
  website: string | null
  phone: string | null
  opening_hours: any
  cuisine_types: string[] | null
  latitude: number | null
  longitude: number | null
  verification_level: number | null
  verification_method: string | null
  last_verified_at: string | null
}

export const getFullyVeganPlaces = cache(async (countryName: string, cityName?: string): Promise<FullyVeganPlace[]> => {
  const sb = createAdminClient()
  let q = sb.from('places')
    .select('id, slug, name, city, country, category, subcategory, address, description, main_image_url, website, phone, opening_hours, cuisine_types, latitude, longitude, verification_level, verification_method, last_verified_at')
    .is('archived_at', null)
    .eq('vegan_level', 'fully_vegan')
    .ilike('country', countryName)
  if (cityName) q = q.ilike('city', cityName)
  q = q.order('name')
  const { data, error } = await q
  if (error) {
    console.error('[getFullyVeganPlaces]', error.message)
    return []
  }
  return (data || []) as FullyVeganPlace[]
})

/**
 * Returns the most recent last_verified_at across the full fully_vegan
 * Belgium set so the /fully-vegan page can display "Last full review:
 * <date>" - the freshness signal that's the unique selling point.
 */
export const getCountryAuditFreshness = cache(async (countryName: string): Promise<{ lastVerifiedAt: string | null; verifiedCount: number; totalFv: number }> => {
  const sb = createAdminClient()
  const { data: counts } = await sb.from('places').select('verification_level, last_verified_at')
    .is('archived_at', null)
    .eq('vegan_level', 'fully_vegan')
    .ilike('country', countryName)
  const all = counts || []
  const verified = all.filter(r => (r.verification_level ?? 0) >= 3)
  const lastVerified = verified.map(r => r.last_verified_at).filter(Boolean).sort().reverse()[0] || null
  return { lastVerifiedAt: lastVerified, verifiedCount: verified.length, totalFv: all.length }
})
