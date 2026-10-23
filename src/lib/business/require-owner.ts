import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAuthority } from '@/lib/place-owner'
import { BUSINESS_TOOLS_PUBLIC } from '@/lib/business/launch'
import { getPlacePlan, type PlacePlan } from '@/lib/business/plan'
import { isPlaceLive } from '@/lib/business/live'

export interface OwnerPlace {
  id: string
  slug: string | null
  name: string
  city: string | null
  country: string | null
  vegan_level: string | null
  category?: string
  main_image_url?: string | null
}

export type OwnerGate =
  | { ok: true; userId: string; isAdmin: boolean; place: OwnerPlace; admin: any }
  | { ok: false; response: NextResponse }

/**
 * Server gate for every business-tool API: signed in, and the active owner of
 * this place or an admin. Returns a service-role client for the writes, which
 * is safe only because this check ran first.
 */
export async function requirePlaceOwner(placeId: string): Promise<OwnerGate> {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Please sign in' }, { status: 401 }) }
  }
  const admin = createAdminClient() as any
  const { data: place } = await admin
    .from('places')
    .select('id, slug, name, city, country, vegan_level, category, main_image_url')
    .eq('id', placeId)
    .maybeSingle()
  if (!place) {
    return { ok: false, response: NextResponse.json({ error: 'Place not found' }, { status: 404 }) }
  }
  const authority = await getAuthority(admin, user.id, place.id)
  if (!authority.role) {
    return { ok: false, response: NextResponse.json({ error: 'Only the verified owner of this place can do this' }, { status: 403 }) }
  }
  if (!BUSINESS_TOOLS_PUBLIC && !authority.isAdmin && !(await isPlaceLive(admin, place.id))) {
    return { ok: false, response: NextResponse.json({ error: 'Owner tools are coming soon.' }, { status: 403 }) }
  }
  return { ok: true, userId: user.id, isAdmin: authority.isAdmin, place, admin }
}

export type PartnerGate =
  | { ok: true; userId: string; isAdmin: boolean; place: OwnerPlace; admin: any; plan: PlacePlan }
  | { ok: false; response: NextResponse }

/**
 * Gate for paid tools: the owner of a place with an active Partner plan, or
 * an admin (admins can use and test every paid tool on any place).
 */
export async function requirePartnerPlace(placeId: string): Promise<PartnerGate> {
  const gate = await requirePlaceOwner(placeId)
  if (!gate.ok) return gate
  const plan = await getPlacePlan(gate.admin, gate.place.id)
  if (plan.plan !== 'partner' && !gate.isAdmin) {
    return { ok: false, response: NextResponse.json({ error: 'This tool is part of the Partner plan.', needsPlan: true }, { status: 402 }) }
  }
  return { ...gate, plan }
}
