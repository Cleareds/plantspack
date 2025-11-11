'use client'

import {useState, useEffect, useCallback, useRef} from 'react'
import {useAuth} from '@/lib/auth'
import {supabase} from '@/lib/supabase'
import PostCard from './PostCard'
import {Tables} from '@/lib/supabase'
import {Loader2, ArrowUp} from 'lucide-react'
import FeedSorting, {type SortOption} from './FeedSorting'
import {getFeedPosts} from '@/lib/feed-algorithm'
import {useRealtimePosts} from '@/hooks/useRealtimePosts'

type Post = Tables<'posts'> & {
    users: Tables<'users'>
    post_likes: { id: string; user_id: string }[]
    comments: { id: string }[]
    parent_post?: (Tables<'posts'> & {
        users: Tables<'users'>
    }) | null
}

const POSTS_PER_PAGE = 10

interface FeedProps {
    onPostCreated?: () => void
}

export default function Feed({onPostCreated}: FeedProps) {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(true)
    const [activeTab, setActiveTab] = useState<'public' | 'friends'>('public')
    const [sortOption, setSortOption] = useState<SortOption>('relevancy')
    const {user, authReady} = useAuth()
    const observerRef = useRef<IntersectionObserver | null>(null)
    const loadMoreRef = useRef<HTMLDivElement>(null)
    const offsetRef = useRef(0)
    const {newPosts: realtimeNewPosts, clearNew, hasNewPosts, newPostCount} = useRealtimePosts()

    // Handle loading new posts from realtime
    const handleLoadNewPosts = useCallback(async () => {
        if (realtimeNewPosts.length === 0) return

        // Fetch full post data for the new posts (they only have basic data from realtime)
        const postIds = realtimeNewPosts.map(p => p.id)
        const {data} = await supabase
            .from('posts')
            .select(`
                *,
                users (
                    id,
                    username,
                    first_name,
                    last_name,
                    avatar_url,
                    subscription_tier
                ),
                post_likes (
                    id,
                    user_id
                ),
                comments (
                    id
                )
            `)
            .in('id', postIds)

        if (data) {
            // Add new posts to the top of the feed
            setPosts(prevPosts => [...(data as Post[]), ...prevPosts])
        }

        // Clear the realtime new posts queue
        clearNew()

        // Scroll to top
        window.scrollTo({top: 0, behavior: 'smooth'})
    }, [realtimeNewPosts, clearNew])

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

            // Use feed algorithm with sorting for both public and friends feeds
            if (activeTab === 'public') {
                const newPosts = await getFeedPosts({
                    sortBy: sortOption,
                    limit: POSTS_PER_PAGE,
                    offset: currentOffset,
                    userId: user?.id,
                    includeAnalytics: true
                })

                if (loadMore) {
                    setPosts(prevPosts => [...prevPosts, ...(newPosts as any)])
                } else {
                    setPosts(newPosts as any)
                }

                setHasMore(newPosts.length === POSTS_PER_PAGE)
                offsetRef.current = currentOffset + newPosts.length

                return
            }

            // Friends feed: show friends posts from people the user follows with sorting
            if (activeTab === 'friends' && user) {
                // Get following list first
                const {data: followingData} = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', user.id)

                const followingIds = followingData?.map(f => f.following_id) || []
                followingIds.push(user.id) // Include user's own posts

                let query = supabase
                    .from('posts')
                    .select(`
          *,
          users (
            id,
            username,
            first_name,
            last_name,
            avatar_url,
            subscription_tier
          ),
          post_likes (
            id,
            user_id
          ),
          comments (
            id
          )
        `)
                    .eq('privacy', 'friends')
                    .in('user_id', followingIds)

                // Apply sorting
                switch (sortOption) {
                    case 'relevancy':
                        query = query.order('engagement_score', { ascending: false })
                        break
                    case 'recent':
                        query = query.order('created_at', { ascending: false })
                        break
                    case 'liked_today':
                    case 'liked_week':
                    case 'liked_month':
                    case 'liked_all_time':
                        // For popularity-based sorts, order by engagement score
                        query = query.order('engagement_score', { ascending: false })
                        break
                    default:
                        query = query.order('created_at', { ascending: false })
                }

                const {data, error} = await query.range(currentOffset, currentOffset + POSTS_PER_PAGE - 1)

                if (error) throw error

                const newPosts = data || []

                if (loadMore) {
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

                setHasMore(newPosts.length === POSTS_PER_PAGE)
                return
            }

            // Not logged in: show public posts only
            const newPosts = await getFeedPosts({
                sortBy: sortOption,
                limit: POSTS_PER_PAGE,
                offset: currentOffset,
                userId: undefined,
                includeAnalytics: true
            })

            if (loadMore) {
                setPosts(prevPosts => [...prevPosts, ...(newPosts as any)])
            } else {
                setPosts(newPosts as any)
            }

            setHasMore(newPosts.length === POSTS_PER_PAGE)
            offsetRef.current = currentOffset + newPosts.length

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
    }, [user, activeTab, sortOption]) // Recreate when user, tab, or sort changes

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

        fetchPosts(false)
    }, [authReady, fetchPosts])

    // Handle tab change
    const handleTabChange = useCallback((tab: 'public' | 'friends') => {
        setActiveTab(tab)
        // fetchPosts will be called due to dependency change
    }, [])


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
            {/* Feed Controls - Horizontal Layout with Tabs on Left, Sorting on Right */}
            {user && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        {/* Tabs on the Left */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleTabChange('public')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    activeTab === 'public'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Public
                            </button>
                            <button
                                onClick={() => handleTabChange('friends')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    activeTab === 'friends'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Friends
                            </button>
                        </div>

                        {/* Sorting on the Right */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Sort by:</span>
                            <FeedSorting
                                currentSort={sortOption}
                                onSortChange={setSortOption}
                                postCount={posts.length}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* New Posts Banner - only show in public feed */}
            {hasNewPosts && activeTab === 'public' && (
                <div className="mb-4 sticky top-16 z-30 animate-slide-down">
                    <button
                        onClick={handleLoadNewPosts}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg shadow-md font-medium transition-all flex items-center justify-center space-x-2"
                    >
                        <ArrowUp className="h-5 w-5" />
                        <span>
                            {newPostCount} new post{newPostCount > 1 ? 's' : ''} available
                        </span>
                    </button>
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
                            <PostCard key={post.id} post={post} onUpdate={handlePostCreated}/>
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
                                        <Loader2 className="h-5 w-5 animate-spin"/>
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
                                    <p className="text-gray-500 text-sm mb-2">🌱 You&apos;ve reached the end of the
                                        feed!</p>
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