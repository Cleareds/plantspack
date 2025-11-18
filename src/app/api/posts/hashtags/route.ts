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

    // Create or get each hashtag
    for (const tag of hashtags) {
      const normalizedTag = tag.toLowerCase()

      // Try to get existing hashtag
      const { data: existing } = await supabase
        .from('hashtags')
        .select('id')
        .eq('normalized_tag', normalizedTag)
        .single()

      if (existing) {
        hashtagIds.push(existing.id)
        // Update timestamp (usage_count is managed by database triggers)
        await supabase
          .from('hashtags')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        // Create new hashtag
        const { data: created, error: createError } = await supabase
          .from('hashtags')
          .insert({
            tag: normalizedTag,  // Use normalized tag for consistency
            normalized_tag: normalizedTag,
            usage_count: 1
          })
          .select('id')
          .single()

        if (created && !createError) {
          hashtagIds.push(created.id)
          console.log(`[Hashtags] Created new hashtag: ${normalizedTag}`)
        } else {
          console.error(`[Hashtags] Error creating hashtag ${normalizedTag}:`, createError)
        }
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
