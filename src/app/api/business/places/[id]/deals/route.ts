import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePartnerPlace } from '@/lib/business/require-owner'
import { log } from '@/lib/logger'

const MAX_ACTIVE_DEALS = 3

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function clean(body: any) {
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : ''
  const details = typeof body.details === 'string' && body.details.trim() ? body.details.trim().slice(0, 400) : null
  const audience = body.audience === 'supporters' ? 'supporters' : 'everyone'
  const starts_on = typeof body.starts_on === 'string' && DATE_RE.test(body.starts_on) ? body.starts_on : new Date().toISOString().slice(0, 10)
  const ends_on = typeof body.ends_on === 'string' && DATE_RE.test(body.ends_on) ? body.ends_on : null
  return { title, details, audience, starts_on, ends_on }
}

function invalid(d: ReturnType<typeof clean>): string | null {
  if (d.title.length < 3) return 'Give the deal a short title, at least 3 characters.'
  if (d.ends_on && d.ends_on < d.starts_on) return 'The end date is before the start date.'
  return null
}

/** Active deals that still count towards the limit: not ended yet. */
async function liveCount(admin: any, placeId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const { count } = await admin.from('place_deals').select('id', { count: 'exact', head: true })
    .eq('place_id', placeId).eq('status', 'active').or(`ends_on.is.null,ends_on.gte.${today}`)
  return count ?? 0
}

async function revalidate(place: { id: string; slug: string | null }) {
  try {
    revalidatePath(`/place/${place.id}`)
    if (place.slug) revalidatePath(`/place/${place.slug}`)
  } catch (e) {
    log.error('[deals] revalidate failed', e)
  }
}

/** GET: all deals of the place (active and paused), newest first. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePartnerPlace(id)
  if (!gate.ok) return gate.response
  const { data } = await gate.admin.from('place_deals').select('*').eq('place_id', gate.place.id).order('created_at', { ascending: false })
  return NextResponse.json({ deals: data ?? [], max: MAX_ACTIVE_DEALS, plan: gate.plan })
}

/** POST: create a deal (active). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePartnerPlace(id)
  if (!gate.ok) return gate.response
  const d = clean(await req.json().catch(() => ({})))
  const err = invalid(d)
  if (err) return NextResponse.json({ error: err }, { status: 400 })
  if ((await liveCount(gate.admin, gate.place.id)) >= MAX_ACTIVE_DEALS) {
    return NextResponse.json({ error: `You can have ${MAX_ACTIVE_DEALS} active deals. Pause one first.` }, { status: 400 })
  }
  const { data, error } = await gate.admin.from('place_deals').insert({ ...d, place_id: gate.place.id, created_by: gate.userId }).select('*').single()
  if (error) {
    log.error('[deals] create failed', error)
    return NextResponse.json({ error: 'Saving the deal failed.' }, { status: 500 })
  }
  await revalidate(gate.place)
  return NextResponse.json({ deal: data })
}

/** PATCH: edit a deal, or pause / resume it. Body: { id, ...fields } or { id, status }. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePartnerPlace(id)
  if (!gate.ok) return gate.response
  const body = await req.json().catch(() => ({}))
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { data: existing } = await gate.admin.from('place_deals').select('id, status').eq('id', body.id).eq('place_id', gate.place.id).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  let update: Record<string, unknown>
  if (body.status === 'active' || body.status === 'paused') {
    if (body.status === 'active' && existing.status !== 'active') {
      if ((await liveCount(gate.admin, gate.place.id)) >= MAX_ACTIVE_DEALS) return NextResponse.json({ error: `You can have ${MAX_ACTIVE_DEALS} active deals. Pause one first.` }, { status: 400 })
    }
    update = { status: body.status }
  } else {
    const d = clean(body)
    const err = invalid(d)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
    update = d
  }
  const { data, error } = await gate.admin.from('place_deals').update({ ...update, updated_at: new Date().toISOString() }).eq('id', body.id).select('*').single()
  if (error) {
    log.error('[deals] update failed', error)
    return NextResponse.json({ error: 'Saving the deal failed.' }, { status: 500 })
  }
  await revalidate(gate.place)
  return NextResponse.json({ deal: data })
}
