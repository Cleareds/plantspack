import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Toggle a place's archived state for the creator's own content.
 * Body: { publish?: boolean } — default false (= archive/unpublish).
 * When publish=true, clears archived_at to restore the listing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const publish = body?.publish === true

  const admin = createAdminClient()

  // Ownership check: creator OR verified place_owner OR admin.
  const { data: place } = await admin
    .from('places')
    .select('id, created_by, slug, city, country')
    .eq('id', id)
    .single()

  if (!place) return NextResponse.json({ error: 'Place not found' }, { status: 404 })

  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isCreator = place.created_by === session.user.id
  let isOwner = false
  if (!isAdmin && !isCreator) {
    const { data: ownerRow } = await admin
      .from('place_owners')
      .select('id')
      .eq('place_id', id)
      .eq('user_id', session.user.id)
      .is('removed_at', null)
      .maybeSingle()
    isOwner = !!ownerRow
  }

  if (!isAdmin && !isCreator && !isOwner) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const update = publish
    ? { archived_at: null, archived_reason: null }
    : { archived_at: new Date().toISOString(), archived_reason: 'self_unpublish' }

  const { error } = await admin
    .from('places')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Revalidate the public-facing pages so the archive takes effect immediately.
  const { revalidatePath } = await import('next/cache')
  if (place.slug) revalidatePath(`/place/${place.slug}`)
  if (place.country) {
    const countrySlug = place.country.toLowerCase().replace(/\s+/g, '-')
    revalidatePath(`/vegan-places/${countrySlug}`)
    if (place.city) {
      const citySlug = place.city.toLowerCase().replace(/\s+/g, '-')
      revalidatePath(`/vegan-places/${countrySlug}/${citySlug}`)
    }
  }

  return NextResponse.json({ success: true, published: publish })
}
