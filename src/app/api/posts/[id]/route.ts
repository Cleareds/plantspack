import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/posts/[id] - Get single post
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

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
  context: RouteContext
) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    // Debug: Check cookies
    console.log('=== PUT /api/posts/[id] Debug ===')
    console.log('Request cookies:', request.cookies.getAll())

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('Auth result:', { user: user?.id, error: authError?.message })

    if (authError || !user) {
      console.error('Auth failed:', authError)
      return NextResponse.json({
        error: 'Unauthorized',
        debug: {
          hasUser: !!user,
          authError: authError?.message,
          cookies: request.cookies.getAll().map(c => c.name)
        }
      }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { content, quote_content, privacy } = body

    // Validate that at least one content field is provided
    if (!content && !quote_content) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      )
    }

    // Check if user owns the post
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id, deleted_at, post_type')
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

    // Build update object based on post type
    const updateData: any = {
      privacy: privacy || 'public',
      updated_at: new Date().toISOString()
    }

    // For quote posts, update quote_content (user's commentary)
    // For original posts, update content
    if (existingPost.post_type === 'quote' && quote_content !== undefined) {
      updateData.quote_content = quote_content.trim()
    } else if (content !== undefined) {
      updateData.content = content.trim()
    }

    // Update the post
    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
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
  context: RouteContext
) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    // Debug: Check cookies
    console.log('=== DELETE /api/posts/[id] Debug ===')
    console.log('Request cookies:', request.cookies.getAll())

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('Auth result:', { user: user?.id, error: authError?.message })

    if (authError || !user) {
      console.error('Auth failed:', authError)
      return NextResponse.json({
        error: 'Unauthorized',
        debug: {
          hasUser: !!user,
          authError: authError?.message,
          cookies: request.cookies.getAll().map(c => c.name)
        }
      }, { status: 401 })
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
