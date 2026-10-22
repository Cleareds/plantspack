import { NextRequest, NextResponse } from 'next/server'
import { requirePartnerPlace } from '@/lib/business/require-owner'
import { BUSINESS_TOOLS_PUBLIC } from '@/lib/business/launch'
import { log } from '@/lib/logger'

/**
 * Message the people who follow this place's city on PlantsPack.
 * One real message per place per calendar month. Delivered as an in-app
 * notification (no email, no push). While the business tools are in admin
 * preview, only test messages (to the sender) can be sent.
 */

function monthStart(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

async function followerIds(admin: any, place: { city: string | null; country: string | null }, exclude: string): Promise<string[]> {
  if (!place.city || !place.country) return []
  const ids: string[] = []
  for (let page = 0; page < 50; page++) {
    const { data } = await admin
      .from('user_followed_cities')
      .select('user_id')
      .eq('city', place.city)
      .eq('country', place.country)
      .order('user_id')
      .range(page * 1000, page * 1000 + 999)
    if (!data?.length) break
    for (const r of data) if (r.user_id !== exclude) ids.push(r.user_id)
    if (data.length < 1000) break
  }
  return [...new Set(ids)]
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePartnerPlace(id)
  if (!gate.ok) return gate.response
  const [followers, sent] = await Promise.all([
    followerIds(gate.admin, gate.place, gate.userId),
    gate.admin.from('place_follower_messages').select('message, recipients, test_only, created_at').eq('place_id', gate.place.id).order('created_at', { ascending: false }).limit(10),
  ])
  const sentThisMonth = (sent.data || []).some((m: any) => !m.test_only && m.created_at >= monthStart())
  return NextResponse.json({
    followers: followers.length,
    history: sent.data ?? [],
    canSend: !sentThisMonth && BUSINESS_TOOLS_PUBLIC && gate.plan.plan === 'partner',
    previewOnly: !BUSINESS_TOOLS_PUBLIC || gate.plan.plan !== 'partner',
    sentThisMonth,
    city: gate.place.city,
  })
}

/** POST { message, test }: test sends only to the sender. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePartnerPlace(id)
  if (!gate.ok) return gate.response
  const { admin, place } = gate
  const body = await req.json().catch(() => ({}))
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (message.length < 10 || message.length > 200) {
    return NextResponse.json({ error: 'Write between 10 and 200 characters.' }, { status: 400 })
  }
  const test = body.test !== false
  const url = `/place/${place.slug || place.id}`
  const text = `${place.name}: ${message}`

  if (test) {
    const { error } = await admin.from('notifications').insert({
      user_id: gate.userId, type: 'venue_update', entity_type: 'place', entity_id: place.id, message: text, url,
    })
    if (error) {
      log.error('[follower-message] test failed', error)
      return NextResponse.json({ error: 'The test message failed.' }, { status: 500 })
    }
    await admin.from('place_follower_messages').insert({ place_id: place.id, sent_by: gate.userId, message, recipients: 1, test_only: true })
    return NextResponse.json({ ok: true, test: true, recipients: 1 })
  }

  if (!BUSINESS_TOOLS_PUBLIC || gate.plan.plan !== 'partner') {
    return NextResponse.json({ error: 'Only test messages can be sent until the Partner plan is active for this place.' }, { status: 403 })
  }
  const { data: already } = await admin.from('place_follower_messages').select('id').eq('place_id', place.id).eq('test_only', false).gte('created_at', monthStart()).limit(1)
  if (already?.length) {
    return NextResponse.json({ error: 'You already sent this month’s message. The next one can go out on the 1st.' }, { status: 429 })
  }

  const ids = await followerIds(admin, place, gate.userId)
  for (let i = 0; i < ids.length; i += 500) {
    const rows = ids.slice(i, i + 500).map((uid) => ({ user_id: uid, type: 'venue_update', entity_type: 'place', entity_id: place.id, message: text, url }))
    const { error } = await admin.from('notifications').insert(rows)
    if (error) {
      log.error('[follower-message] batch failed', error)
      return NextResponse.json({ error: 'Sending failed part-way. Please contact hello@plantspack.com before trying again.' }, { status: 500 })
    }
  }
  await admin.from('place_follower_messages').insert({ place_id: place.id, sent_by: gate.userId, message, recipients: ids.length, test_only: false })
  return NextResponse.json({ ok: true, test: false, recipients: ids.length })
}
