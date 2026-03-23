import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
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
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error fetching post by slug:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}
