import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /api/packs/[id]/posts - Get pack's posts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    // Get pack posts with full post data
    const { data: packPosts, error, count } = await supabase
      .from('pack_posts')
      .select(`
        id,
        position,
        is_pinned,
        added_at,
        posts:post_id (
          id,
          user_id,
          content,
          images,
          video_urls,
          privacy,
          created_at,
          users:user_id (
            id,
            username,
            first_name,
            last_name,
            avatar_url,
            subscription_tier
          ),
          post_likes (id, user_id),
          comments (id)
        )
      `, { count: 'exact' })
      .eq('pack_id', packId)
      .order('is_pinned', { ascending: false })
      .order('position', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      posts: packPosts,
      total: count,
      hasMore: (offset + limit) < (count || 0)
    })
  } catch (error) {
    console.error('[Pack Posts API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pack posts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/packs/[id]/posts - Add post to pack
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        { error: 'Only admins and moderators can add posts' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { post_id, section_name, is_pinned } = body

    if (!post_id) {
      return NextResponse.json(
        { error: 'post_id is required' },
        { status: 400 }
      )
    }

    // Verify post exists and is public
    const { data: post } = await supabase
      .from('posts')
      .select('privacy')
      .eq('id', post_id)
      .single()

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.privacy !== 'public') {
      return NextResponse.json(
        { error: 'Only public posts can be added to packs' },
        { status: 400 }
      )
    }

    // Get current max position
    const { data: maxPos } = await supabase
      .from('pack_posts')
      .select('position')
      .eq('pack_id', packId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const position = (maxPos?.position || 0) + 1

    // Add post to pack
    const { data: packPost, error } = await supabase
      .from('pack_posts')
      .insert({
        pack_id: packId,
        post_id,
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
          { error: 'Post already in pack' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ packPost }, { status: 201 })
  } catch (error) {
    console.error('[Pack Posts API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to add post to pack' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/packs/[id]/posts/[postId] - Remove post from pack
 * Note: This needs to be in a separate file: /api/packs/[id]/posts/[postId]/route.ts
 */
