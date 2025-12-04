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
        post_likes!limit(10) (id, user_id),
        comments!limit(5) (id)
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch post data to get images/videos before deletion
    const { data: post } = await supabase
      .from('posts')
      .select('images, video_urls, user_id')
      .eq('id', id)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify ownership
    if (post.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Use RPC function to delete post (bypasses RLS issues with WITH CHECK clause)
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('delete_post', { post_id: id })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    // Check the result from the function
    if (!rpcResult?.success) {
      const errorMsg = rpcResult?.error || 'Failed to delete post'
      const statusCode = errorMsg === 'Not authenticated' ? 401 :
                        errorMsg === 'Not authorized' ? 403 :
                        errorMsg === 'Post not found' ? 404 :
                        errorMsg === 'Post already deleted' ? 410 : 400
      return NextResponse.json({ error: errorMsg }, { status: statusCode })
    }

    // Delete images from storage (async, non-blocking)
    if (post.images && post.images.length > 0) {
      const imagePaths = post.images.map((url: string) => {
        // Extract path from full URL: https://...supabase.co/storage/v1/object/public/post-images/PATH
        const match = url.match(/\/post-images\/(.+)$/)
        return match ? match[1] : null
      }).filter(Boolean)

      if (imagePaths.length > 0) {
        supabase.storage
          .from('post-images')
          .remove(imagePaths)
          .then(({ error }) => {
            if (error) console.error('Error deleting post images:', error)
            else console.log(`Deleted ${imagePaths.length} images for post ${id}`)
          })
      }
    }

    // Delete videos from storage (async, non-blocking)
    if (post.video_urls && post.video_urls.length > 0) {
      const videoPaths = post.video_urls.map((url: string) => {
        // Extract path from full URL
        const match = url.match(/\/media\/(.+)$/)
        return match ? match[1] : null
      }).filter(Boolean)

      if (videoPaths.length > 0) {
        supabase.storage
          .from('media')
          .remove(videoPaths)
          .then(({ error }) => {
            if (error) console.error('Error deleting post videos:', error)
            else console.log(`Deleted ${videoPaths.length} videos for post ${id}`)
          })
      }
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
