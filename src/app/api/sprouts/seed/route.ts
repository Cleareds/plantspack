import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { seedTree } from '@/lib/sprouts'
import { sproutsOpenFor } from '@/lib/sprouts-constants'

export async function POST(req: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, reason: 'unauth' }, { status: 401 })
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).maybeSingle()
  if (!sproutsOpenFor((profile as any)?.role)) return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const amount = Math.floor(Number(body.amount) || 0)
  if (amount <= 0) return NextResponse.json({ ok: false, reason: 'bad_amount' }, { status: 400 })

  const r = await seedTree(user.id, amount)
  return NextResponse.json(r, { status: r.ok ? 200 : 400 })
}
