import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!tag || tag.length < 2) {
      return NextResponse.json(
        { error: 'Invalid hashtag' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS for public content
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: hashtagInfo, error: hashtagError } = await supabase
      .from('hashtags')
      .select('id, tag, usage_count')
      .eq('normalized_tag', tag.toLowerCase())
      .single()

    if (hashtagError || !hashtagInfo) {
      return NextResponse.json({
        posts: [],
        hashtag: { tag, usage_count: 0 },
        hasMore: false
      })
    }

    const { data: postHashtagLinks, error: linkError } = await supabase
      .from('post_hashtags')
      .select('post_id, created_at')
      .eq('hashtag_id', hashtagInfo.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (linkError) {
      console.error(`[Hashtag Query] Error fetching post links:`, linkError)
      throw linkError
    }

    if (!postHashtagLinks || postHashtagLinks.length === 0) {
      return NextResponse.json({
        posts: [],
        hashtag: hashtagInfo,
        hasMore: false
      })
    }

    // Step 2: Get full post data for these IDs
    const postIds = postHashtagLinks.map(link => link.post_id)

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        content,
        images,
        video_urls,
        privacy,
        created_at,
        updated_at,
        deleted_at,
        is_sensitive,
        content_warnings,
        parent_post_id,
        users (
          id,
          username,
          first_name,
          last_name,
          avatar_url,
          subscription_tier
        ),
        post_likes (id, user_id),
        comments (id),
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
      .in('id', postIds)
      .is('deleted_at', null)
      .eq('privacy', 'public')

    if (postsError) {
      console.error(`[Hashtag Query] Error fetching posts:`, postsError)
      throw postsError
    }

    const filteredPosts = posts || []

    // Count actual visible posts for this hashtag
    const { count: actualCount } = await supabase
      .from('post_hashtags')
      .select('posts!inner(id)', { count: 'exact', head: true })
      .eq('hashtag_id', hashtagInfo.id)
      .is('posts.deleted_at', null)
      .eq('posts.privacy', 'public')

    return NextResponse.json({
      posts: filteredPosts,
      hashtag: hashtagInfo ? { ...hashtagInfo, usage_count: actualCount || 0 } : { tag, usage_count: actualCount || 0 },
      hasMore: filteredPosts.length === limit
    })
  } catch (error) {
    console.error('Error fetching posts by hashtag:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}
