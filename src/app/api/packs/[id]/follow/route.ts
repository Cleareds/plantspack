import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Follow a pack
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get user from session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check if pack exists
    const { data: pack, error: packError } = await serviceSupabase
      .from('packs')
      .select('id')
      .eq('id', id)
      .single()

    if (packError || !pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
    }

    // Check if already following
    const { data: existing } = await serviceSupabase
      .from('pack_follows')
      .select('id')
      .eq('pack_id', id)
      .eq('user_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already following this pack' }, { status: 400 })
    }

    // Follow the pack
    const { error: followError } = await serviceSupabase
      .from('pack_follows')
      .insert({
        pack_id: id,
        user_id: userId
      })

    if (followError) {
      console.error('Error following pack:', followError)
      return NextResponse.json({ error: 'Failed to follow pack' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in follow pack:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Unfollow a pack
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get user from session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Unfollow the pack
    const { error: unfollowError } = await serviceSupabase
      .from('pack_follows')
      .delete()
      .eq('pack_id', id)
      .eq('user_id', userId)

    if (unfollowError) {
      console.error('Error unfollowing pack:', unfollowError)
      return NextResponse.json({ error: 'Failed to unfollow pack' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in unfollow pack:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
