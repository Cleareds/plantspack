import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * GET /api/admin/business - admin overview of business owners: every claimed
 * place, its owner, plan, menu and deals, plus plans granted on places that
 * have no owner yet.
 */
export async function GET() {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient() as any
  const { data: me } = await admin.from('users').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [owners, plans, menus, deals, messages] = await Promise.all([
    admin.from('place_owners').select('place_id, user_id, verified_at').is('removed_at', null),
    admin.from('place_plans').select('place_id, status, source, billing_interval, current_period_end, note'),
    admin.from('place_menus').select('place_id, status, checked_at'),
    admin.from('place_deals').select('place_id, status'),
    admin.from('place_follower_messages').select('place_id, created_at, test_only').eq('test_only', false),
  ])
  const placeIds = [...new Set([...(owners.data || []).map((o: any) => o.place_id), ...(plans.data || []).map((p: any) => p.place_id)])]
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
    const lastMsg = (messages.data || []).filter((m: any) => m.place_id === id).map((m: any) => m.created_at).sort().at(-1) ?? null
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
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
  return NextResponse.json({ rows })
}
