import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

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

    const { error } = await admin.from('posts').insert({
      user_id: session.user.id,
      content: content || 'Check out this place!',
      category: 'place',
      place_id: placeId,
      images: images || [],
      privacy: 'public',
    })

    if (error) {
      console.error('[auto-post] Failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
