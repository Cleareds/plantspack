import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/posts/[id] - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id } = await params

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        users (
          id,
          username,
          first_name,
          last_name,
          avatar_url,
          subscription_tier
        ),
        post_likes (id, user_id),
        comments (id)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/posts/[id] - Edit post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id } = await params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { content, privacy } = body

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      )
    }

    // Check if user owns the post
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id, deleted_at')
      .eq('id', id)
      .single()

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (existingPost.deleted_at) {
      return NextResponse.json(
        { error: 'Cannot edit deleted post' },
        { status: 410 }
      )
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update the post
    const { data, error } = await supabase
      .from('posts')
      .update({
        content: content.trim(),
        privacy: privacy || 'public',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/posts/[id] - Soft delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id } = await params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user owns the post
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id, deleted_at')
      .eq('id', id)
      .single()

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (existingPost.deleted_at) {
      return NextResponse.json(
        { error: 'Post already deleted' },
        { status: 410 }
      )
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete the post
    const { error } = await supabase
      .from('posts')
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
