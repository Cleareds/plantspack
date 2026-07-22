import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/places/[id]/request-verification — Supporter perk.
 *
 * Lets a paying supporter ask us to verify/deep-check a specific place. Writes
 * a place_corrections row flagged `proposed_action: 'verification_request'` so
 * it lands in the admin data-quality review queue. Deduped per user+place.
 * [id] is the place UUID. Auth from the session cookie only.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: placeId } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: me } = await admin
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()
  if (!['medium', 'premium'].includes(me?.subscription_tier || '')) {
    return NextResponse.json({ error: 'Requesting verification is a Supporter perk.' }, { status: 403 })
  }

  const { data: place } = await admin.from('places').select('id').eq('id', placeId).maybeSingle()
  if (!place) return NextResponse.json({ error: 'Place not found.' }, { status: 404 })

  // Dedup: don't stack multiple open requests from the same supporter.
  const { data: existing } = await admin
    .from('place_corrections')
    .select('id')
    .eq('place_id', placeId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .contains('corrections', { proposed_action: 'verification_request' })
    .maybeSingle()
  if (existing) return NextResponse.json({ ok: true, alreadyRequested: true })

  const { error } = await admin.from('place_corrections').insert({
    place_id: placeId,
    user_id: user.id,
    status: 'pending',
    corrections: { proposed_action: 'verification_request' },
    note: 'Supporter requested a verification of this place.',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
