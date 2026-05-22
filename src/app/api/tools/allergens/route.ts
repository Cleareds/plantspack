import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ allergens: [] })
  const { data } = await sb
    .from('user_preferences')
    .select('allergens')
    .eq('user_id', user.id)
    .maybeSingle()
  return NextResponse.json({ allergens: data?.allergens ?? [] })
}

export async function PUT(req: NextRequest) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { allergens?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const allergens = (body.allergens ?? [])
    .map((a) => String(a).trim().toLowerCase())
    .filter((a) => a.length > 0 && a.length < 40)
    .slice(0, 30)

  // Upsert into user_preferences (table exists, may not have a row yet)
  const { error } = await sb
    .from('user_preferences')
    .upsert({ user_id: user.id, allergens }, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ allergens })
}
