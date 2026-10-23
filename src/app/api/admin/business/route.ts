import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * GET /api/admin/business - admin overview of business owners: every claimed
 * place, its owner, plan, menu and deals, plus plans granted on places that
 * have no owner yet.
 */
async function requireAdmin() {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const admin = createAdminClient() as any
  const { data: me } = await admin.from('users').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { admin, userId: user.id as string }
}

/** POST { placeId, pilot: boolean, note? }: add or remove a pilot place. */
export async function POST(req: NextRequest) {
  const a = await requireAdmin()
  if ('error' in a) return a.error
  const body = await req.json().catch(() => ({}))
  if (typeof body.placeId !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { error } = body.pilot
    ? await a.admin.from('business_pilots').upsert({ place_id: body.placeId, added_by: a.userId, note: typeof body.note === 'string' ? body.note.slice(0, 200) : null }, { onConflict: 'place_id' })
    : await a.admin.from('business_pilots').delete().eq('place_id', body.placeId)
  if (error) return NextResponse.json({ error: 'Saving failed' }, { status: 500 })
  // Pilot status changes what the place page shows to everyone.
  const { data: p } = await a.admin.from('places').select('id, slug').eq('id', body.placeId).maybeSingle()
  try { if (p) { revalidatePath(`/place/${p.id}`); if (p.slug) revalidatePath(`/place/${p.slug}`) } } catch { /* best effort */ }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const a = await requireAdmin()
  if ('error' in a) return a.error
  const admin = a.admin

  const [owners, plans, menus, deals, messages, pilots] = await Promise.all([
    admin.from('place_owners').select('place_id, user_id, verified_at').is('removed_at', null),
    admin.from('place_plans').select('place_id, status, source, billing_interval, current_period_end, note'),
    admin.from('place_menus').select('place_id, status, checked_at'),
    admin.from('place_deals').select('place_id, status, title, details, audience, ends_on'),
    admin.from('place_follower_messages').select('place_id, created_at, test_only, message, recipients').order('created_at', { ascending: false }).limit(500),
    admin.from('business_pilots').select('place_id, note'),
  ])
  const pilotMap = new Map((pilots.data || []).map((p: any) => [p.place_id, p.note]))
  const placeIds = [...new Set([...(owners.data || []).map((o: any) => o.place_id), ...(plans.data || []).map((p: any) => p.place_id), ...pilotMap.keys()])]
  const { data: venueEvents } = placeIds.length
    ? await admin.from('posts').select('id, place_id, title, privacy, event_data').eq('category', 'event').is('deleted_at', null).in('place_id', placeIds).order('created_at', { ascending: false }).limit(300)
    : { data: [] }
  const userIds = [...new Set((owners.data || []).map((o: any) => o.user_id))]
  const [places, users] = await Promise.all([
    placeIds.length ? admin.from('places').select('id, slug, name, city, country, vegan_level, archived_at').in('id', placeIds) : { data: [] },
    userIds.length ? admin.from('users').select('id, username, email').in('id', userIds) : { data: [] },
  ])
  const by = <T,>(rows: T[] | null, key: keyof T) => new Map((rows || []).map((r) => [r[key] as unknown as string, r]))
  const placeMap = by<any>(places.data, 'id')
  const userMap = by<any>(users.data, 'id')
  const planMap = by<any>(plans.data, 'place_id')
  const menuMap = by<any>(menus.data, 'place_id')
  const ownerMap = by<any>(owners.data, 'place_id')

  const rows = placeIds.map((id) => {
    const o = ownerMap.get(id)
    const p = placeMap.get(id)
    const plan = planMap.get(id)
    const menu = menuMap.get(id)
    const u = o ? userMap.get(o.user_id) : null
    const placeDeals = (deals.data || []).filter((d: any) => d.place_id === id)
    const placeMsgs = (messages.data || []).filter((m: any) => m.place_id === id)
    const lastReal = placeMsgs.find((m: any) => !m.test_only)
    const lastMsg = lastReal?.created_at ?? null
    return {
      placeId: id,
      name: p?.name ?? '(unknown place)',
      slug: p?.slug ?? null,
      where: [p?.city, p?.country].filter(Boolean).join(', '),
      archived: !!p?.archived_at,
      owner: u ? { username: u.username, email: u.email, since: o.verified_at } : null,
      plan: plan ? { status: plan.status, source: plan.source, interval: plan.billing_interval, periodEnd: plan.current_period_end, note: plan.note } : null,
      menu: menu ? { status: menu.status, checkedAt: menu.checked_at } : null,
      deals: { active: placeDeals.filter((d: any) => d.status === 'active').length, total: placeDeals.length },
      lastMessage: lastMsg,
      pilot: pilotMap.has(id),
      pilotNote: pilotMap.get(id) ?? null,
      texts: {
        deals: placeDeals.map((d: any) => ({ title: d.title, details: d.details, status: d.status, audience: d.audience, ends_on: d.ends_on })),
        messages: placeMsgs.slice(0, 3).map((m: any) => ({ message: m.message, at: m.created_at, test: m.test_only, recipients: m.recipients })),
        events: (venueEvents || []).filter((e: any) => e.place_id === id).slice(0, 5).map((e: any) => ({ title: e.title, privacy: e.privacy, start: e.event_data?.start_time ?? null, cancelled: !!e.event_data?.cancelled })),
      },
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
  return NextResponse.json({ rows })
}
