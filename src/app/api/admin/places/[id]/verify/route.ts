import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

/**
 * Admin "manually confirm this place exists" endpoint. Promotes the row
 * to verification ladder level 3 (admin/community-confirmed) — the
 * highest level. After this call:
 *   - verification_level = 3
 *   - verification_method = 'admin_review'
 *   - verification_status = 'approved'
 *   - verified_at timestamp updates
 *
 * The place page renders a "Verified by PlantsPack" badge when
 * verification_level >= 3.
 *
 * POST /api/admin/places/[id]/verify
 *   body: { unverify?: boolean }   -- send unverify=true to revert
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
  const unverify = body.unverify === true

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch the place's slug + country/city so we can revalidate the right
  // ISR pages after the update.
  const { data: place } = await admin
    .from('places')
    .select('slug, country, city')
    .eq('id', id)
    .maybeSingle()

  // is_verified drives the existing "Confirmed - Admin-reviewed" badge in
  // the place page footer. Setting it together with verification_level=3
  // keeps both verification systems in sync.
  const update = unverify
    ? { verification_level: 2, verification_method: null, verification_status: 'scraping_verified' as const, is_verified: false }
    : { verification_level: 3, verification_method: 'admin_review' as const, verification_status: 'approved' as const, is_verified: true }

  const { error } = await admin.from('places').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (place?.slug) revalidatePath(`/place/${place.slug}`)
  if (place?.country) {
    const cs = place.country.toLowerCase().replace(/\s+/g, '-')
    revalidatePath(`/vegan-places/${cs}`)
    if (place.city) revalidatePath(`/vegan-places/${cs}/${place.city.toLowerCase().replace(/\s+/g, '-')}`)
  }

  return NextResponse.json({ ok: true, verification_level: update.verification_level })
}
