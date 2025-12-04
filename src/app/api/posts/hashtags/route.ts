import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

/**
 * API endpoint to create hashtags and link them to posts
 * Uses service role to bypass RLS policies
 */
export async function POST(request: NextRequest) {
  try {
    const { postId, hashtags } = await request.json()

    if (!postId || !Array.isArray(hashtags) || hashtags.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    // Verify user is authenticated
    const authSupabase = await createClient()

    const { data: { session } } = await authSupabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the post belongs to the user
    const { data: post, error: postError } = await authSupabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service role to create hashtags
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const hashtagIds: string[] = []
    const normalizedTags = hashtags.map(tag => tag.toLowerCase())

    // Batch query: Get all existing hashtags in one query
    const { data: existingHashtags } = await supabase
      .from('hashtags')
      .select('id, normalized_tag')
      .in('normalized_tag', normalizedTags)

    const existingTagMap = new Map(
      (existingHashtags || []).map(h => [h.normalized_tag, h.id])
    )

    // Separate into existing and new hashtags
    const existingIds: string[] = []
    const newTags: string[] = []

    for (const tag of normalizedTags) {
      if (existingTagMap.has(tag)) {
        existingIds.push(existingTagMap.get(tag)!)
      } else {
        newTags.push(tag)
      }
    }

    // Add existing hashtag IDs
    hashtagIds.push(...existingIds)

    // Batch update timestamps for existing hashtags
    if (existingIds.length > 0) {
      await supabase
        .from('hashtags')
        .update({ updated_at: new Date().toISOString() })
        .in('id', existingIds)
    }

    // Batch create new hashtags
    if (newTags.length > 0) {
      const newHashtagsData = newTags.map(tag => ({
        tag,
        normalized_tag: tag,
        usage_count: 1
      }))

      const { data: created, error: createError } = await supabase
        .from('hashtags')
        .insert(newHashtagsData)
        .select('id')

      if (created && !createError) {
        hashtagIds.push(...created.map(h => h.id))
        console.log(`[Hashtags] Created ${created.length} new hashtags:`, newTags)
      } else {
        console.error(`[Hashtags] Error creating hashtags:`, createError)
      }
    }

    // Link hashtags to post
    if (hashtagIds.length > 0) {
      const insertData = hashtagIds.map(hashtagId => ({
        post_id: postId,
        hashtag_id: hashtagId
      }))

      console.log(`[Hashtags] Linking ${hashtagIds.length} hashtags to post ${postId}`)

      const { error: linkError } = await supabase
        .from('post_hashtags')
        .insert(insertData)

      if (linkError) {
        console.error(`[Hashtags] Error linking hashtags to post ${postId}:`, linkError)
        return NextResponse.json(
          { error: 'Failed to link hashtags', details: linkError },
          { status: 500 }
        )
      }

      console.log(`[Hashtags] Successfully linked ${hashtagIds.length} hashtags to post ${postId}`)
    } else {
      console.log(`[Hashtags] No hashtags to link for post ${postId}`)
    }

    return NextResponse.json({
      success: true,
      hashtagIds,
      count: hashtagIds.length,
      hashtags
    })
  } catch (error) {
    console.error('Error processing hashtags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
