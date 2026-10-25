import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const LEVELS = ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options']
const CATEGORIES = ['eat', 'store', 'hotel', 'organisation', 'other']

async function checkAdmin() {
  const supabaseUser = await createClient()
  const { data: { session } } = await supabaseUser.auth.getSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('users').select('id, role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return { supabase, userId: profile.id as string }
}

/**
 * Research drafts: place_staging rows with raw.draft = true, shown on
 * /admin/data-quality/<country>. The admin checked the place by hand, so
 * publishing is an admin review (level 3, is_verified).
 *
 * POST   { vegan_level, category, subcategory?, address?, latitude?, longitude? } -> insert into places
 * DELETE -> remove the draft row for good (the admin asked for a real delete)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, userId } = ctx
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const { data: row, error: loadErr } = await supabase.from('place_staging').select('*').eq('id', id).single()
  if (loadErr || !row || !row.raw?.draft) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (row.operator_action || row.imported_place_id) {
    return NextResponse.json({ error: 'Already published', imported_place_id: row.imported_place_id }, { status: 409 })
  }

  const category = CATEGORIES.includes(body?.category) ? body.category : (row.raw.category || 'eat')
  const isOrg = category === 'organisation' || category === 'other'
  const veganLevel = LEVELS.includes(body?.vegan_level) ? body.vegan_level : null
  if (!isOrg && !veganLevel) return NextResponse.json({ error: 'Pick a vegan level' }, { status: 400 })
  const lat = Number.isFinite(body?.latitude) ? body.latitude : row.latitude
  const lng = Number.isFinite(body?.longitude) ? body.longitude : row.longitude
  const now = new Date().toISOString()

  const { data: inserted, error: insErr } = await supabase.from('places').insert({
    name: String(row.name).slice(0, 200),
    address: (body?.address || row.address || row.city || row.country || 'Unknown').slice(0, 300),
    city: row.city,
    country: row.country,
    latitude: lat,
    longitude: lng,
    category,
    subcategory: body?.subcategory || row.raw.subcategory || null,
    vegan_level: veganLevel,
    // places has no social columns: Instagram/Facebook go in website when there is no site.
    website: row.website || row.raw.instagram || row.raw.facebook || null,
    description: row.raw.description || null,
    source: row.source,
    source_id: row.source_id,
    tags: [row.source, 'draft-published'],
    // A human checked it in this UI: invariant is_verified <=> admin_review.
    verification_level: 3,
    verification_method: 'admin_review',
    verification_status: 'approved',
    is_verified: true,
    last_verified_at: now,
    created_by: ADMIN_USER_ID,
  }).select('id, slug').single()
  if (insErr) return NextResponse.json({ error: `insert place: ${insErr.message}` }, { status: 500 })

  const { error: linkErr } = await supabase.from('place_staging').update({
    operator_action: 'approved',
    operator_user_id: userId,
    operator_decided_at: now,
    imported_place_id: inserted!.id,
    updated_at: now,
  }).eq('id', id)
  if (linkErr) return NextResponse.json({ error: `link draft: ${linkErr.message}` }, { status: 500 })

  const { revalidatePath } = await import('next/cache')
  const { slugifyCityOrCountry } = await import('@/lib/places/slugify')
  if (inserted?.slug) revalidatePath(`/place/${inserted.slug}`)
  const countrySlug = slugifyCityOrCountry(row.country)
  const citySlug = slugifyCityOrCountry(row.city)
  if (countrySlug && citySlug) {
    revalidatePath(`/vegan-places/${countrySlug}/${citySlug}`)
    revalidatePath(`/vegan-places/${countrySlug}`)
  }
  return NextResponse.json({ success: true, place_id: inserted!.id, slug: inserted!.slug })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await checkAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { data: row } = await ctx.supabase.from('place_staging').select('id, raw, imported_place_id').eq('id', id).single()
  if (!row?.raw?.draft) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (row.imported_place_id) return NextResponse.json({ error: 'Already published' }, { status: 409 })
  const { error } = await ctx.supabase.from('place_staging').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
