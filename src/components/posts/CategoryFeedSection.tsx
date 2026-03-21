'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'
import PostCard from './PostCard'
import type { PostCategory } from '@/lib/database.types'

type Post = Tables<'posts'> & {
  users: Tables<'users'>
  post_likes: { id: string; user_id: string }[]
  comments: { id: string }[]
  parent_post?: (Tables<'posts'> & { users: Tables<'users'> }) | null
  _reactions?: any[]
  _isFollowing?: boolean
}

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  recipe: { icon: 'restaurant_menu', label: 'Recipes' },
  place: { icon: 'location_on', label: 'Places' },
  event: { icon: 'event', label: 'Events' },
  lifestyle: { icon: 'self_improvement', label: 'Lifestyle' },
  activism: { icon: 'campaign', label: 'Activism' },
  question: { icon: 'help', label: 'Questions' },
  product: { icon: 'shopping_bag', label: 'Products' },
  hotel: { icon: 'hotel', label: 'Hotels' },
  organisation: { icon: 'corporate_fare', label: 'Organisations' },
  general: { icon: 'article', label: 'General' },
}

interface CategoryFeedSectionProps {
  category: PostCategory
  userId?: string
  onViewAll: (category: PostCategory) => void
}

export default function CategoryFeedSection({ category, userId, onViewAll }: CategoryFeedSectionProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategoryPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users!inner (
            id, username, first_name, last_name, avatar_url, subscription_tier, is_banned
          ),
          post_likes ( id, user_id ),
          comments ( id ),
          parent_post:parent_post_id (
            id, user_id, content, images, image_url, created_at,
            users ( id, username, first_name, last_name, avatar_url, subscription_tier )
          )
        `)
        .eq('privacy', 'public')
        .eq('users.is_banned', false)
        .is('deleted_at', null)
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(3)

      if (error) throw error

      // Bulk load reactions
      if (data && data.length > 0 && userId) {
        const postIds = data.map(p => p.id)
        const authorIds = [...new Set(data.map(p => p.user_id))]

        const [reactionsRes, followsRes] = await Promise.all([
          supabase.from('post_reactions').select('reaction_type, user_id, post_id').in('post_id', postIds),
          supabase.from('follows').select('following_id').eq('follower_id', userId).in('following_id', authorIds),
        ])

        const reactionsByPost: Record<string, any[]> = {}
        reactionsRes.data?.forEach(r => {
          if (!reactionsByPost[r.post_id]) reactionsByPost[r.post_id] = []
          reactionsByPost[r.post_id].push(r)
        })
        const followingSet = new Set(followsRes.data?.map(f => f.following_id) || [])

        setPosts(data.map(post => ({
          ...post,
          _reactions: reactionsByPost[post.id] || [],
          _isFollowing: followingSet.has(post.user_id),
        })) as Post[])
      } else {
        setPosts((data || []) as Post[])
      }
    } catch (err) {
      console.error(`Error fetching ${category} posts:`, err)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [category, userId])

  useEffect(() => {
    fetchCategoryPosts()
  }, [fetchCategoryPosts])

  const meta = CATEGORY_META[category] || { icon: 'article', label: category }

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-surface-container-high animate-pulse" />
          <div className="h-5 w-24 bg-surface-container-high rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[0, 1].map(i => (
            <div key={i} className="bg-surface-container-lowest rounded-2xl editorial-shadow p-4 animate-pulse">
              <div className="flex space-x-3">
                <div className="h-10 w-10 bg-surface-container-high rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-surface-container-high rounded w-1/3 mb-2" />
                  <div className="h-4 bg-surface-container-high rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (posts.length === 0) return null

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>{meta.icon}</span>
          </div>
          <h2 className="font-headline font-bold text-on-surface text-lg tracking-tight">{meta.label}</h2>
        </div>
        <button
          onClick={() => onViewAll(category)}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          View all
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onUpdate={() => fetchCategoryPosts()}
            reactions={post._reactions}
            isFollowing={post._isFollowing}
          />
        ))}
      </div>
    </div>
  )
}
