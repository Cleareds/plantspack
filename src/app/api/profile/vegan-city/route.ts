import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { gameCitySummary } from '@/lib/sprouts'

export const dynamic = 'force-dynamic'

// GET /api/profile/vegan-city?userId=<uuid>
// The profile Vegan City card: game city summary + real planted trees.
// Phase 1: own data, or any data for admins (mirrors the SproutsCard gate).
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 })
  const admin = createAdminClient()
  if (user.id !== userId) {
    const { data: viewer } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
    if (viewer?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const [summary, { data: planted }, archived] = await Promise.all([
    gameCitySummary(userId),
    admin
      .from('real_world_tree_orders')
      .select('id, partner, partner_tree_id, tree_location, planted_at')
      .eq('user_id', userId)
      .eq('status', 'planted')
      .order('planted_at', { ascending: true })
      .limit(24),
    // finished-cities archive (tolerate the table not existing yet)
    admin
      .from('game_city_archive')
      .select('id, name, score, buildings, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(24)
      .then(({ data }) => data ?? [], () => []),
  ])
  return NextResponse.json({ ...summary, planted: planted ?? [], archived })
}
