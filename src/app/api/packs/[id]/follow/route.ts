import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Follow a pack
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('cookie')

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from session
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: authHeader
          }
        }
      }
    )

    const { data: { user }, error: authError } = await userSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if pack exists
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('id')
      .eq('id', id)
      .single()

    if (packError || !pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('pack_follows')
      .select('id')
      .eq('pack_id', id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already following this pack' }, { status: 400 })
    }

    // Follow the pack
    const { error: followError } = await supabase
      .from('pack_follows')
      .insert({
        pack_id: id,
        user_id: user.id
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
    const authHeader = request.headers.get('cookie')

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from session
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: authHeader
          }
        }
      }
    )

    const { data: { user }, error: authError } = await userSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Unfollow the pack
    const { error: unfollowError } = await supabase
      .from('pack_follows')
      .delete()
      .eq('pack_id', id)
      .eq('user_id', user.id)

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
