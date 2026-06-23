import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { approveSubmission } from '@/lib/submissions/approve'

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

/**
 * POST /api/admin/submissions/[id]/action
 *   body: { action: 'approve' | 'reject', vegan_level?: string, note?: string }
 *
 * - approve → delegates to approveSubmission(): inserts the place (community
 *   semantics, NOT admin-verified), geocodes if needed, creates a feed post by
 *   the submitter, and notifies the submitter + nearby users. Per CLAUDE.md the
 *   place lands is_verified=false / verification_method='community_submission'.
 * - reject → mark status='rejected' with an optional note.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, userId } = ctx
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = body?.action as 'approve' | 'reject' | undefined
  if (!['approve', 'reject'].includes(action ?? '')) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data: row, error: loadErr } = await supabase
    .from('place_submissions').select('*').eq('id', id).single()
  if (loadErr || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (row.status !== 'pending') {
    return NextResponse.json({ error: 'Already reviewed', already: row.status, imported_place_id: row.imported_place_id }, { status: 409 })
  }

  const now = new Date().toISOString()

  if (action === 'reject') {
    const { error } = await supabase.from('place_submissions').update({
      status: 'rejected',
      review_note: body?.note ?? null,
      reviewed_by: userId,
      reviewed_at: now,
    }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action })
  }

  // approve → shared helper (insert place + feed post + notify submitter +
  // nearby users + geocode). Unverified community semantics, not admin_review.
  const result = await approveSubmission(id, { reviewerId: userId, veganLevel: body?.vegan_level, reviewNote: body?.note })
  if (!result.ok) {
    if (result.already) return NextResponse.json({ error: 'Already reviewed', already: result.already }, { status: 409 })
    return NextResponse.json({ error: result.error || 'Approve failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true, action, place_id: result.placeId, slug: result.slug, nearby_notified: result.nearbyNotified })
}
