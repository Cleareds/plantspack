import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/** GET/POST the signed-in user's monthly owner report preference. */
async function currentUserId(): Promise<string | null> {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const { data } = await (createAdminClient() as any)
    .from('users').select('owner_report_opt_out').eq('id', userId).single()
  return NextResponse.json({ monthlyReport: !data?.owner_report_opt_out })
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (typeof body.monthlyReport !== 'boolean') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { error } = await (createAdminClient() as any)
    .from('users').update({ owner_report_opt_out: !body.monthlyReport }).eq('id', userId)
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ monthlyReport: body.monthlyReport })
}
