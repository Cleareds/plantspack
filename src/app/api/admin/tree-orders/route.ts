import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function checkAdmin() {
  const supabaseUser = await createClient()
  const { data: { session } } = await supabaseUser.auth.getSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return supabase
}

// GET /api/admin/tree-orders?status=queued|planted|all
export async function GET(req: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const status = req.nextUrl.searchParams.get('status') ?? 'queued'
  let q = supabase
    .from('real_world_tree_orders')
    .select('*, users(username, email)')
    .order('created_at', { ascending: true })
    .limit(100)
  if (status !== 'all') q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] })
}

// PATCH /api/admin/tree-orders  { id, status: 'planted', partner, partner_tree_id, tree_location, notes }
export async function PATCH(req: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const { id, status, partner, partner_tree_id, tree_location, notes } = body as Record<string, string>
  if (!id || !['planted', 'refunded', 'queued'].includes(status)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }
  const patch: Record<string, unknown> = {
    status,
    partner: partner || null,
    partner_tree_id: partner_tree_id || null,
    tree_location: tree_location || null,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  }
  if (status === 'planted') patch.planted_at = new Date().toISOString()
  const { data: order, error } = await supabase
    .from('real_world_tree_orders')
    .update(patch)
    .eq('id', id)
    .select('user_id')
    .single()
  if (error || !order) return NextResponse.json({ error: error?.message ?? 'not_found' }, { status: 500 })

  // tell the player their tree is in the ground. Uses the existing
  // 'announcement' type (the notifications type CHECK doesn't know about
  // trees yet - add a dedicated type when sprouts launch publicly).
  if (status === 'planted') {
    try {
      await supabase.from('notifications').insert({
        user_id: order.user_id,
        actor_id: null,
        type: 'announcement',
        message: tree_location
          ? `Your real tree has been planted in ${tree_location} 🌳 - grown from your Sprouts and your finished Vegan City.`
          : 'Your real tree has been planted 🌳 - grown from your Sprouts and your finished Vegan City.',
      })
    } catch { /* best-effort: fulfillment must not fail on a notification */ }
  }
  return NextResponse.json({ ok: true })
}
