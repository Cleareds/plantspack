import { createAdminClient } from '@/lib/supabase-admin'
import { pilotPlaceIds } from './live'
import { BUSINESS_TOOLS_PUBLIC } from './launch'

export interface CityDeal {
  id: string
  title: string
  details: string | null
  audience: 'everyone' | 'supporters'
  starts_on: string
  ends_on: string | null
  /** Shown to everyone (public launch or pilot place); otherwise admins only. */
  live: boolean
  place: { id: string; slug: string | null; name: string; main_image_url: string | null }
}

/**
 * Live deals of Partner places in one city, for the city hub's deal strip.
 * Dates are checked again in the browser because hub pages are cached.
 * Any failure returns no deals, never an error.
 */
export async function fetchCityDeals(city: string, country: string): Promise<CityDeal[]> {
  try {
    const sb = createAdminClient() as any
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await sb
      .from('place_deals')
      .select('id, title, details, audience, starts_on, ends_on, places!inner(id, slug, name, city, country, archived_at, main_image_url)')
      .eq('status', 'active')
      .or(`ends_on.is.null,ends_on.gte.${today}`)
      .eq('places.city', city)
      .eq('places.country', country)
      .is('places.archived_at', null)
      .limit(40)
    const rows = (data || []) as any[]
    if (!rows.length) return []
    const placeIds = [...new Set(rows.map((r) => r.places.id))]
    const { data: plans } = await sb.from('place_plans').select('place_id, status, current_period_end').in('place_id', placeIds)
    const ok = new Set(
      (plans || [])
        .filter((p: any) => (p.status === 'active' || p.status === 'past_due') && (!p.current_period_end || new Date(p.current_period_end).getTime() > Date.now() - 3 * 864e5))
        .map((p: any) => p.place_id),
    )
    const pilots = BUSINESS_TOOLS_PUBLIC ? null : await pilotPlaceIds(sb, placeIds)
    return rows
      .filter((r) => ok.has(r.places.id))
      .map((r) => ({
        id: r.id, title: r.title, details: r.details, audience: r.audience, starts_on: r.starts_on, ends_on: r.ends_on,
        live: BUSINESS_TOOLS_PUBLIC || !!pilots?.has(r.places.id),
        place: { id: r.places.id, slug: r.places.slug, name: r.places.name, main_image_url: r.places.main_image_url },
      }))
  } catch {
    return []
  }
}
