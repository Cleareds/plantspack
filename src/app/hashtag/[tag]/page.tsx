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
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading posts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Hash className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Error loading hashtag
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Hashtag Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 rounded-full p-4">
              <Hash className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                #{hashtagInfo?.tag || tag}
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">
                  {hashtagInfo?.usage_count || 0} posts
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            Discover posts tagged with <span className="font-semibold">#{hashtagInfo?.tag || tag}</span>
          </p>
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Hash className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No posts yet
          </h3>
          <p className="text-gray-600">
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
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
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
              <p className="text-gray-500 text-sm">
                You've reached the end!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
