import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const VALID_REPORTED_TYPES = ['place', 'place_review', 'post', 'comment', 'user'] as const
const VALID_REASONS = ['spam', 'inappropriate', 'wrong_info', 'not_vegan', 'closed', 'duplicate', 'other'] as const

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: { reported_type?: string; reported_id?: string; reason?: string; description?: string; detail?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Accept both legacy field names (target_type/target_id/detail) and the
  // existing schema field names (reported_type/reported_id/description).
  const reported_type = body.reported_type ?? (body as any).target_type
  const reported_id = body.reported_id ?? (body as any).target_id
  const reason = body.reason
  const description = (body.description ?? body.detail ?? '').slice(0, 500)

  if (!reported_type || !reported_id || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(VALID_REPORTED_TYPES as readonly string[]).includes(reported_type)) {
    return NextResponse.json({ error: 'Invalid reported_type' }, { status: 400 })
  }
  if (!(VALID_REASONS as readonly string[]).includes(reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    reported_type,
    reported_id,
    reason,
    description: description || null,
  })

  if (error) {
    if (error.message?.toLowerCase().includes('banned') || error.message?.toLowerCase().includes('not authorized')) {
      return NextResponse.json({ error: 'Account restricted' }, { status: 403 })
    }
    if (error.message?.includes('duplicate')) {
      // Already reported by this user — not a hard error, just return success
      return NextResponse.json({ success: true, alreadyReported: true })
    }
    console.error('reports insert error:', error.message)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
