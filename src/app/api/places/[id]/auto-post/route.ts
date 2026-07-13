import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createPlacePost } from '@/lib/places/place-post'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: placeId } = await params
    const supabaseUser = await createClient()
    const { data: { session } } = await supabaseUser.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { images } = await request.json()
    const admin = createAdminClient()
    const { data: place } = await admin.from('places').select('name').eq('id', placeId).single()

    // Content is deliberately NOT client-controlled: the mobile add flow was
    // passing the user's notes/address field here, so the feed filled with
    // raw addresses and opening hours instead of announcements (2026-07-13).
    // The auto-post always reads "Just added a new vegan spot: <name>"; the
    // user's notes belong on the place row, not the feed card.
    const postId = await createPlacePost({
      userId: session.user.id,
      placeId,
      placeName: place?.name || 'this place',
      images: images || [],
    })

    if (!postId) return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
