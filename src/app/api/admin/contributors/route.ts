import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const sb = createAdminClient()

  // Get users who have at least one non-archived place (excluding the admin bulk-import user)
  const { data: adminUser } = await sb.from('users').select('id').eq('username', 'admin').single()
  const adminId = adminUser?.id

  const { data, error } = await sb
    .from('places')
    .select('created_by, users(id, username)')
    .is('archived_at', null)
    .not('created_by', 'is', null)
    .neq('created_by', adminId ?? '')
    .limit(10000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<string, { username: string; count: number }> = {}
  for (const row of (data ?? []) as any[]) {
    const u = Array.isArray(row.users) ? row.users[0] : row.users
    if (!u?.username) continue
    if (!counts[row.created_by]) counts[row.created_by] = { username: u.username, count: 0 }
    counts[row.created_by].count++
  }

  const contributors = Object.entries(counts)
    .map(([id, { username, count }]) => ({ id, username, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json(contributors)
}
