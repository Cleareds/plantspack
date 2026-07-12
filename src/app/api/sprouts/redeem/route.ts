import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { redeem } from '@/lib/sprouts'
import { sproutsOpenFor } from '@/lib/sprouts-constants'

const ALLOWED = new Set(['cleareds_discount_50pct', 'real_tree', 'supporter_month', 'featured_placement_7d'])

export async function POST(req: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, reason: 'unauth' }, { status: 401 })
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).maybeSingle()
  if (!sproutsOpenFor((profile as any)?.role)) return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const rewardType = body.rewardType as string
  if (!ALLOWED.has(rewardType)) return NextResponse.json({ ok: false, reason: 'bad_reward' }, { status: 400 })

  const r = await redeem({ userId: user.id, rewardType: rewardType as any, payload: body.payload ?? {} })
  return NextResponse.json(r, { status: r.ok ? 200 : 400 })
}
