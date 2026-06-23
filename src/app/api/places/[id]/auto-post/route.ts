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

    const { content, images } = await request.json()
    const admin = createAdminClient()
    const { data: place } = await admin.from('places').select('name').eq('id', placeId).single()

    const postId = await createPlacePost({
      userId: session.user.id,
      placeId,
      placeName: place?.name || 'this place',
      content: content || undefined,
      images: images || [],
    })

    if (!postId) return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
