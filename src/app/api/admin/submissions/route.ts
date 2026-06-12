import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

// User submissions change on every admin action — never cache.
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

/**
 * GET /api/admin/submissions
 *   ?status=pending|approved|rejected   (default: pending)
 *   ?page=<n>  (30 per page)
 *
 * Lists places suggested by users from the mobile app, plus per-status counts.
 * Joins the submitter's username/email for context.
 */
export async function GET(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'pending'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = 30
  const offset = (page - 1) * limit

  const [counts, list] = await Promise.all([
    Promise.all([
      supabase.from('place_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('place_submissions').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('place_submissions').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    ]),
    supabase
      .from('place_submissions')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: status === 'pending' })
      .range(offset, offset + limit - 1),
  ])

  const [{ count: pending }, { count: approved }, { count: rejected }] = counts
  const { data, count, error } = list
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // user_id references auth.users, so resolve submitter handles separately.
  const rows = data ?? []
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
  let submitters: Record<string, { username: string | null; email: string | null }> = {}
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, username, email').in('id', userIds)
    submitters = Object.fromEntries((users ?? []).map((u) => [u.id, { username: u.username, email: u.email }]))
  }
  const withSubmitter = rows.map((r) => ({ ...r, submitter: submitters[r.user_id] ?? null }))

  return NextResponse.json({
    rows: withSubmitter,
    total: count ?? 0,
    stats: { pending: pending ?? 0, approved: approved ?? 0, rejected: rejected ?? 0 },
  })
}
