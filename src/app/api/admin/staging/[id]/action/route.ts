import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { detectCategory } from '@/lib/places/categorize'

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
 * POST /api/admin/staging/[id]/action
 *   body: {
 *     action: 'approve' | 'approve_fully_vegan' | 'reject' | 'escalate',
 *     note?: string,
 *   }
 *
 * - approve             → insert into `places` as vegan_friendly (safe default)
 * - approve_fully_vegan → insert into `places` as fully_vegan (admin explicitly claims 100%)
 * - reject              → mark operator_action='rejected'
 * - escalate            → mark operator_action='escalated' (stays pending)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, userId } = ctx
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = body?.action as 'approve' | 'approve_fully_vegan' | 'approve_mostly_vegan' | 'approve_vegan_options' | 'reject' | 'escalate' | undefined
  if (!['approve', 'approve_fully_vegan', 'approve_mostly_vegan', 'approve_vegan_options', 'reject', 'escalate'].includes(action ?? '')) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data: row, error: loadErr } = await supabase
    .from('place_staging').select('*').eq('id', id).single()
  if (loadErr || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Guard against double-triage: if the row was already acted on (manually or
  // by the overnight auto-insert), bail out with 409 so the UI can show a
  // clear "already handled" message instead of silently creating a duplicate
  // place or erroring on a unique constraint.
  if (row.operator_action || row.imported_place_id) {
    return NextResponse.json({
      error: 'Already triaged',
      already: row.operator_action ?? 'imported',
      imported_place_id: row.imported_place_id,
      note: row.operator_note,
    }, { status: 409 })
  }

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

  // approve / approve_fully_vegan → insert into places.
  const cat = detectCategory({
    name: row.name,
    fsqCategoryNames: row.categories ?? [],
  })

  // CLAUDE.md: never mark fully_vegan without verification. Default to
  // vegan_friendly regardless of classifier signal; admin must explicitly
  // choose the tier.
  const veganLevel =
    action === 'approve_fully_vegan'   ? 'fully_vegan'   :
    action === 'approve_mostly_vegan'  ? 'mostly_vegan'  :
    action === 'approve_vegan_options' ? 'vegan_options' :
    'vegan_friendly'

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
    tags: ['staging-approved', row.source, ...(veganLevel !== 'vegan_friendly' ? [`admin-claimed-${veganLevel}`] : [])],
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

  return NextResponse.json({ success: true, action, vegan_level: veganLevel, place_id: inserted!.id, slug: inserted!.slug })
}
