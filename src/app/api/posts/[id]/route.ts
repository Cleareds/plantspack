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
        ),
        place:place_id (
          id, name, address, category, images, average_rating, is_pet_friendly, website
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

export async function PUT(
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

    // Verify ownership
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('id, user_id, place_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (existingPost.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Build update object with only allowed fields
    const updateData: Record<string, any> = {}
    const allowedFields = [
      'title', 'content', 'privacy', 'category', 'secondary_tags',
      'recipe_data', 'event_data', 'product_data',
      'images', 'image_urls', 'video_urls', 'quote_content'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Keep images and image_urls in sync (canonical field is `images`)
    if (updateData.images) {
      updateData.image_urls = updateData.images
    } else if (updateData.image_urls) {
      updateData.images = updateData.image_urls
    }

    updateData.updated_at = new Date().toISOString()

    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Sync images to linked place (if post has a place_id)
    if (updateData.images && existingPost.place_id) {
      try {
        await supabase
          .from('places')
          .update({ images: updateData.images })
          .eq('id', existingPost.place_id)
      } catch (syncError) {
        console.error('[Post API] Image sync to place failed:', syncError)
      }
    }

    return NextResponse.json({ post: updatedPost })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
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
