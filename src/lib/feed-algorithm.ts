// Feed Algorithm Service - Intelligent Content Ranking

import { supabase } from './supabase'
import type { SortOption } from '@/components/posts/FeedSorting'

export interface FeedPost {
  id: string
  user_id: string
  content: string
  privacy: 'public' | 'friends'
  tags: string[]
  content_type: string
  mood: string
  location_city?: string
  location_region?: string
  engagement_score: number
  view_count: number
  image_urls?: string[] | null
  video_urls?: string[] | null
  created_at: string
  updated_at: string
  users: {
    id: string
    username: string
    first_name?: string
    last_name?: string
    avatar_url?: string
  }
  post_likes: { id: string; user_id: string }[]
  comments: { id: string }[]
}

export interface RelevancyFactors {
  interestMatch: number      // 0-1, how well post matches user interests
  socialSignals: number      // 0-1, engagement from user's network
  recencyBoost: number       // 0-1, freshness factor
  qualityScore: number       // 0-1, overall post quality
  locationRelevance: number  // 0-1, geographic relevance
  diversityFactor: number    // 0-1, prevent echo chamber
}

export interface FeedOptions {
  sortBy: SortOption
  limit?: number
  offset?: number
  userId?: string
  includeAnalytics?: boolean
}

/**
 * Fetches posts with intelligent sorting and ranking
 */
export async function getFeedPosts(options: FeedOptions): Promise<FeedPost[]> {
  const { sortBy, limit = 10, offset = 0, userId } = options

  try {
    let query = supabase
      .from('posts')
      .select(`
        *,
        users!inner (
          id,
          username,
          first_name,
          last_name,
          avatar_url,
          subscription_tier,
          is_banned
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
      .eq('privacy', 'public') // Only public posts for main feed
      .eq('users.is_banned', false) // Exclude banned users
      .is('deleted_at', null) // Exclude soft-deleted posts

    // Apply sorting based on selected option
    switch (sortBy) {
      case 'relevancy':
        if (userId) {
          return await getRelevancyRankedPosts(userId, limit, offset)
        } else {
          query = query.order('engagement_score', { ascending: false })
        }
        break

      case 'recent':
        query = query.order('created_at', { ascending: false })
        break

      case 'liked_week':
        return await getPopularPosts(limit, offset)

      case 'liked_all_time':
        return await getMostLikedAllTime(limit, offset)

      default:
        query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query.range(offset, offset + limit - 1)

    if (error) throw error

    return data as FeedPost[] || []
  } catch (error) {
    console.error('Error fetching feed posts:', error)
    return []
  }
}

/**
 * Gets posts ranked by AI relevancy algorithm
 */
async function getRelevancyRankedPosts(userId: string, limit: number, offset: number): Promise<FeedPost[]> {
  try {
    // For first page, fetch extra posts for better ranking
    // For subsequent pages, use direct offset-based pagination
    const isFirstPage = offset === 0
    const fetchLimit = isFirstPage ? Math.min(limit * 2, 30) : limit
    const fetchOffset = isFirstPage ? 0 : offset

    // Get base posts with extended data for ranking
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        users!inner (
          id,
          username,
          first_name,
          last_name,
          avatar_url,
          subscription_tier,
          is_banned
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
      .eq('privacy', 'public')
      .eq('users.is_banned', false) // Exclude banned users
      .is('deleted_at', null) // Exclude soft-deleted posts
      .order('engagement_score', { ascending: false }) // Pre-sort by engagement
      .range(fetchOffset, fetchOffset + fetchLimit - 1)

    if (error) throw error
    if (!posts || posts.length === 0) return []

    // For first page, apply relevancy ranking
    if (isFirstPage) {
      const rankedPosts = posts.map((post) => {
        const engagementScore = (post as any).post_likes.length + (post as any).comments.length
        const recencyBoost = calculateRecencyBoost(post.created_at)
        const relevancyScore = (engagementScore * 0.7) + (recencyBoost * 0.3)
        return { ...post, relevancyScore }
      })

      // Sort by relevancy score and take only what we need
      rankedPosts.sort((a, b) => b.relevancyScore - a.relevancyScore)

      return rankedPosts.slice(0, limit).map(({ relevancyScore, ...post }) => {
        void relevancyScore // Explicitly ignore relevancyScore
        return post
      }) as FeedPost[]
    }

    // For subsequent pages, return as-is (already sorted by engagement_score)
    return posts as FeedPost[]
  } catch (error) {
    console.error('Error in relevancy ranking:', error)
    // Fallback to engagement-based ranking
    return getFeedPosts({ sortBy: 'recent', limit, offset })
  }
}

/**
 * Calculates relevancy score for a post based on user preferences
 * Note: Currently unused but kept for future AI-powered relevancy ranking
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function calculateRelevancyScore(
  post: FeedPost,
  userId: string,
  preferences: any,
  patterns: any
): Promise<number> {
  const factors: RelevancyFactors = {
    interestMatch: 0.5,
    socialSignals: 0.5,
    recencyBoost: 0.5,
    qualityScore: 0.5,
    locationRelevance: 0.5,
    diversityFactor: 0.5
  }

  try {
    // 1. Interest Match (40% weight)
    factors.interestMatch = calculateInterestMatch(post, preferences, patterns)

    // 2. Social Signals (25% weight)
    factors.socialSignals = await calculateSocialSignals(post, userId)

    // 3. Recency Boost (20% weight)
    factors.recencyBoost = calculateRecencyBoost(post.created_at)

    // 4. Quality Score (15% weight)
    factors.qualityScore = calculateQualityScore(post)

    // 5. Location Relevance (bonus factor)
    factors.locationRelevance = calculateLocationRelevance(post, preferences)

    // 6. Diversity Factor (prevent echo chamber)
    factors.diversityFactor = calculateDiversityFactor(post, patterns)

    // Combine factors with weights
    const baseScore = (
      factors.interestMatch * 0.4 +
      factors.socialSignals * 0.25 +
      factors.recencyBoost * 0.2 +
      factors.qualityScore * 0.15
    )

    // Apply bonus factors
    const bonusMultiplier = 1 + (factors.locationRelevance * 0.1) + (factors.diversityFactor * 0.05)
    
    return Math.max(0, Math.min(1, baseScore * bonusMultiplier))
  } catch (error) {
    console.warn('Error calculating relevancy score:', error)
    return 0.5 // Neutral score on error
  }
}

/**
 * Calculates how well post content matches user interests
 */
function calculateInterestMatch(post: FeedPost, preferences: any, patterns: any): number {
  if (!preferences || !patterns) return 0.5

  let totalScore = 0
  let factorCount = 0

  // Tag affinity
  if (post.tags && post.tags.length > 0 && patterns.tag_affinity_scores) {
    const tagScore = post.tags.reduce((sum, tag) => {
      const score = patterns.tag_affinity_scores[tag] || 0.5
      return sum + score
    }, 0) / post.tags.length
    totalScore += tagScore
    factorCount++
  }

  // Content type preference
  if (post.content_type && patterns.content_type_scores) {
    const contentScore = patterns.content_type_scores[post.content_type] || 0.5
    totalScore += contentScore
    factorCount++
  }

  // Author affinity
  if (post.user_id && patterns.author_affinity_scores) {
    const authorScore = patterns.author_affinity_scores[post.user_id] || 0.5
    totalScore += authorScore
    factorCount++
  }

  return factorCount > 0 ? totalScore / factorCount : 0.5
}

/**
 * Calculates social signals (engagement from user's network)
 */
async function calculateSocialSignals(post: FeedPost, userId: string): Promise<number> {
  try {
    // Get user's network (people they follow)
    const { data: network } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    if (!network || network.length === 0) return 0.3 // Low baseline if no network

    const networkIds = network.map(f => f.following_id)

    // Check how many people in user's network liked/commented on this post
    const networkEngagement = post.post_likes.filter(like => 
      networkIds.includes(like.user_id)
    ).length

    const totalEngagement = post.post_likes.length + post.comments.length
    const networkRatio = totalEngagement > 0 ? networkEngagement / totalEngagement : 0

    // Scale to 0-1 range
    return Math.min(1, networkRatio * 2) // Double the ratio, cap at 1
  } catch {
    return 0.3 // Conservative baseline on error
  }
}

/**
 * Calculates recency boost based on post age
 */
function calculateRecencyBoost(createdAt: string): number {
  const now = new Date()
  const postDate = new Date(createdAt)
  const hoursOld = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60)

  // Exponential decay: newer posts get higher scores
  // Posts lose half their recency boost every 24 hours
  return Math.exp(-hoursOld / 24)
}

/**
 * Calculates quality score based on engagement metrics
 */
function calculateQualityScore(post: FeedPost): number {
  const likeCount = post.post_likes.length
  const commentCount = post.comments.length
  const viewCount = post.view_count || 1

  // Engagement rate (likes + comments) / views
  const engagementRate = (likeCount + commentCount) / Math.max(viewCount, 1)
  
  // Content quality indicators
  const hasImages = (post as any).image_urls && (post as any).image_urls.length > 0
  const contentLength = post.content.length
  const optimalLength = contentLength >= 50 && contentLength <= 500 // Sweet spot

  let qualityScore = Math.min(1, engagementRate * 10) // Base engagement score

  // Bonuses
  if (hasImages) qualityScore += 0.1
  if (optimalLength) qualityScore += 0.1
  if (post.tags && post.tags.length > 0) qualityScore += 0.05

  return Math.min(1, qualityScore)
}

/**
 * Calculates location relevance bonus
 */
function calculateLocationRelevance(post: FeedPost, preferences: any): number {
  if (!preferences?.prefer_local_content || !post.location_city) return 0

  const preferredLocations = preferences.preferred_locations || []
  
  // Exact city match
  if (preferredLocations.includes(post.location_city)) return 1
  
  // Region match
  if (post.location_region && preferredLocations.includes(post.location_region)) return 0.7

  return 0 // No location relevance
}

/**
 * Calculates diversity factor to prevent echo chambers
 */
function calculateDiversityFactor(post: FeedPost, patterns: any): number {
  if (!patterns) return 0.5

  const userOpenness = patterns.discovery_openness || 0.7
  
  // Check if this post type/tags are underrepresented in user's typical content
  const contentTypeScore = patterns.content_type_scores?.[post.content_type] || 0.5
  const avgTagScore = post.tags?.reduce((sum, tag) => {
    return sum + (patterns.tag_affinity_scores?.[tag] || 0.5)
  }, 0) / (post.tags?.length || 1) || 0.5

  // Reward diverse content if user is open to discovery
  const diversityBonus = (1 - Math.max(contentTypeScore, avgTagScore)) * userOpenness
  
  return Math.min(1, 0.5 + diversityBonus)
}

const POPULAR_SELECT = `
  *,
  users!inner (
    id,
    username,
    first_name,
    last_name,
    avatar_url,
    subscription_tier,
    is_banned
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
`

/**
 * Gets most liked posts from the past week, sorted by actual like count
 */
async function getPopularPosts(limit: number, offset: number): Promise<FeedPost[]> {
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const fetchSize = Math.max(50, (offset + limit) * 3)

  try {
    const { data, error } = await supabase
      .from('posts')
      .select(POPULAR_SELECT)
      .eq('privacy', 'public')
      .eq('users.is_banned', false)
      .is('deleted_at', null)
      .gte('created_at', startDate.toISOString())
      .order('engagement_score', { ascending: false })
      .range(0, fetchSize - 1)

    if (error) throw error
    if (!data) return []

    // Re-sort by actual like count
    const sorted = [...data].sort((a: any, b: any) =>
      (b.post_likes?.length || 0) - (a.post_likes?.length || 0)
    )

    return sorted.slice(offset, offset + limit) as FeedPost[]
  } catch (error) {
    console.error('Error fetching popular posts:', error)
    return []
  }
}

/**
 * Gets most liked posts of all time, sorted by actual like count (no time decay)
 */
async function getMostLikedAllTime(limit: number, offset: number): Promise<FeedPost[]> {
  const fetchSize = Math.max(50, (offset + limit) * 3)

  try {
    const { data, error } = await supabase
      .from('posts')
      .select(POPULAR_SELECT)
      .eq('privacy', 'public')
      .eq('users.is_banned', false)
      .is('deleted_at', null)
      .order('engagement_score', { ascending: false })
      .range(0, fetchSize - 1)

    if (error) throw error
    if (!data) return []

    // Re-sort by actual like count (not engagement_score with time decay)
    const sorted = [...data].sort((a: any, b: any) =>
      (b.post_likes?.length || 0) - (a.post_likes?.length || 0)
    )

    return sorted.slice(offset, offset + limit) as FeedPost[]
  } catch (error) {
    console.error('Error fetching most liked all time:', error)
    return []
  }
}

/**
 * Updates user interaction patterns when they engage with content
 */
export async function recordUserInteraction(
  userId: string,
  postId: string,
  interactionType: 'like' | 'comment' | 'share' | 'view',
  postData?: Partial<FeedPost>
) {
  if (!postData) return

  const interactionStrength = {
    view: 0.1,
    like: 0.8,
    comment: 1.0,
    share: 1.2
  }[interactionType] || 0.5

  try {
    await supabase.rpc('update_user_interaction_patterns', {
      target_user_id: userId,
      interaction_type: interactionType,
      content_tags: postData.tags || [],
      content_type: postData.content_type || 'general',
      author_id: postData.user_id,
      interaction_strength: interactionStrength
    })
  } catch (error) {
    console.warn('Failed to record user interaction:', error)
  }
}