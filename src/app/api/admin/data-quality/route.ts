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

const VEGAN_REPORT_TAGS = [
  'community_report:not_fully_vegan',
  'community_report:not_vegan_friendly',
  'community_report:non_vegan_chain',
  'community_report:vegan_friendly_chain',
  'community_report:few_vegan_options',
  'community_report:actually_fully_vegan',
]

export async function GET(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') || 'closed'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 30
  const offset = (page - 1) * limit

  if (tab === 'closed') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['google_confirmed_closed'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'temp_closed') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['google_temporarily_closed'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'unreachable') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['website_unreachable'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'reported_closed') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, updated_at', { count: 'exact' })
      .contains('tags', ['community_report:permanently_closed'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'reported_hours') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, website, opening_hours, updated_at', { count: 'exact' })
      .contains('tags', ['community_report:hours_wrong'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'not_vegan') {
    const { data, count } = await supabase
      .from('places')
      .select('id, name, slug, city, country, tags, vegan_level, website, updated_at', { count: 'exact' })
      .or(VEGAN_REPORT_TAGS.map(t => `tags.cs.{${t}}`).join(','))
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return NextResponse.json({ places: data || [], total: count || 0 })
  }

  if (tab === 'corrections') {
    const { data, count } = await supabase
      .from('place_corrections')
      .select('id, place_id, user_id, corrections, note, status, created_at, places(id, name, slug, city, country)', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!data || data.length === 0) return NextResponse.json({ corrections: [], total: count || 0 })

    const userIds = [...new Set(data.map((r: any) => r.user_id).filter(Boolean))]
    const { data: users } = userIds.length
      ? await supabase.from('users').select('id, username').in('id', userIds)
      : { data: [] }
    const userMap = Object.fromEntries((users || []).map((u: any) => [u.id, u]))
    const enriched = data.map((r: any) => ({ ...r, users: userMap[r.user_id] || null }))
    return NextResponse.json({ corrections: enriched, total: count || 0 })
  }

  if (tab === 'stats') {
    const veganReportOr = VEGAN_REPORT_TAGS.map(t => `tags.cs.{${t}}`).join(',')
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
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['google_confirmed_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['google_temporarily_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['website_unreachable']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['possibly_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['community_report:permanently_closed']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['community_report:hours_wrong']),
      supabase.from('place_corrections').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).contains('tags', ['google_not_found']),
      supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null).or(veganReportOr),
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

// DELETE: soft-archive a flagged place
export async function DELETE(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { placeId, reason } = await request.json()
  if (!placeId) return NextResponse.json({ error: 'Missing placeId' }, { status: 400 })

  const { data: place } = await supabase.from('places').select('slug, city, country').eq('id', placeId).single()

  const { error } = await supabase
    .from('places')
    .update({ archived_at: new Date().toISOString(), archived_reason: reason || 'admin_removed' })
    .eq('id', placeId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { revalidatePath } = await import('next/cache')
  if (place?.slug) revalidatePath(`/place/${place.slug}`)
  revalidatePath('/vegan-places')
  if (place?.country) {
    const countrySlug = place.country.toLowerCase().replace(/\s+/g, '-')
    revalidatePath(`/vegan-places/${countrySlug}`)
    if (place.city) revalidatePath(`/vegan-places/${countrySlug}/${place.city.toLowerCase().replace(/\s+/g, '-')}`)
  }
  revalidatePath('/city-ranks')

  return NextResponse.json({ success: true })
}

// PATCH: remove a tag and/or update vegan_level
export async function PATCH(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { placeId, removeTag, setVeganLevel, clearVeganReportTags } = body
  if (!placeId) return NextResponse.json({ error: 'Missing placeId' }, { status: 400 })

  const { data: place } = await supabase.from('places').select('tags, slug, city, country').eq('id', placeId).single()
  if (!place) return NextResponse.json({ error: 'Place not found' }, { status: 404 })

  let tags: string[] = place.tags || []
  if (clearVeganReportTags) tags = tags.filter((t: string) => !VEGAN_REPORT_TAGS.includes(t))
  if (removeTag) tags = tags.filter((t: string) => t !== removeTag)

  const update: Record<string, any> = { tags, updated_at: new Date().toISOString() }
  if (setVeganLevel) update.vegan_level = setVeganLevel

  const { error } = await supabase.from('places').update(update).eq('id', placeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (setVeganLevel || clearVeganReportTags) {
    const { revalidatePath } = await import('next/cache')
    if (place.slug) revalidatePath(`/place/${place.slug}`)
    if (place.country && place.city) {
      const cs = place.country.toLowerCase().replace(/\s+/g, '-')
      const ci = place.city.toLowerCase().replace(/\s+/g, '-')
      revalidatePath(`/vegan-places/${cs}/${ci}`)
    }
    revalidatePath('/city-ranks')
  }

  return NextResponse.json({ success: true })
}
