'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import PostCard from './PostCard'
import { Tables } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

type Post = Tables<'posts'> & {
  users: Tables<'users'>
  post_likes: { id: string; user_id: string }[]
  comments: { id: string }[]
  parent_post?: (Tables<'posts'> & {
    users: Tables<'users'>
  }) | null
}

const POSTS_PER_PAGE = 5

interface FeedProps {
  onPostCreated?: () => void
}

export default function Feed({ onPostCreated }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'friends'>('public')
  const { user, authReady } = useAuth()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)

  const fetchPosts = useCallback(async (loadMore: boolean = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
        offsetRef.current = 0
        setPosts([])
        setHasMore(true)
      }

      const currentOffset = loadMore ? offsetRef.current : 0
      const range = loadMore ? 
        { from: currentOffset, to: currentOffset + POSTS_PER_PAGE - 1 } :
        { from: 0, to: POSTS_PER_PAGE - 1 }

      let query = supabase
        .from('posts')
        .select(`
          *,
          users (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          ),
          post_likes (
            id,
            user_id
          ),
          comments (
            id
          )
        `)
        .order('created_at', { ascending: false })
        .range(range.from, range.to)

      // Apply filters based on tab selection and user status
      if (activeTab === 'public') {
        // Public tab: only public posts
        query = query.eq('privacy', 'public')
      } else if (activeTab === 'friends' && user) {
        // Friends tab: only friends posts from people the user follows
        query = query.eq('privacy', 'friends')
        
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
        
        const followingIds = followingData?.map(f => f.following_id) || []
        followingIds.push(user.id) // Include user's own posts
        
        if (followingIds.length > 0) {
          query = query.in('user_id', followingIds)
        } else {
          // If not following anyone, only show own posts
          query = query.eq('user_id', user.id)
        }
      } else if (activeTab === 'all' && user) {
        // All tab: show both public posts and friends posts from followed users
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
        
        const followingIds = followingData?.map(f => f.following_id) || []
        followingIds.push(user.id) // Include user's own posts
        
        // Show public posts OR friends posts from people you follow
        if (followingIds.length > 0) {
          query = query.or(`privacy.eq.public,and(privacy.eq.friends,user_id.in.(${followingIds.join(',')}))`)
        } else {
          // If not following anyone, show public posts + own posts
          query = query.or(`privacy.eq.public,and(privacy.eq.friends,user_id.eq.${user.id})`)
        }
      } else {
        // Not logged in or fallback: only public posts
        query = query.eq('privacy', 'public')
      }

      const { data, error } = await query

      if (error) throw error

      const newPosts = data || []
      
      if (loadMore) {
        // Prevent duplicates when loading more
        setPosts(prevPosts => {
          const existingIds = new Set(prevPosts.map(p => p.id))
          const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id))
          return [...prevPosts, ...uniqueNewPosts]
        })
        offsetRef.current = currentOffset + POSTS_PER_PAGE
      } else {
        setPosts(newPosts)
        offsetRef.current = POSTS_PER_PAGE
      }

      // If we got fewer posts than requested, we've reached the end
      setHasMore(newPosts.length === POSTS_PER_PAGE)
      
    } catch (err) {
      console.error('Error fetching posts:', err)
      setError('Failed to load posts. Please try again.')
      if (!loadMore) {
        setPosts([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user, activeTab]) // Recreate when user or tab changes

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPosts(true)
    }
  }, [fetchPosts, loadingMore, hasMore])

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const currentRef = loadMoreRef.current
    if (!currentRef || loadingMore) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && hasMore && !loadingMore) {
          loadMorePosts()
        }
      },
      {
        threshold: 0,
        rootMargin: '200px'
      }
    )

    observerRef.current.observe(currentRef)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [hasMore, loadingMore, loadMorePosts, posts.length])

  // Initialize feed when auth is ready
  useEffect(() => {
    if (!authReady) {
      return
    }
    
    const loadInitialPosts = async () => {
      setLoading(true)
      setError(null)
      offsetRef.current = 0
      setPosts([])
      setHasMore(true)

      try {
        let query = supabase
          .from('posts')
          .select(`
            *,
            users (
              id,
              username,
              first_name,
              last_name,
              avatar_url
            ),
            post_likes (
              id,
              user_id
            ),
            comments (
              id
            )
          `)
          .order('created_at', { ascending: false })
          .range(0, POSTS_PER_PAGE - 1)

        // Apply filters based on tab selection and user status
        if (activeTab === 'public') {
          // Public tab: only public posts
          query = query.eq('privacy', 'public')
        } else if (activeTab === 'friends' && user) {
          // Friends tab: only friends posts from people the user follows
          query = query.eq('privacy', 'friends')
          
          const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id)
          
          const followingIds = followingData?.map(f => f.following_id) || []
          followingIds.push(user.id) // Include user's own posts
          
          if (followingIds.length > 0) {
            query = query.in('user_id', followingIds)
          } else {
            // If not following anyone, only show own posts
            query = query.eq('user_id', user.id)
          }
        } else if (activeTab === 'all' && user) {
          // All tab: show both public posts and friends posts from followed users
          const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id)
          
          const followingIds = followingData?.map(f => f.following_id) || []
          followingIds.push(user.id) // Include user's own posts
          
          // Show public posts OR friends posts from people you follow
          if (followingIds.length > 0) {
            query = query.or(`privacy.eq.public,and(privacy.eq.friends,user_id.in.(${followingIds.join(',')}))`)
          } else {
            // If not following anyone, show public posts + own posts
            query = query.or(`privacy.eq.public,and(privacy.eq.friends,user_id.eq.${user.id})`)
          }
        } else {
          // Not logged in or fallback: only public posts
          query = query.eq('privacy', 'public')
        }

        const { data, error } = await query

        if (error) throw error

        const newPosts = data || []
        setPosts(newPosts)
        offsetRef.current = POSTS_PER_PAGE
        setHasMore(newPosts.length === POSTS_PER_PAGE)
        
      } catch (err) {
        console.error('Error fetching posts:', err)
        setError('Failed to load posts. Please try again.')
        setPosts([])
      } finally {
        setLoading(false)
      }
    }
    
    loadInitialPosts()
  }, [authReady, user, activeTab])

  // Handle tab change
  const handleTabChange = useCallback(async (tab: 'all' | 'public' | 'friends') => {
    setActiveTab(tab)
    setPosts([])
    setHasMore(true)
    offsetRef.current = 0
    setLoading(true)
    setError(null)

    try {
      const range = { from: 0, to: POSTS_PER_PAGE - 1 }

      let query = supabase
        .from('posts')
        .select(`
          *,
          users (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          ),
          post_likes (
            id,
            user_id
          ),
          comments (
            id
          )
        `)
        .order('created_at', { ascending: false })
        .range(range.from, range.to)

      // Apply filters based on the NEW tab selection
      if (tab === 'public') {
        query = query.eq('privacy', 'public')
      } else if (tab === 'friends' && user) {
        query = query.eq('privacy', 'friends')
        
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
        
        const followingIds = followingData?.map(f => f.following_id) || []
        followingIds.push(user.id)
        
        if (followingIds.length > 0) {
          query = query.in('user_id', followingIds)
        } else {
          query = query.eq('user_id', user.id)
        }
      } else if (tab === 'all' && user) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
        
        const followingIds = followingData?.map(f => f.following_id) || []
        followingIds.push(user.id)
        
        if (followingIds.length > 0) {
          query = query.or(`privacy.eq.public,and(privacy.eq.friends,user_id.in.(${followingIds.join(',')}))`)
        } else {
          query = query.or(`privacy.eq.public,and(privacy.eq.friends,user_id.eq.${user.id})`)
        }
      } else {
        query = query.eq('privacy', 'public')
      }

      const { data, error } = await query

      if (error) throw error

      const newPosts = data || []
      setPosts(newPosts)
      offsetRef.current = POSTS_PER_PAGE
      setHasMore(newPosts.length === POSTS_PER_PAGE)
      
    } catch (err) {
      console.error('Error fetching posts for tab:', tab, err)
      setError('Failed to load posts. Please try again.')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [user])


  // Handle post creation - refresh the entire feed
  const handlePostCreated = useCallback(() => {
    console.log('🔄 Post created, refreshing feed...')
    fetchPosts(false)
    onPostCreated?.() // Call parent callback if provided
  }, [fetchPosts, onPostCreated])

  if (loading && posts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
              <div className="flex space-x-3">
                <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && posts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => fetchPosts(false)}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Feed Tabs - Only for logged in users */}
      {user && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange('all')}
              className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Posts
            </button>
            <button
              onClick={() => handleTabChange('public')}
              className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'public'
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Public
            </button>
            <button
              onClick={() => handleTabChange('friends')}
              className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'friends'
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Friends
            </button>
          </div>
        </div>
      )}
      
      {posts.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">No posts yet.</p>
          {!user && (
            <p className="text-sm text-gray-400">
              <a href="/auth" className="text-green-600 hover:underline">
                Sign in
              </a>{' '}
              to join the conversation.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={handlePostCreated} />
            ))}
          </div>

          {/* Infinite scroll trigger - always render for intersection observer */}
          <div 
            ref={loadMoreRef} 
            className="flex justify-center py-8"
          >
            {hasMore && (
              <>
                {loadingMore ? (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading more posts...</span>
                  </div>
                ) : (
                  <button
                    onClick={loadMorePosts}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
                  >
                    Load More Posts
                  </button>
                )}
              </>
            )}
            
            {/* End of feed message */}
            {!hasMore && posts.length > 0 && (
              <div className="text-center">
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-gray-500 text-sm mb-2">🌱 You&apos;ve reached the end of the feed!</p>
                  <p className="text-gray-400 text-xs">
                    {posts.length} post{posts.length !== 1 ? 's' : ''} loaded
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error loading more posts */}
          {error && posts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center mt-4">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={loadMorePosts}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}