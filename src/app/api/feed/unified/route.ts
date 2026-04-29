import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 30

type SortOption = 'recent' | 'liked_week' | 'liked_all_time'
type Mode =
  | 'all'
  | 'reviews'
  | 'recipe' | 'place' | 'event' | 'lifestyle' | 'activism' | 'question'
  | 'product' | 'general' | 'hotel' | 'organisation' | 'article'

const POST_CATEGORIES = new Set([
  'recipe', 'place', 'event', 'lifestyle', 'activism', 'question',
  'product', 'general', 'hotel', 'organisation', 'article',
])

interface UnifiedPostItem {
  type: 'post'
  id: string
  created_at: string
  data: any
}
interface UnifiedReviewItem {
  type: 'review'
  id: string
  created_at: string
  data: any
}
type UnifiedItem = UnifiedPostItem | UnifiedReviewItem

function parseCursor(cursor: string | null): { ts: string; id: string } | null {
  if (!cursor) return null
  const [ts, id] = cursor.split('|')
  if (!ts || !id) return null
  return { ts, id }
}
function makeCursor(item: UnifiedItem): string {
  return `${item.created_at}|${item.id}`
}

const POST_FIELDS = `
  id, user_id, title, content, category, images, image_url, video_url,
  privacy, created_at, slug, is_pinned, place_id, parent_post_id,
  engagement_score, deleted_at,
  users!inner(id, username, first_name, last_name, avatar_url, subscription_tier, is_banned),
  post_likes(id, user_id),
  post_reactions(id, reaction_type, user_id),
  comments(id),
  place:place_id(id, name, address, category, images, average_rating, is_pet_friendly, website, slug)
`

const REVIEW_FIELDS = `
  id, user_id, place_id, rating, content, images, created_at, edited_at, deleted_at,
  users!inner(id, username, first_name, last_name, avatar_url, subscription_tier, is_banned),
  place:place_id(id, name, slug, city, country, category, main_image_url, images, vegan_level, average_rating, review_count),
  place_review_reactions(id, reaction_type, user_id)
`

async function fetchPosts(opts: {
  limit: number
  cursor: { ts: string; id: string } | null
  sort: SortOption
  category?: string
}) {
  const { limit, cursor, sort, category } = opts
  const supabase = createAdminClient()
  let q = supabase
    .from('posts')
    .select(POST_FIELDS)
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .eq('users.is_banned', false)
    // Same admin filter as homepage getRecentPosts: hide imported recipes/events.
    .or(`user_id.neq.${ADMIN_USER_ID},category.not.in.(recipe,event)`)

  if (category && POST_CATEGORIES.has(category)) {
    q = q.eq('category', category)
  }

  if (sort === 'liked_week') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    q = q.gte('created_at', weekAgo).order('engagement_score', { ascending: false }).limit(limit)
  } else if (sort === 'liked_all_time') {
    q = q.order('engagement_score', { ascending: false }).limit(limit)
  } else {
    // recent: compound (created_at, id) cursor so ties are stable across pages.
    q = q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit)
    if (cursor) {
      q = q.or(`created_at.lt.${cursor.ts},and(created_at.eq.${cursor.ts},id.lt.${cursor.id})`)
    }
  }

  const { data, error } = await q
  if (error) throw error
  return data || []
}

async function fetchReviews(opts: {
  limit: number
  cursor: { ts: string; id: string } | null
  sort: SortOption
}) {
  const { limit, cursor, sort } = opts
  const supabase = createAdminClient()
  let q = supabase
    .from('place_reviews')
    .select(REVIEW_FIELDS)
    .is('deleted_at', null)
    .eq('users.is_banned', false)

  if (sort === 'liked_week') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    q = q.gte('created_at', weekAgo).order('engagement_score', { ascending: false }).limit(limit)
  } else if (sort === 'liked_all_time') {
    q = q.order('engagement_score', { ascending: false }).limit(limit)
  } else {
    q = q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit)
    if (cursor) {
      q = q.or(`created_at.lt.${cursor.ts},and(created_at.eq.${cursor.ts},id.lt.${cursor.id})`)
    }
  }

  const { data, error } = await q
  if (error) throw error
  return data || []
}

function postReactionSum(p: any): number {
  return (p.post_likes?.length || 0) + (p.post_reactions?.length || 0)
}
function reviewReactionSum(r: any): number {
  return r.place_review_reactions?.length || 0
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT))
  const cursor = parseCursor(searchParams.get('cursor'))
  const mode = (searchParams.get('mode') || 'all') as Mode
  const sort = (searchParams.get('sort') || 'recent') as SortOption

  try {
    let items: UnifiedItem[] = []
    // hasMore reflects whether the underlying sources had a full page available.
    // For 'all' mode either source maxing out the limit means the other side or
    // future pages may still have items beyond this page's window.
    let hasMore = false

    if (mode === 'reviews') {
      const reviews = await fetchReviews({ limit, cursor, sort })
      hasMore = reviews.length === limit
      items = reviews.map((r: any) => ({ type: 'review', id: r.id, created_at: r.created_at, data: r } as UnifiedReviewItem))
    } else if (POST_CATEGORIES.has(mode)) {
      const posts = await fetchPosts({ limit, cursor, sort, category: mode })
      hasMore = posts.length === limit
      items = posts.map((p: any) => ({ type: 'post', id: p.id, created_at: p.created_at, data: p } as UnifiedPostItem))
    } else {
      // 'all' — mixed posts + reviews
      const [posts, reviews] = await Promise.all([
        fetchPosts({ limit, cursor, sort }),
        fetchReviews({ limit, cursor, sort }),
      ])
      const postItems: UnifiedItem[] = posts.map((p: any) => ({ type: 'post', id: p.id, created_at: p.created_at, data: p }))
      const reviewItems: UnifiedItem[] = reviews.map((r: any) => ({ type: 'review', id: r.id, created_at: r.created_at, data: r }))
      const merged: UnifiedItem[] = [...postItems, ...reviewItems]

      if (sort === 'liked_week' || sort === 'liked_all_time') {
        merged.sort((a, b) => {
          const av = a.type === 'post' ? postReactionSum(a.data) : reviewReactionSum(a.data)
          const bv = b.type === 'post' ? postReactionSum(b.data) : reviewReactionSum(b.data)
          return bv - av
        })
      } else {
        merged.sort((a, b) => {
          if (a.created_at === b.created_at) return a.id < b.id ? 1 : -1
          return a.created_at < b.created_at ? 1 : -1
        })
      }
      items = merged.slice(0, limit)
      // Backend is exhausted only when *both* sources returned less than a full
      // page — otherwise either side may have more rows available beyond this
      // page's discarded tail.
      hasMore = posts.length === limit || reviews.length === limit
    }

    const nextCursor = hasMore && items.length > 0 ? makeCursor(items[items.length - 1]) : null

    return NextResponse.json({ items, hasMore, nextCursor })
  } catch (err: any) {
    console.error('[/api/feed/unified] error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error', items: [], hasMore: false }, { status: 500 })
  }
}
