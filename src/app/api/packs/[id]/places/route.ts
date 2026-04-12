import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET /api/packs/[id]/places - Get places in a pack
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Check if id is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let packId = id

    // If it's a slug, resolve to UUID
    if (!isUUID) {
      const { data: pack, error: packError } = await supabase
        .from('packs')
        .select('id')
        .eq('slug', id)
        .single()

      if (packError || !pack) {
        return NextResponse.json(
          { error: 'Pack not found' },
          { status: 404 }
        )
      }

      packId = pack.id
    }

    const { data: packPlaces, error, count } = await supabase
      .from('pack_places')
      .select(`
        id,
        position,
        is_pinned,
        section_name,
        added_at,
        places:place_id (
          *,
          users:created_by (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          ),
          favorite_places (id, user_id)
        )
      `, { count: 'exact' })
      .eq('pack_id', packId)
      .order('is_pinned', { ascending: false })
      .order('position', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Batch fetch ratings and review counts for all places at once
    const placeIds = (packPlaces || [])
      .map((pp: any) => pp.places?.id)
      .filter(Boolean) as string[]

    // Get all review stats in one query instead of N individual calls
    const { data: reviewStats } = placeIds.length > 0
      ? await supabase
          .from('place_reviews')
          .select('place_id, rating')
          .in('place_id', placeIds)
          .is('deleted_at', null)
      : { data: [] }

    // Compute averages and counts in memory
    const statsMap = new Map<string, { total: number; count: number }>()
    for (const r of (reviewStats || [])) {
      const s = statsMap.get(r.place_id) || { total: 0, count: 0 }
      if (r.rating) { s.total += r.rating; s.count++ }
      statsMap.set(r.place_id, s)
    }

    const placesWithRatings = (packPlaces || []).map((packPlace: any) => {
      if (!packPlace.places) return packPlace
      const stats = statsMap.get(packPlace.places.id)
      return {
        ...packPlace,
        places: {
          ...packPlace.places,
          average_rating: stats && stats.count > 0 ? stats.total / stats.count : 0,
          review_count: stats?.count || 0,
        }
      }
    })

    return NextResponse.json({
      places: placesWithRatings,
      total: count,
      hasMore: (offset + limit) < (count || 0)
    })
  } catch (error) {
    console.error('[Pack Places API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pack places' },
      { status: 500 }
    )
  }
}

// POST /api/packs/[id]/places - Add place to pack
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if id is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let packId = id

    // If it's a slug, resolve to UUID
    if (!isUUID) {
      const { data: pack, error: packError } = await supabase
        .from('packs')
        .select('id')
        .eq('slug', id)
        .single()

      if (packError || !pack) {
        return NextResponse.json(
          { error: 'Pack not found' },
          { status: 404 }
        )
      }

      packId = pack.id
    }

    // Check if user is admin or moderator
    const { data: membership } = await supabase
      .from('pack_members')
      .select('role')
      .eq('pack_id', packId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!membership || !['admin', 'moderator'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins and moderators can add places' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { place_id, section_name, is_pinned } = body

    if (!place_id) {
      return NextResponse.json(
        { error: 'place_id is required' },
        { status: 400 }
      )
    }

    // Verify place exists
    const { data: place, error: placeError } = await supabase
      .from('places')
      .select('id')
      .eq('id', place_id)
      .single()

    if (placeError || !place) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      )
    }

    // Get current max position
    const { data: maxPos } = await supabase
      .from('pack_places')
      .select('position')
      .eq('pack_id', packId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const position = (maxPos?.position || 0) + 1

    // Add place to pack
    const { data: packPlace, error } = await supabase
      .from('pack_places')
      .insert({
        pack_id: packId,
        place_id,
        added_by_user_id: session.user.id,
        position,
        section_name: section_name || null,
        is_pinned: is_pinned || false
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Place already in pack' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ packPlace }, { status: 201 })
  } catch (error) {
    console.error('[Pack Places API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to add place to pack' },
      { status: 500 }
    )
  }
}

// DELETE /api/packs/[id]/places/[placeId] would go in a separate route file
// For now, we'll handle deletion via pack_places ID in a different endpoint if needed
