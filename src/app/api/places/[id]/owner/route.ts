import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /api/places/[id]/owner - Get verified owner information for a place
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: placeId } = await params
    const supabase = await createClient()

    // Get owner using database function
    const { data, error } = await supabase
      .rpc('get_place_owner', {
        p_place_id: placeId
      })
      .maybeSingle()

    if (error) {
      console.error('[Owner API] Error fetching owner:', error)
      throw error
    }

    if (!data) {
      return NextResponse.json({ owner: null })
    }

    const ownerData = data as any

    return NextResponse.json({
      owner: {
        user_id: ownerData.user_id,
        username: ownerData.username,
        first_name: ownerData.first_name,
        last_name: ownerData.last_name,
        avatar_url: ownerData.avatar_url,
        verified_at: ownerData.verified_at
      }
    })
  } catch (error) {
    console.error('[Owner API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch owner information' },
      { status: 500 }
    )
  }
}
