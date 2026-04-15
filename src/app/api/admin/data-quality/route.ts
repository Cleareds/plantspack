import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const supabaseUser = await createClient()
  const { data: { session } } = await supabaseUser.auth.getSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return supabase
}

export async function GET(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') || 'closed'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 30
  const offset = (page - 1) * limit

  if (tab === 'closed') {
    // Places confirmed closed by Google
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['google_confirmed_closed'])
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'temp_closed') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['google_temporarily_closed'])
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'unreachable') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['website_unreachable'])
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'reported_closed') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['community_report:permanently_closed'])
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'reported_hours') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, opening_hours, updated_at', { count: 'exact' })
      .contains('tags', ['community_report:hours_wrong'])
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'not_vegan') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, vegan_level, website, updated_at', { count: 'exact' })
      .or('tags.cs.{community_report:not_fully_vegan},tags.cs.{community_report:not_vegan_friendly}')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'corrections') {
    const { data, count } = await supabase
      .from('place_corrections')
      .select('id, place_id, corrections, note, status, created_at, places(id, name, slug, city, country), users(id, username)', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return NextResponse.json({ corrections: data || [], total: count || 0 })
  }

  if (tab === 'stats') {
    const [
      { count: totalPlaces },
      { count: googleClosed },
      { count: googleTempClosed },
      { count: unreachable },
      { count: possiblyClosed },
      { count: reportedClosed },
      { count: reportedHours },
      { count: pendingCorrections },
      { count: googleNotFound },
      { count: reportedNotVegan },
    ] = await Promise.all([
      supabase.from('places').select('id', { count: 'exact', head: true }),
      supabase.from('places').select('id', { count: 'exact', head: true }).contains('tags', ['google_confirmed_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).contains('tags', ['google_temporarily_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).contains('tags', ['website_unreachable']),
      supabase.from('places').select('id', { count: 'exact', head: true }).contains('tags', ['possibly_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).contains('tags', ['community_report:permanently_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).contains('tags', ['community_report:hours_wrong']),
      supabase.from('place_corrections').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('places').select('id', { count: 'exact', head: true }).contains('tags', ['google_not_found']),
      supabase.from('places').select('id', { count: 'exact', head: true }).or('tags.cs.{community_report:not_fully_vegan},tags.cs.{community_report:not_vegan_friendly}'),
    ])

    return NextResponse.json({
      stats: {
        totalPlaces: totalPlaces || 0,
        googleClosed: googleClosed || 0,
        googleTempClosed: googleTempClosed || 0,
        unreachable: unreachable || 0,
        possiblyClosed: possiblyClosed || 0,
        reportedClosed: reportedClosed || 0,
        reportedHours: reportedHours || 0,
        pendingCorrections: pendingCorrections || 0,
        googleNotFound: googleNotFound || 0,
        reportedNotVegan: reportedNotVegan || 0,
      }
    })
  }

  return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
}

// DELETE: Remove a flagged place + revalidate
export async function DELETE(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { placeId } = await request.json()
  if (!placeId) return NextResponse.json({ error: 'Missing placeId' }, { status: 400 })

  // Get place info for cache revalidation
  const { data: place } = await supabase.from('places').select('slug, city, country').eq('id', placeId).single()

  // Delete related records
  await supabase.from('place_reviews').delete().eq('place_id', placeId)
  await supabase.from('favorite_places').delete().eq('place_id', placeId)
  await supabase.from('pack_places').delete().eq('place_id', placeId)
  await supabase.from('place_corrections').delete().eq('place_id', placeId)
  const { error } = await supabase.from('places').delete().eq('id', placeId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Revalidate caches
  const { revalidatePath } = await import('next/cache')
  if (place?.slug) revalidatePath(`/place/${place.slug}`)
  revalidatePath('/vegan-places')
  if (place?.country) {
    const countrySlug = place.country.toLowerCase().replace(/\s+/g, '-')
    revalidatePath(`/vegan-places/${countrySlug}`)
    if (place.city) {
      const citySlug = place.city.toLowerCase().replace(/\s+/g, '-')
      revalidatePath(`/vegan-places/${countrySlug}/${citySlug}`)
    }
  }
  revalidatePath('/city-ranks')

  return NextResponse.json({ success: true })
}

// PATCH: Dismiss a flag (remove tag from place)
export async function PATCH(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { placeId, removeTag } = await request.json()
  if (!placeId || !removeTag) return NextResponse.json({ error: 'Missing placeId or removeTag' }, { status: 400 })

  const { data: place } = await supabase.from('places').select('tags').eq('id', placeId).single()
  if (!place) return NextResponse.json({ error: 'Place not found' }, { status: 404 })

  const tags = (place.tags || []).filter((t: string) => t !== removeTag)
  await supabase.from('places').update({ tags, updated_at: new Date().toISOString() }).eq('id', placeId)

  return NextResponse.json({ success: true })
}
