import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
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
const VALID_LEVELS = ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options']

/**
 * POST /api/admin/submissions/[id]/action
 *   body: { action: 'approve' | 'reject', vegan_level?: string, note?: string }
 *
 * - approve → insert into `places` from the submission. Per CLAUDE.md honesty
 *   rules a user suggestion is NOT admin-verified: it lands with
 *   is_verified=false / verification_status='unverified' and a 'mobile-suggest'
 *   source tag so it can be rolled back. Admin may later run the full verify
 *   flow on the place page. The admin picks the vegan_level (defaults to what
 *   the user submitted) but cannot fake the "Confirmed - Admin-reviewed" badge.
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

  // approve → insert into places (unverified; not admin_review).
  const veganLevel = VALID_LEVELS.includes(body?.vegan_level) ? body.vegan_level : (row.vegan_level || 'vegan_friendly')

  const placeRow = {
    name: String(row.name).slice(0, 200),
    address: row.address || row.city || row.country || 'Unknown',
    city: normalizeCity(row.city, row.country) || row.city,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    website: row.website,
    vegan_level: veganLevel,
    source: 'mobile-suggest',
    category: ['eat', 'hotel', 'event', 'store', 'organisation', 'other'].includes(row.category) ? row.category : 'eat',
    description: row.notes || null,
    tags: ['mobile-suggest', 'community-submitted'],
    is_verified: false,                        // user suggestion — NOT admin-verified
    verification_status: 'unverified',
    verification_method: 'community_submission',
    created_by: ADMIN_USER_ID,
  }

  const { data: inserted, error: insErr } = await supabase
    .from('places').insert(placeRow).select('id, slug').single()
  if (insErr) return NextResponse.json({ error: `insert place: ${insErr.message}` }, { status: 500 })

  const { error: linkErr } = await supabase.from('place_submissions').update({
    status: 'approved',
    review_note: body?.note ?? null,
    reviewed_by: userId,
    reviewed_at: now,
    imported_place_id: inserted!.id,
  }).eq('id', id)
  if (linkErr) return NextResponse.json({ error: `link submission: ${linkErr.message}` }, { status: 500 })

  const { revalidatePath } = await import('next/cache')
  const { slugifyCityOrCountry } = await import('@/lib/places/slugify')
  if (inserted?.slug) revalidatePath(`/place/${inserted.slug}`)
  const countrySlug = slugifyCityOrCountry(row.country)
  const citySlug = slugifyCityOrCountry(row.city)
  if (countrySlug && citySlug) {
    revalidatePath(`/vegan-places/${countrySlug}/${citySlug}`)
    revalidatePath(`/vegan-places/${countrySlug}`)
  }

  return NextResponse.json({ success: true, action, vegan_level: veganLevel, place_id: inserted!.id, slug: inserted!.slug })
}
