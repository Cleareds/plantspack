import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { detectCategory } from '@/lib/places/categorize'

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
 * POST /api/admin/staging/[id]/action
 *   body: { action: 'approve' | 'reject' | 'escalate', note?: string }
 *
 * - approve → insert into `places`, link staging row via imported_place_id
 * - reject  → mark operator_action='rejected'
 * - escalate → mark operator_action='escalated' (stays pending)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, userId } = ctx
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = body?.action as 'approve' | 'reject' | 'escalate' | undefined
  if (!['approve', 'reject', 'escalate'].includes(action ?? '')) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data: row, error: loadErr } = await supabase
    .from('place_staging').select('*').eq('id', id).single()
  if (loadErr || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date().toISOString()

  if (action === 'reject' || action === 'escalate') {
    const { error } = await supabase.from('place_staging').update({
      operator_action: action === 'reject' ? 'rejected' : 'escalated',
      operator_user_id: userId,
      operator_note: body?.note ?? null,
      operator_decided_at: now,
      // leave decision alone — operator action is a separate column.
      updated_at: now,
    }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action })
  }

  // approve → insert into places via the shared decideIntake index would be
  // overkill for a single row; here we just build a safe row and insert.
  const cat = detectCategory({
    name: row.name,
    fsqCategoryNames: row.categories ?? [],
  })

  const veganLevel = row.vegan_level === 'fully_vegan' ? 'fully_vegan' : 'vegan_friendly'

  const placeRow = {
    name: String(row.name).slice(0, 200),
    address: row.address || row.city || row.country || 'Unknown',
    city: row.city,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    website: row.website,
    vegan_level: veganLevel,
    source: row.source,
    source_id: row.source_id,
    foursquare_id: row.source.startsWith('foursquare-') ? row.source_id : null,
    foursquare_status: row.source.startsWith('foursquare-') ? 'matched' : null,
    foursquare_checked_at: row.source.startsWith('foursquare-') ? now : null,
    foursquare_data: row.website_signal,
    category: cat.category,
    categorization_note: cat.note,
    tags: ['staging-approved', row.source],
    is_verified: true,                       // admin-approved → verified
    verification_status: 'admin_verified',
    created_by: ADMIN_USER_ID,
  }

  const { data: inserted, error: insErr } = await supabase
    .from('places').insert(placeRow).select('id, slug').single()
  if (insErr) return NextResponse.json({ error: `insert place: ${insErr.message}` }, { status: 500 })

  const { error: linkErr } = await supabase.from('place_staging').update({
    operator_action: 'approved',
    operator_user_id: userId,
    operator_note: body?.note ?? null,
    operator_decided_at: now,
    imported_place_id: inserted!.id,
    updated_at: now,
  }).eq('id', id)
  if (linkErr) return NextResponse.json({ error: `link staging: ${linkErr.message}` }, { status: 500 })

  const { revalidatePath } = await import('next/cache')
  if (inserted?.slug) revalidatePath(`/place/${inserted.slug}`)

  return NextResponse.json({ success: true, action: 'approve', place_id: inserted!.id, slug: inserted!.slug })
}
