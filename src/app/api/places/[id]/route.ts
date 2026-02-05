import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
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
