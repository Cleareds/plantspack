import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePlaceOwner } from '@/lib/business/require-owner'
import { getPlacePlan } from '@/lib/business/plan'
import { BUSINESS_TOOLS_PUBLIC } from '@/lib/business/launch'
import { log } from '@/lib/logger'

/**
 * Venue events (free tool) + one featured slot per month (Partner).
 * Events are posts (category 'event') linked to the place. While the tools
 * are in admin preview, new events are saved as drafts so nothing reaches the
 * public calendar. The title is fixed after creation because changing a
 * post title regenerates its URL.
 */

const monthKey = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10)

function cleanFields(body: any) {
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : ''
  const start = typeof body.start_time === 'string' && !isNaN(Date.parse(body.start_time)) ? new Date(body.start_time).toISOString() : null
  const end = typeof body.end_time === 'string' && body.end_time && !isNaN(Date.parse(body.end_time)) ? new Date(body.end_time).toISOString() : null
  const ticket = typeof body.ticket_url === 'string' && /^https?:\/\//i.test(body.ticket_url.trim()) ? body.ticket_url.trim().slice(0, 500) : null
  return { description, start, end, ticket }
}

async function refresh(place: { id: string; slug: string | null }) {
  try {
    revalidatePath(`/place/${place.id}`)
    if (place.slug) revalidatePath(`/place/${place.slug}`)
    revalidatePath('/events')
  } catch (e) {
    log.error('[venue-events] revalidate failed', e)
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  const [{ data: events }, { data: feature }, plan] = await Promise.all([
    gate.admin.from('posts').select('id, slug, title, content, privacy, event_data, created_at').eq('place_id', gate.place.id).eq('category', 'event').is('deleted_at', null).order('created_at', { ascending: false }).limit(50),
    gate.admin.from('event_features').select('post_id, month').eq('place_id', gate.place.id).eq('month', monthKey()).maybeSingle(),
    getPlacePlan(gate.admin, gate.place.id),
  ])
  return NextResponse.json({
    events: events ?? [],
    featuredThisMonth: feature?.post_id ?? null,
    canFeature: plan.plan === 'partner' || gate.isAdmin,
    isPartner: plan.plan === 'partner',
    preview: !BUSINESS_TOOLS_PUBLIC,
  })
}

/** POST { title, description, start_time, end_time?, ticket_url? }: create an event at this place. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  const body = await req.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : ''
  const f = cleanFields(body)
  if (title.length < 3) return NextResponse.json({ error: 'Give the event a title.' }, { status: 400 })
  if (!f.start) return NextResponse.json({ error: 'Choose when the event starts.' }, { status: 400 })
  if (Date.parse(f.start) < Date.now() - 3600_000) return NextResponse.json({ error: 'The start time is in the past.' }, { status: 400 })
  if (f.end && f.end < f.start) return NextResponse.json({ error: 'The end is before the start.' }, { status: 400 })

  const location = [gate.place.name, gate.place.city, gate.place.country].filter(Boolean).join(', ')
  const { data, error } = await gate.admin.from('posts').insert({
    user_id: gate.userId,
    title,
    content: f.description || title,
    category: 'event',
    privacy: BUSINESS_TOOLS_PUBLIC ? 'public' : 'draft',
    place_id: gate.place.id,
    event_data: { start_time: f.start, end_time: f.end ?? undefined, location, ticket_url: f.ticket ?? undefined, is_recurring: false },
  }).select('id, slug').single()
  if (error) {
    log.error('[venue-events] create failed', error)
    return NextResponse.json({ error: 'Saving the event failed.' }, { status: 500 })
  }
  await refresh(gate.place)
  return NextResponse.json({ event: data })
}

/**
 * PATCH { postId, action: 'edit' | 'cancel' | 'feature', ...fields }
 * - edit: description, times, ticket link (not the title)
 * - cancel: marks the event cancelled (it is never deleted)
 * - feature: this month's featured slot (Partner); replaces an earlier pick
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  const body = await req.json().catch(() => ({}))
  if (typeof body.postId !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { data: ev } = await gate.admin.from('posts').select('id, event_data, privacy').eq('id', body.postId).eq('place_id', gate.place.id).eq('category', 'event').is('deleted_at', null).maybeSingle()
  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  if (body.action === 'feature') {
    const plan = await getPlacePlan(gate.admin, gate.place.id)
    if (plan.plan !== 'partner' && !gate.isAdmin) return NextResponse.json({ error: 'Featuring an event is part of the Partner plan.', needsPlan: true }, { status: 402 })
    if (!ev.event_data?.start_time || Date.parse(ev.event_data.start_time) < Date.now() || ev.event_data?.cancelled) {
      return NextResponse.json({ error: 'Only an upcoming event can be featured.' }, { status: 400 })
    }
    const { error } = await gate.admin.from('event_features').upsert({ place_id: gate.place.id, post_id: ev.id, month: monthKey(), created_by: gate.userId }, { onConflict: 'place_id,month' })
    if (error) return NextResponse.json({ error: 'Saving failed.' }, { status: 500 })
    await refresh(gate.place)
    return NextResponse.json({ ok: true, featured: ev.id })
  }

  const data = { ...(ev.event_data || {}) }
  if (body.action === 'cancel') {
    data.cancelled = true
  } else {
    const f = cleanFields(body)
    if (!f.start) return NextResponse.json({ error: 'Choose when the event starts.' }, { status: 400 })
    if (f.end && f.end < f.start) return NextResponse.json({ error: 'The end is before the start.' }, { status: 400 })
    data.start_time = f.start
    if (f.end) data.end_time = f.end; else delete data.end_time
    if (f.ticket) data.ticket_url = f.ticket; else delete data.ticket_url
  }
  const update: Record<string, unknown> = { event_data: data, updated_at: new Date().toISOString() }
  if (body.action !== 'cancel' && typeof body.description === 'string' && body.description.trim()) update.content = body.description.trim().slice(0, 2000)
  const { error } = await gate.admin.from('posts').update(update).eq('id', ev.id)
  if (error) {
    log.error('[venue-events] update failed', error)
    return NextResponse.json({ error: 'Saving failed.' }, { status: 500 })
  }
  await refresh(gate.place)
  return NextResponse.json({ ok: true })
}
