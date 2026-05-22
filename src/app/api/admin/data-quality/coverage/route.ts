import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { getAllCoverages } from '@/lib/admin-data-quality'

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
 * GET /api/admin/data-quality/coverage
 *
 * Admin-only. Returns per-country summary stats for every country that
 * has a card on /admin/data-quality (Belgium + the six countries from
 * the May 2026 coverage push + Germany). Used by the admin Country
 * audits panel and for ad-hoc internal reporting.
 */
export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const countries = await getAllCoverages()
  return NextResponse.json({
    generated_at: new Date().toISOString(),
    countries,
  })
}
