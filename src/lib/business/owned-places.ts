/**
 * Client-side loaders for the business dashboard. Everything here reads
 * public data (places, reviews, replies) or the caller's own rows (claims),
 * so the browser client and RLS are enough. Writes go through API routes
 * that check getAuthority() on the server.
 */
import { supabase } from '@/lib/supabase'

export interface OwnedPlace {
  id: string
  slug: string | null
  name: string
  city: string | null
  country: string | null
  category: string
  vegan_level: string | null
  main_image_url: string | null
  verified_at: string | null
}

export interface OwnerClaim {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  rejection_reason: string | null
  place: { id: string; name: string; slug: string | null } | null
}

const sb = supabase as any

/** Places the user owns (active place_owners rows only), newest first. */
export async function fetchOwnedPlaces(userId: string): Promise<OwnedPlace[]> {
  const { data: owned, error } = await sb.rpc('get_user_owned_places', { p_user_id: userId })
  if (error || !owned?.length) return []
  const ids = (owned as Array<{ place_id: string }>).map((o) => o.place_id)
  const { data: places } = await sb
    .from('places')
    .select('id, slug, name, city, country, category, vegan_level, main_image_url')
    .in('id', ids)
  const byId = new Map<string, any>((places || []).map((p: any) => [p.id, p]))
  return (owned as Array<{ place_id: string; place_name: string; place_category: string; verified_at: string }>)
    .map((o) => {
      const p = byId.get(o.place_id)
      return {
        id: o.place_id,
        slug: p?.slug ?? null,
        name: p?.name ?? o.place_name,
        city: p?.city ?? null,
        country: p?.country ?? null,
        category: p?.category ?? o.place_category,
        vegan_level: p?.vegan_level ?? null,
        main_image_url: p?.main_image_url ?? null,
        verified_at: o.verified_at,
      }
    })
}

/** The user's own claim requests (RLS: own rows only). */
export async function fetchOwnClaims(userId: string): Promise<OwnerClaim[]> {
  const { data } = await sb
    .from('place_claim_requests')
    .select('id, status, created_at, rejection_reason, places:place_id ( id, name, slug )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data || []).map((c: any) => ({
    id: c.id,
    status: c.status,
    created_at: c.created_at,
    rejection_reason: c.rejection_reason,
    place: c.places ?? null,
  }))
}

/** Review counts for one place: all live reviews, and those with no owner reply yet. */
export async function fetchReviewCounts(placeId: string): Promise<{ total: number; unanswered: number }> {
  const { data: reviews } = await sb
    .from('place_reviews')
    .select('id')
    .eq('place_id', placeId)
    .is('deleted_at', null)
    .limit(1000)
  const ids: string[] = (reviews || []).map((r: any) => r.id)
  if (!ids.length) return { total: 0, unanswered: 0 }
  const { data: replies } = await sb
    .from('place_review_replies')
    .select('review_id')
    .in('review_id', ids)
    .eq('author_role', 'owner')
    .is('deleted_at', null)
  const answered = new Set((replies || []).map((r: any) => r.review_id))
  return { total: ids.length, unanswered: ids.filter((id) => !answered.has(id)).length }
}

/** Full place row in the shape EditPlace expects. */
export async function fetchEditablePlace(placeId: string): Promise<any | null> {
  const { data } = await sb
    .from('places')
    .select('id, name, description, category, subcategory, address, website, phone, opening_hours, is_pet_friendly, images, main_image_url, tags, vegan_level, business_status, reopen_date')
    .eq('id', placeId)
    .single()
  if (!data) return null
  return { ...data, images: data.images || [], address: data.address || '' }
}

export function placeHref(p: { id: string; slug: string | null }): string {
  return `/place/${p.slug || p.id}`
}

export const VEGAN_LEVEL_LABEL: Record<string, string> = {
  fully_vegan: '100% vegan',
  mostly_vegan: 'Mostly vegan',
  vegan_friendly: 'Vegan-friendly',
  vegan_options: 'Has vegan options',
}
