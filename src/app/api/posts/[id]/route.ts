import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

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
        post_likes (
          id,
          user_id
        ),
        comments (
          id
        ),
        parent_post:parent_post_id (
          id,
          user_id,
          content,
          images,
          image_url,
          created_at,
          users (
            id,
            username,
            first_name,
            last_name,
            avatar_url,
            subscription_tier
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        )
      }
      throw error
    }

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use the delete_post RPC function to bypass RLS WITH CHECK issues
    const { data, error } = await supabase
      .rpc('delete_post', { post_id: id })

    if (error) {
      console.error('Error calling delete_post RPC:', error)
      throw error
    }

    // Check the RPC response
    const result = data as { success: boolean; error?: string; message?: string }

    if (!result.success) {
      const statusCode = result.error === 'Not authenticated' ? 401
        : result.error === 'Not authorized' ? 403
        : result.error === 'Post not found' ? 404
        : 400

      return NextResponse.json(
        { error: result.error || 'Failed to delete post' },
        { status: statusCode }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}
