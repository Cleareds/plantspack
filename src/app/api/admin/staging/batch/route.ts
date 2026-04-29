import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { detectCategory } from '@/lib/places/categorize'
import { normalizeCity } from '@/lib/normalize-city'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabaseUser = await createClient()
  const { data: { session } } = await supabaseUser.auth.getSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('users').select('id, role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return { supabase, userId: profile.id }
}

const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

/**
 * POST /api/admin/staging/batch
 *   body:
 *     { action: 'approve_all_above_score', decision: 'auto_import', threshold: 85, source?, country?, limit? }
 *     { action: 'reject_all', decision: 'needs_review', ... }
 *
 * Batch-approves or rejects whole cohorts. Intended for bulk operations
 * after an operator has spot-checked a sample and is confident in the group.
 */
export async function POST(request: NextRequest) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, userId } = ctx
  const body = await request.json()
  const action = body.action as string
  const decision = body.decision as string

  if (!['approve_all_above_score', 'reject_all'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const threshold = Number(body.threshold ?? 0)
  const source = body.source as string | undefined
  const country = body.country as string | undefined
  const maxLimit = Number(body.limit ?? 2000)  // safety cap

  let q = supabase.from('place_staging').select('*').eq('decision', decision).is('operator_action', null)
  if (threshold > 0) q = q.gte('quality_score', threshold)
  if (source) q = q.eq('source', source)
  if (country) q = q.eq('country', country)
  q = q.limit(maxLimit)
  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ success: true, affected: 0 })

  const now = new Date().toISOString()

  if (action === 'reject_all') {
    const ids = rows.map(r => r.id)
    const { error: upErr } = await supabase.from('place_staging').update({
      operator_action: 'rejected',
      operator_user_id: userId,
      operator_note: body.note ?? `batch_reject`,
      operator_decided_at: now,
      updated_at: now,
    }).in('id', ids)
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    return NextResponse.json({ success: true, affected: ids.length })
  }

  // approve_all_above_score: build places rows and insert
  const placeRows = rows.map(row => {
    const cat = detectCategory({
      name: row.name,
      fsqCategoryNames: row.categories ?? [],
    })
    return {
      name: String(row.name).slice(0, 200),
      address: row.address || row.city || row.country || 'Unknown',
      city: normalizeCity(row.city, row.country) || row.city,
      country: row.country,
      latitude: row.latitude,
      longitude: row.longitude,
      phone: row.phone,
      website: row.website,
      vegan_level: row.vegan_level === 'fully_vegan' ? 'fully_vegan' : 'vegan_friendly',
      source: row.source,
      source_id: row.source_id,
      foursquare_id: row.source.startsWith('foursquare-') ? row.source_id : null,
      foursquare_status: row.source.startsWith('foursquare-') ? 'matched' : null,
      foursquare_checked_at: row.source.startsWith('foursquare-') ? now : null,
      foursquare_data: row.website_signal,
      category: cat.category,
      categorization_note: cat.note,
      tags: ['staging-approved', 'batch-approved', row.source],
      is_verified: true,
      verification_status: 'admin_verified',
      created_by: ADMIN_USER_ID,
    }
  })

  // Insert in 200-row chunks + track inserted ids back to staging.
  let inserted = 0, failed = 0
  const staging_id_by_index = rows.map(r => r.id)
  for (let i = 0; i < placeRows.length; i += 200) {
    const chunk = placeRows.slice(i, i + 200)
    const { data: ins, error: insErr } = await supabase
      .from('places').insert(chunk).select('id')
    if (insErr) {
      failed += chunk.length
      continue
    }
    // Link each inserted place back to its staging row (1:1 by order).
    for (let j = 0; j < (ins?.length ?? 0); j++) {
      const stagingId = staging_id_by_index[i + j]
      const placeId = ins![j].id
      await supabase.from('place_staging').update({
        operator_action: 'approved',
        operator_user_id: userId,
        operator_note: body.note ?? `batch_approve (>= ${threshold})`,
        operator_decided_at: now,
        imported_place_id: placeId,
        updated_at: now,
      }).eq('id', stagingId)
      inserted++
    }
  }

  return NextResponse.json({ success: true, inserted, failed, total_candidates: rows.length })
}
