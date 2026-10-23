import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { getCountrySummaries } from '@/lib/admin-data-quality'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function checkAdmin() {
  const supabaseUser = await createClient()
  const { data: { session } } = await supabaseUser.auth.getSession()
  if (!session) return false
  const sb = createAdminClient()
  const { data: profile } = await sb.from('users').select('role').eq('id', session.user.id).single()
  return profile?.role === 'admin'
}

/**
 * GET /api/admin/data-quality/countries[?refresh=1]
 *
 * Admin-only. Light rollup for EVERY country with a live place: totals,
 * fully-vegan checked/unchecked, missing website/image, odd city labels,
 * last audit date. Feeds the Country audits picker on /admin/data-quality.
 */
export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const force = req.nextUrl.searchParams.get('refresh') === '1'
  const countries = await getCountrySummaries(force)
  return NextResponse.json({ generated_at: new Date().toISOString(), countries })
}
