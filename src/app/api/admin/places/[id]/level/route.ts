import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

const VALID_LEVELS = new Set(['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options'])

/**
 * Change a place's vegan_level (admin only). Used by the data-quality
 * row component when a triage decision needs a tier swap rather than
 * a Confirm/Closed/Delete action.
 *
 * When admin sets the level via this endpoint, verification_method
 * defaults to 'admin_review' (level 3 of the verification ladder),
 * because the admin's manual judgment IS the verification.
 *
 * The DB trigger places_fully_vegan_human_only (May 2026) won't reject
 * fully_vegan with verification_method='admin_review'.
 *
 * POST /api/admin/places/[id]/level
 *   body: { vegan_level: 'fully_vegan' | 'mostly_vegan' | 'vegan_friendly' | 'vegan_options' }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const newLevel = body.vegan_level
  if (!VALID_LEVELS.has(newLevel)) {
    return NextResponse.json({ error: `vegan_level must be one of ${[...VALID_LEVELS].join(', ')}` }, { status: 400 })
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: place } = await admin.from('places').select('slug, country, city').eq('id', id).maybeSingle()
  // Setting via admin counts as level-3 verification — the admin manually
  // decided the tier. Bumps last_verified_at as well.
  const update = {
    vegan_level: newLevel,
    verification_level: 3,
    verification_method: 'admin_review',
    verification_status: 'approved',
    is_verified: true,
    last_verified_at: new Date().toISOString(),
  }
  const { error } = await admin.from('places').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (place?.slug) revalidatePath(`/place/${place.slug}`)
  if (place?.country) {
    const cs = place.country.toLowerCase().replace(/\s+/g, '-')
    revalidatePath(`/vegan-places/${cs}`)
    if (place.city) revalidatePath(`/vegan-places/${cs}/${place.city.toLowerCase().replace(/\s+/g, '-')}`)
  }
  return NextResponse.json({ ok: true, vegan_level: newLevel })
}
