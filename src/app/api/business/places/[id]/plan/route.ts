import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePlaceOwner } from '@/lib/business/require-owner'
import { getPlacePlan } from '@/lib/business/plan'

/**
 * POST { action: 'grant' | 'revoke', note? } - admin only.
 * Grants or ends a Partner plan without Stripe (founding venues, tests).
 * A Stripe-paid plan is never overwritten here.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  if (!gate.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : null

  const { data: existing } = await gate.admin.from('place_plans').select('source, status').eq('place_id', gate.place.id).maybeSingle()
  if (existing?.source === 'stripe' && existing.status !== 'canceled') {
    return NextResponse.json({ error: 'This place pays through Stripe. Change it in Stripe instead.' }, { status: 409 })
  }

  const now = new Date().toISOString()
  if (body.action === 'grant') {
    const { error } = await gate.admin.from('place_plans').upsert({
      place_id: gate.place.id, plan: 'partner', status: 'active', source: 'admin',
      granted_by: gate.userId, note, current_period_end: null, updated_at: now,
    }, { onConflict: 'place_id' })
    if (error) return NextResponse.json({ error: 'Saving failed' }, { status: 500 })
  } else if (body.action === 'revoke') {
    const { error } = await gate.admin.from('place_plans').update({ status: 'canceled', note, updated_at: now }).eq('place_id', gate.place.id)
    if (error) return NextResponse.json({ error: 'Saving failed' }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  // Deals visibility follows the plan, so the place page must refresh.
  try {
    revalidatePath(`/place/${gate.place.id}`)
    if (gate.place.slug) revalidatePath(`/place/${gate.place.slug}`)
  } catch { /* logged by Next */ }
  return NextResponse.json({ plan: await getPlacePlan(gate.admin, gate.place.id) })
}
