'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Hash, TrendingUp, Loader2 } from 'lucide-react'
import PostCard from '@/components/posts/PostCard'
import { Tables } from '@/lib/supabase'

type Post = Tables<'posts'> & {
  users: Tables<'users'> & {
    subscription_tier?: 'free' | 'medium' | 'premium'
  }
  post_likes: { id: string; user_id: string }[]
  comments: { id: string }[]
}

interface HashtagData {
  tag: string
  usage_count: number
}

export default function HashtagPage() {
  const params = useParams()
  const tag = params.tag as string
  const [posts, setPosts] = useState<Post[]>([])
  const [hashtagInfo, setHashtagInfo] = useState<HashtagData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = async (offset: number = 0) => {
    try {
      if (offset === 0) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const response = await fetch(
        `/api/hashtags/${tag}/posts?limit=20&offset=${offset}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }

      const data = await response.json()

      if (offset === 0) {
        setPosts(data.posts || [])
        setHashtagInfo(data.hashtag)
      } else {
        setPosts(prev => [...prev, ...(data.posts || [])])
      }

      setHasMore(data.hasMore)
      setError(null)
    } catch (err) {
      console.error('Error fetching hashtag posts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load posts')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (tag) {
      fetchPosts(0)
    }
  }, [tag])

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(posts.length)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-on-surface-variant">Loading posts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Hash className="h-16 w-16 text-outline mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-on-surface mb-2">
            Error loading hashtag
          </h2>
          <p className="text-on-surface-variant mb-4">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Hashtag Header */}
      <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-surface-container-low rounded-full p-4">
              <Hash className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-on-surface">
                #{hashtagInfo?.tag || tag}
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <TrendingUp className="h-4 w-4 text-outline" />
                <span className="text-on-surface-variant">
                  {hashtagInfo?.usage_count || 0} posts
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-outline-variant/15">
          <p className="text-on-surface-variant text-sm">
            Discover posts tagged with <span className="font-semibold">#{hashtagInfo?.tag || tag}</span>
          </p>
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-12 text-center">
          <Hash className="h-16 w-16 text-outline mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-on-surface mb-2">
            No posts yet
          </h3>
          <p className="text-on-surface-variant">
            Be the first to post with #{tag}!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={() => fetchPosts(0)}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="silk-gradient hover:opacity-90 disabled:opacity-50 text-on-primary px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>Load More</span>
                )}
              </button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="mt-6 text-center">
              <p className="text-outline text-sm">
                You&apos;ve reached the end!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
