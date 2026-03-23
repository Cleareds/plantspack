import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'

// Create Supabase client for public reads
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch place with creator info and favorites
    const { data: place, error } = await supabase
      .from('places')
      .select(`
        *,
        users:created_by (
          id,
          username,
          first_name,
          last_name,
          avatar_url
        ),
        favorite_places (
          id,
          user_id
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Place not found' },
          { status: 404 }
        )
      }
      throw error
    }

    // Get average rating
    const { data: avgRating, error: ratingError } = await supabase
      .rpc('get_place_average_rating', { p_place_id: id })

    // Get rating distribution
    const { data: distribution, error: distError } = await supabase
      .rpc('get_place_rating_distribution', { p_place_id: id })

    // Get review count
    const { count: reviewCount, error: countError } = await supabase
      .from('place_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('place_id', id)
      .is('deleted_at', null)

    return NextResponse.json({
      place: {
        ...place,
        average_rating: avgRating || 0,
        review_count: reviewCount || 0,
        rating_distribution: distribution || {
          '5': 0,
          '4': 0,
          '3': 0,
          '2': 0,
          '1': 0,
          total: 0
        }
      }
    })
  } catch (error) {
    console.error('[Place API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch place details' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const serverSupabase = await createServerClient()

    // Check authentication
    const { data: { session } } = await serverSupabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch existing place to check ownership
    const { data: existingPlace, error: fetchError } = await supabase
      .from('places')
      .select('id, created_by, images')
      .eq('id', id)
      .single()

    if (fetchError || !existingPlace) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    // Check authorization: creator or verified owner
    const isCreator = existingPlace.created_by === session.user.id
    let isOwner = false
    if (!isCreator) {
      const { data: ownerRecord } = await supabase
        .from('place_owners')
        .select('id')
        .eq('place_id', id)
        .eq('user_id', session.user.id)
        .is('removed_at', null)
        .maybeSingle()
      isOwner = !!ownerRecord
    }

    if (!isCreator && !isOwner) {
      return NextResponse.json({ error: 'Not authorized to edit this place' }, { status: 403 })
    }

    const body = await request.json()

    // Build update object with allowed fields
    const updateData: Record<string, any> = {}
    const allowedFields = [
      'name', 'description', 'category', 'address', 'website', 'phone',
      'is_pet_friendly', 'images', 'main_image_url', 'tags',
      'opening_hours', 'event_time', 'city', 'country'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Handle image append mode: merge new images with existing
    if (body.append_images && Array.isArray(body.append_images) && body.append_images.length > 0) {
      const currentImages = existingPlace.images || []
      updateData.images = [...currentImages, ...body.append_images]
    }

    updateData.updated_at = new Date().toISOString()

    // Use the server client for the update (RLS will check ownership)
    const { data: updatedPlace, error: updateError } = await serverSupabase
      .from('places')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Place API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update place' }, { status: 500 })
    }

    // Sync images to linked posts (posts with place_id pointing to this place)
    if (updateData.images) {
      try {
        await serverSupabase
          .from('posts')
          .update({ images: updateData.images, image_urls: updateData.images })
          .eq('place_id', id)
      } catch (syncError) {
        console.error('[Place API] Image sync to posts failed:', syncError)
      }
    }

    return NextResponse.json({ place: updatedPlace })
  } catch (error) {
    console.error('[Place API] Error:', error)
    return NextResponse.json({ error: 'Failed to update place' }, { status: 500 })
  }
}
