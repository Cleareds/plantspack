import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { getCountryCoverage, matchCountry } from '@/lib/admin-data-quality'

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
 * GET /api/admin/data-quality/coverage/<country>
 *
 * Admin-only. Country drill-down: summary stats, city rollup, and the
 * full list of fully-vegan places with their verification/image/website
 * state. Same data the admin /admin/data-quality/<country> page consumes
 * but in a single JSON dump suitable for offline analysis.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ country: string }> }) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { country: raw } = await params
  const matched = matchCountry(decodeURIComponent(raw))
  if (!matched) {
    return NextResponse.json({ error: 'country not covered' }, { status: 404 })
  }
  const data = await getCountryCoverage(matched)
  if (!data) return NextResponse.json({ error: 'no data' }, { status: 404 })
  return NextResponse.json(data)
}
