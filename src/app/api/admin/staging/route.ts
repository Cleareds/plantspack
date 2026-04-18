import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

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
 * GET /api/admin/staging
 *   ?decision=pending|auto_import|needs_review|reject   (default: needs_review)
 *   ?source=<tag>
 *   ?country=<name>
 *   ?minScore=<n>
 *   ?page=<n>  (30 per page)
 *
 *   + tab=stats → counts per decision + vegan_level breakdown.
 */
export async function GET(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') ?? 'list'

  if (tab === 'stats') {
    const [
      { count: pending },
      { count: autoImport },
      { count: needsReview },
      { count: reject },
      { count: imported },
      { count: fullyVegan },
      { count: veganFriendly },
      { count: unknown },
    ] = await Promise.all([
      supabase.from('place_staging').select('id', { count: 'exact', head: true }).eq('decision', 'pending'),
      supabase.from('place_staging').select('id', { count: 'exact', head: true }).eq('decision', 'auto_import'),
      supabase.from('place_staging').select('id', { count: 'exact', head: true }).eq('decision', 'needs_review'),
      supabase.from('place_staging').select('id', { count: 'exact', head: true }).eq('decision', 'reject'),
      supabase.from('place_staging').select('id', { count: 'exact', head: true }).not('imported_place_id', 'is', null),
      supabase.from('place_staging').select('id', { count: 'exact', head: true }).eq('vegan_level', 'fully_vegan'),
      supabase.from('place_staging').select('id', { count: 'exact', head: true }).eq('vegan_level', 'vegan_friendly'),
      supabase.from('place_staging').select('id', { count: 'exact', head: true }).eq('vegan_level', 'unknown'),
    ])
    return NextResponse.json({
      stats: {
        pending: pending ?? 0,
        auto_import: autoImport ?? 0,
        needs_review: needsReview ?? 0,
        reject: reject ?? 0,
        imported: imported ?? 0,
        vegan_levels: { fully_vegan: fullyVegan ?? 0, vegan_friendly: veganFriendly ?? 0, unknown: unknown ?? 0 },
      },
    })
  }

  const decision = searchParams.get('decision') ?? 'needs_review'
  const source = searchParams.get('source')
  const country = searchParams.get('country')
  const minScore = Number(searchParams.get('minScore') ?? 0)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = 30
  const offset = (page - 1) * limit

  let q = supabase
    .from('place_staging')
    .select('*', { count: 'exact' })
    .eq('decision', decision)
    .order('quality_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (source) q = q.eq('source', source)
  if (country) q = q.eq('country', country)
  if (minScore > 0) q = q.gte('quality_score', minScore)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [], total: count ?? 0 })
}
