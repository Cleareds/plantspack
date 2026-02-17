/**
 * Hashtag and Mention Utilities
 * Functions to extract and process hashtags and mentions from text
 */

import { supabase } from './supabase'

/**
 * Extract hashtags from text
 * @param text Content to extract hashtags from
 * @returns Array of hashtag strings (without #)
 */
export function extractHashtags(text: string): string[] {
  if (!text) return []

  // Match hashtags: # followed by letters, numbers, underscores
  // Must be at least 2 characters, max 50
  const hashtagRegex = /#([a-zA-Z0-9_-]{2,50})\b/g
  const matches = text.matchAll(hashtagRegex)

  const hashtags = Array.from(matches, match => match[1].toLowerCase())

  // Remove duplicates
  return [...new Set(hashtags)]
}

/**
 * Extract mentions from text
 * @param text Content to extract mentions from
 * @returns Array of username strings (without @)
 */
export function extractMentions(text: string): string[] {
  if (!text) return []

  // Match mentions: @ followed by letters, numbers, underscores
  // Must be at least 2 characters, max 30
  const mentionRegex = /@([a-zA-Z0-9_.]{2,30})\b/g
  const matches = text.matchAll(mentionRegex)

  const mentions = Array.from(matches, match => match[1].toLowerCase())

  // Remove duplicates
  return [...new Set(mentions)]
}

/**
 * Resolve usernames to user IDs
 * @param usernames Array of usernames to resolve
 * @returns Array of user IDs
 */
export async function resolveUsernames(usernames: string[]): Promise<string[]> {
  if (!usernames || usernames.length === 0) return []

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username')
      .in('username', usernames)

    if (error) throw error

    return data?.map(user => user.id) || []
  } catch (error) {
    console.error('Error resolving usernames:', error)
    return []
  }
}

/**
 * Get or create hashtags in database
 * @param hashtags Array of hashtag strings (without #)
 * @returns Array of hashtag IDs
 */
export async function getOrCreateHashtags(hashtags: string[]): Promise<string[]> {
  if (!hashtags || hashtags.length === 0) return []

  console.log('[Hashtags] Processing hashtags:', hashtags)
  const hashtagIds: string[] = []

  try {
    for (const tag of hashtags) {
      const normalizedTag = tag.toLowerCase()

      // Try to get existing hashtag
      const { data: existing, error: fetchError } = await supabase
        .from('hashtags')
        .select('id')
        .eq('normalized_tag', normalizedTag)
        .single()

      if (existing) {
        console.log('[Hashtags] Found existing hashtag:', normalizedTag, existing.id)
        hashtagIds.push(existing.id)
      } else if (fetchError?.code === 'PGRST116') {
        // Hashtag doesn't exist, create it
        console.log('[Hashtags] Creating new hashtag:', normalizedTag)
        const { data: created, error: createError } = await supabase
          .from('hashtags')
          .insert({
            tag: tag, // Keep original case for first occurrence
            normalized_tag: normalizedTag
          })
          .select('id')
          .single()

        if (created) {
          console.log('[Hashtags] Created hashtag:', normalizedTag, created.id)
          hashtagIds.push(created.id)
        } else {
          console.error('[Hashtags] Error creating hashtag:', normalizedTag, createError)
        }
      } else {
        console.error('[Hashtags] Unexpected error fetching hashtag:', normalizedTag, fetchError)
      }
    }

    console.log('[Hashtags] Final hashtag IDs:', hashtagIds)
    return hashtagIds
  } catch (error) {
    console.error('[Hashtags] Error in getOrCreateHashtags:', error)
    return []
  }
}

/**
 * Link hashtags to a post
 * @param postId Post ID
 * @param hashtagIds Array of hashtag IDs
 */
export async function linkHashtagsToPost(postId: string, hashtagIds: string[]): Promise<void> {
  if (!postId || !hashtagIds || hashtagIds.length === 0) return

  try {
    console.log('[Hashtags] Linking hashtags to post:', postId, hashtagIds)
    const insertData = hashtagIds.map(hashtagId => ({
      post_id: postId,
      hashtag_id: hashtagId
    }))

    const { error, data } = await supabase
      .from('post_hashtags')
      .insert(insertData)
      .select()

    if (error) {
      console.error('[Hashtags] Error linking hashtags to post:', error)
      throw error
    }
    console.log('[Hashtags] Successfully linked hashtags:', data)
  } catch (error) {
    console.error('[Hashtags] Error linking hashtags to post:', error)
  }
}

/**
 * Get trending hashtags
 * @param limit Number of hashtags to return
 * @param daysBack Number of days to look back for trending
 * @returns Array of trending hashtags with usage counts
 */
export async function getTrendingHashtags(
  limit: number = 10,
  daysBack: number = 7
): Promise<{ tag: string; usageCount: number; recentUsageCount: number }[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_trending_hashtags', {
        days_back: daysBack,
        result_limit: limit
      })

    if (error) throw error

    return data?.map((item: any) => ({
      tag: item.tag,
      usageCount: item.usage_count,
      recentUsageCount: parseInt(item.recent_usage_count)
    })) || []
  } catch (error) {
    console.error('Error getting trending hashtags:', error)
    return []
  }
}

/**
 * Search hashtags by partial match
 * @param query Search query
 * @param limit Number of results to return
 * @returns Array of matching hashtags
 */
export async function searchHashtags(
  query: string,
  limit: number = 10
): Promise<{ tag: string; usageCount: number }[]> {
  if (!query || query.length < 2) return []

  try {
    const normalizedQuery = query.toLowerCase().replace(/^#/, '')

    const { data, error } = await supabase
      .from('hashtags')
      .select('tag, usage_count')
      .ilike('normalized_tag', `${normalizedQuery}%`)
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data?.map(item => ({
      tag: item.tag,
      usageCount: item.usage_count
    })) || []
  } catch (error) {
    console.error('Error searching hashtags:', error)
    return []
  }
}

/**
 * Format text with clickable hashtags and mentions for display
 * This is used by the LinkifiedText component
 */
export interface TextSegment {
  type: 'text' | 'hashtag' | 'mention' | 'url'
  content: string
  href?: string
}

export function parseTextWithHashtagsAndMentions(text: string): TextSegment[] {
  if (!text) return []

  const segments: TextSegment[] = []

  // Combined regex for hashtags, mentions, and URLs
  const combinedRegex = /(#[a-zA-Z0-9_-]{2,50}\b)|(@[a-zA-Z0-9_.]{2,30}\b)|(https?:\/\/[^\s]+)/g

  let lastIndex = 0
  let match

  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      })
    }

    // Add the match (hashtag, mention, or URL)
    if (match[1]) {
      // Hashtag
      const tag = match[1].substring(1) // Remove #
      segments.push({
        type: 'hashtag',
        content: match[1],
        href: `/hashtag/${tag.toLowerCase()}`
      })
    } else if (match[2]) {
      // Mention
      const username = match[2].substring(1) // Remove @
      segments.push({
        type: 'mention',
        content: match[2],
        href: `/user/${username.toLowerCase()}`
      })
    } else if (match[3]) {
      // URL
      segments.push({
        type: 'url',
        content: match[3],
        href: match[3]
      })
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    })
  }

  return segments
}
