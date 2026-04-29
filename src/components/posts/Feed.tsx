'use client'

import {useState, useEffect, useCallback, useRef} from 'react'
import {useAuth} from '@/lib/auth'
import {supabase} from '@/lib/supabase'
import PostCard from './PostCard'
import ReviewFeedCard from './ReviewFeedCard'
import {Tables} from '@/lib/supabase'
import {Loader2, ArrowUp} from 'lucide-react'
import FeedSorting, {type SortOption} from './FeedSorting'
import {PostSkeleton} from '../ui/Skeleton'
import {getFeedPosts} from '@/lib/feed-algorithm'
import {useRealtimePosts} from '@/hooks/useRealtimePosts'
import {usePageState} from '@/hooks/usePageState'
import {useScrollRestoration} from '@/hooks/useScrollRestoration'

type UnifiedItem =
    | { type: 'post'; id: string; created_at: string; data: any }
    | { type: 'review'; id: string; created_at: string; data: any }
// Page state storage removed — direct fetch prevents stale cache issues with category filtering

type Post = Tables<'posts'> & {
    users: Tables<'users'>
    post_likes: { id: string; user_id: string }[]
    comments: { id: string }[]
    parent_post?: (Tables<'posts'> & {
        users: Tables<'users'>
    }) | null
    _reactions?: any[]  // Bulk-loaded reactions for performance
    _isFollowing?: boolean  // Bulk-loaded follow status for performance
}

const POSTS_PER_PAGE = 10

interface FeedProps {
    onPostCreated?: () => void
    category?: string
    excludeCategories?: string[]
}

export default function Feed({onPostCreated, category, excludeCategories}: FeedProps) {
    const [posts, setPosts] = useState<Post[]>([])
    const [items, setItems] = useState<UnifiedItem[]>([])
    const cursorRef = useRef<string | null>(null)
    const [pinnedPost, setPinnedPost] = useState<Post | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(true)
    const {user, authReady} = useAuth()
    const [feedState, setFeedState] = usePageState({
        key: 'feed_state',
        defaultValue: { activeTab: 'public' as 'public' | 'friends', sortOption: 'recent' as SortOption },
        userId: user?.id,
        enabled: !!user,
    })
    // Friends tab + Relevancy sort are hidden until activity grows. Migrate any
    // saved preferences so the UI doesn't end up in a hidden state.
    const activeTab: 'public' | 'friends' = 'public'
    const sortOption: SortOption = (feedState.sortOption === 'relevancy' ? 'recent' : feedState.sortOption) as SortOption
    const setActiveTab = useCallback((_tab: 'public' | 'friends') => {}, [])
    const setSortOption = useCallback((sort: SortOption) => setFeedState(prev => ({ ...prev, sortOption: sort })), [setFeedState])
    void setActiveTab
    const [blockedUserIds, setBlockedUserIds] = useState<string[]>([])
    const [mutedUserIds, setMutedUserIds] = useState<string[]>([])
    const observerRef = useRef<IntersectionObserver | null>(null)
    const loadMoreRef = useRef<HTMLDivElement>(null)
    const offsetRef = useRef(0)
    const {newPosts: realtimeNewPosts, clearNew, hasNewPosts, newPostCount} = useRealtimePosts()
    useScrollRestoration({ key: 'feed_scroll', delay: 400 })

    // Fetch blocked users
    useEffect(() => {
        const fetchBlockedUsers = async () => {
            if (!user) {
                setBlockedUserIds([])
                return
            }

            try {
                const { data, error } = await supabase
                    .from('user_blocks')
                    .select('blocked_id')
                    .eq('blocker_id', user.id)

                if (error) throw error

                setBlockedUserIds(data?.map(b => b.blocked_id) || [])
            } catch (error) {
                console.error('Error fetching blocked users:', error)
                setBlockedUserIds([])
            }
        }

        fetchBlockedUsers()
    }, [user])

    // Fetch muted users
    useEffect(() => {
        const fetchMutedUsers = async () => {
            if (!user) {
                setMutedUserIds([])
                return
            }

            try {
                const { data, error } = await supabase
                    .from('user_mutes')
                    .select('muted_id')
                    .eq('muter_id', user.id)

                if (error) throw error

                setMutedUserIds(data?.map(m => m.muted_id) || [])
            } catch (error) {
                console.error('Error fetching muted users:', error)
                setMutedUserIds([])
            }
        }

        fetchMutedUsers()
    }, [user])

    // Bulk load reactions and follows to prevent N+1 queries
    const enrichPostsWithMetadata = async (posts: Post[], currentUserId: string | undefined) => {
        if (posts.length === 0) return posts

        const postIds = posts.map(p => p.id)

        // Bulk load all reactions for all posts in a single query
        let reactionsByPost: Record<string, any[]> = {}
        const { data: allReactions } = await supabase
            .from('post_reactions')
            .select('reaction_type, user_id, post_id')
            .in('post_id', postIds)

        // Group reactions by post_id
        if (allReactions) {
            reactionsByPost = allReactions.reduce((acc, reaction) => {
                if (!acc[reaction.post_id]) acc[reaction.post_id] = []
                acc[reaction.post_id].push(reaction)
                return acc
            }, {} as Record<string, any[]>)
        }

        // Bulk load follow status for all unique authors in a single query
        let followingSet = new Set<string>()
        if (currentUserId) {
            const authorIds = [...new Set(posts.map(p => p.user_id))]
            const { data: follows } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', currentUserId)
                .in('following_id', authorIds)

            if (follows) {
                followingSet = new Set(follows.map(f => f.following_id))
            }
        }

        // Attach metadata to each post
        return posts.map(post => ({
            ...post,
            _reactions: reactionsByPost[post.id] || [],
            _isFollowing: followingSet.has(post.user_id)
        }))
    }

    // Handle loading new posts from realtime
    const handleLoadNewPosts = useCallback(async () => {
        if (realtimeNewPosts.length === 0) return

        // Fetch full post data for the new posts (they only have basic data from realtime)
        const postIds = realtimeNewPosts.map(p => p.id)
        const {data} = await supabase
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
                ),
                place:place_id (
                    id, name, address, category, images, average_rating, is_pet_friendly, website
                )
            `)
            .eq('users.is_banned', false)
            .is('deleted_at', null)
            .in('id', postIds)

        if (data) {
            // Bulk load reactions and follows for performance
            const postsWithMetadata = await enrichPostsWithMetadata(data as Post[], user?.id)

            // Add new posts to the top of the feed (both legacy `posts` array
            // and the unified `items` list so the UI shows them).
            setPosts(prevPosts => [...postsWithMetadata, ...prevPosts])
            setItems(prev => {
                const newItems: UnifiedItem[] = postsWithMetadata.map(p => ({
                    type: 'post' as const,
                    id: p.id,
                    created_at: p.created_at,
                    data: p,
                }))
                const existing = new Set(prev.map(it => `${it.type}:${it.id}`))
                return [...newItems.filter(it => !existing.has(`${it.type}:${it.id}`)), ...prev]
            })
        }

        // Clear the realtime new posts queue
        clearNew()

        // Scroll to top
        window.scrollTo({top: 0, behavior: 'smooth'})
    }, [realtimeNewPosts, clearNew, user])

    const fetchPosts = useCallback(async (loadMore: boolean = false) => {
        try {
            if (loadMore) {
                setLoadingMore(true)
            } else {
                setLoading(true)
                setError(null)
                offsetRef.current = 0
                cursorRef.current = null
                setHasMore(true)
            }

            const currentOffset = loadMore ? offsetRef.current : 0

            // Unified feed: posts + reviews merged server-side. Replaces the old
            // posts-only feed-algorithm path. Friends-only fetch (below) is
            // currently unreachable because the Friends tab is hidden, but kept
            // for the day we re-enable it.
            if (activeTab === 'public') {
                const params = new URLSearchParams()
                params.set('limit', String(POSTS_PER_PAGE))
                params.set('sort', sortOption)
                params.set('mode', category || 'all')
                if (loadMore && cursorRef.current) params.set('cursor', cursorRef.current)

                const res = await fetch(`/api/feed/unified?${params.toString()}`)
                if (!res.ok) throw new Error(`Feed request failed: ${res.status}`)
                const json: { items: UnifiedItem[]; hasMore: boolean; nextCursor: string | null } = await res.json()

                // Enrich post items with reactions + follow status (review reactions
                // are loaded inside ReviewFeedCard via ReviewReactions).
                const postItems = json.items.filter(it => it.type === 'post')
                const enrichedPosts = await enrichPostsWithMetadata(
                    postItems.map(it => it.data) as Post[],
                    user?.id,
                )
                const enrichedById = new Map(enrichedPosts.map(p => [p.id, p]))
                const enrichedItems: UnifiedItem[] = json.items.map(it =>
                    it.type === 'post'
                        ? { ...it, data: enrichedById.get(it.id) || it.data }
                        : it,
                )

                if (loadMore) {
                    setItems(prev => {
                        const existing = new Set(prev.map(it => `${it.type}:${it.id}`))
                        return [...prev, ...enrichedItems.filter(it => !existing.has(`${it.type}:${it.id}`))]
                    })
                    setPosts(prev => {
                        const existing = new Set(prev.map(p => p.id))
                        return [...prev, ...enrichedPosts.filter(p => !existing.has(p.id))]
                    })
                } else {
                    setItems(enrichedItems)
                    setPosts(enrichedPosts)
                }

                cursorRef.current = json.nextCursor
                setHasMore(json.hasMore)
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
          post_reactions (
            id
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
          ),
          place:place_id (
            id, name, address, category, images, average_rating, is_pet_friendly, website
          )
        `)
                    .eq('privacy', 'friends')
                    .neq('category', 'article')
                    .eq('users.is_banned', false)
                    .is('deleted_at', null)
                    .or('user_id.neq.d27f7c5e-2053-4c0c-8fd1-27ee3269ad1c,category.not.in.(recipe,event)') // Exclude admin imported recipes/events
                    .in('user_id', followingIds)

                // Apply category filter
                if (category && category !== 'all') {
                    query = query.eq('category', category)
                } else if (excludeCategories && excludeCategories.length > 0) {
                    for (const ec of excludeCategories) {
                        query = query.neq('category', ec)
                    }
                }

                // Apply sorting
                switch (sortOption) {
                    case 'relevancy':
                        query = query.order('engagement_score', { ascending: false })
                        break
                    case 'recent':
                        query = query.order('created_at', { ascending: false })
                        break
                    case 'liked_week': {
                        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        query = query
                            .gte('created_at', weekAgo.toISOString())
                            .order('engagement_score', { ascending: false })
                        break
                    }
                    case 'liked_all_time':
                        query = query.order('engagement_score', { ascending: false })
                        break
                    default:
                        query = query.order('created_at', { ascending: false })
                }

                const {data, error} = await query.range(currentOffset, currentOffset + POSTS_PER_PAGE - 1)

                if (error) throw error

                let newPosts = data || []

                // For like-based sorts, re-sort by total reactions
                if (sortOption === 'liked_week' || sortOption === 'liked_all_time') {
                    newPosts = [...newPosts].sort((a: any, b: any) => {
                        const aTotal = (a.post_likes?.length || 0) + (a.post_reactions?.length || 0)
                        const bTotal = (b.post_likes?.length || 0) + (b.post_reactions?.length || 0)
                        return bTotal - aTotal
                    })
                }

                // Bulk load reactions and follows for performance (prevents N+1 queries)
                const postsWithMetadata = await enrichPostsWithMetadata(newPosts, user.id)

                if (loadMore) {
                    setPosts(prevPosts => {
                        const existingIds = new Set(prevPosts.map(p => p.id))
                        const uniqueNewPosts = postsWithMetadata.filter(p => !existingIds.has(p.id))
                        return [...prevPosts, ...uniqueNewPosts]
                    })
                    offsetRef.current = currentOffset + POSTS_PER_PAGE
                } else {
                    setPosts(postsWithMetadata)
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
                includeAnalytics: true,
                category: category || 'all',
                excludeCategories,
            })

            // Bulk load reactions and follows for performance (prevents N+1 queries)
            const postsWithMetadata = await enrichPostsWithMetadata(newPosts as any, undefined)

            if (loadMore) {
                setPosts(prevPosts => {
                    const existingIds = new Set(prevPosts.map(p => p.id))
                    const uniqueNewPosts = postsWithMetadata.filter((p: any) => !existingIds.has(p.id))
                    return [...prevPosts, ...uniqueNewPosts]
                })
            } else {
                setPosts(postsWithMetadata as any)
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
    }, [user, activeTab, sortOption, category]) // Recreate when user, tab, sort, or category changes

    const isLoadingMoreRef = useRef(false)

    const loadMorePosts = useCallback(() => {
        if (!isLoadingMoreRef.current && !loadingMore && hasMore) {
            isLoadingMoreRef.current = true
            fetchPosts(true).finally(() => {
                isLoadingMoreRef.current = false
            })
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
    }, [hasMore, loadingMore, loadMorePosts, items.length])

    // Fetch pinned post
    useEffect(() => {
        (async () => {
            try {
                const { data } = await supabase
                    .from('posts')
                    .select(`*, users (id, username, first_name, last_name, avatar_url, subscription_tier), post_likes (id, user_id), comments (id)`)
                    .eq('is_pinned', true)
                    .eq('privacy', 'public')
                    .is('deleted_at', null)
                    .maybeSingle()
                setPinnedPost(data as any)
            } catch {}
        })()
    }, [])

    // Initialize feed when auth is ready OR after a timeout (for guests)
    useEffect(() => {
        let timeoutId: NodeJS.Timeout

        if (authReady) {
            // Auth is ready, fetch immediately
            fetchPosts(false)
        } else {
            // Set a timeout to fetch posts anyway after 2 seconds (for guests or slow auth)
            timeoutId = setTimeout(() => {
                console.log('Auth taking too long, fetching posts anyway...')
                fetchPosts(false)
            }, 2000)
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId)
        }
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

    if (loading && items.length === 0) {
        return (
            <div className="max-w-2xl mx-auto px-4">
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <PostSkeleton key={i} />
                    ))}
                </div>
            </div>
        )
    }

    if (error && items.length === 0) {
        return (
            <div className="max-w-2xl mx-auto px-4">
                <div className="bg-error/10 rounded-2xl p-4 text-center">
                    <p className="text-error">{error}</p>
                    <button
                        onClick={() => fetchPosts(false)}
                        className="mt-2 bg-error hover:opacity-90 text-white px-4 py-2 rounded-full font-medium transition-colors"
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
            <div className="bg-surface-container-lowest rounded-2xl editorial-shadow mb-4 px-2 sm:px-4 py-2 sm:py-2.5">
                <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                    {/* Friends tab is hidden for now (low activity). The Public/Friends
                        switch will return once there's enough following graph density
                        to make a friends-only view feel populated. */}
                    <div className="text-sm font-medium text-on-surface-variant">
                        Community Feed
                    </div>

                    {/* Sorting on the Right - Always show */}
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-on-surface-variant hidden sm:inline">Sort by:</span>
                        <FeedSorting
                            currentSort={sortOption}
                            onSortChange={setSortOption}
                            postCount={items.length}
                        />
                    </div>
                </div>
            </div>

            {/* New Posts Banner - only show in public feed */}
            {hasNewPosts && activeTab === 'public' && (
                <div className="mb-4 sticky top-16 z-30 animate-slide-down">
                    <button
                        onClick={handleLoadNewPosts}
                        className="w-full silk-gradient hover:opacity-90 text-white px-4 py-3 rounded-xl shadow-md font-medium transition-all flex items-center justify-center space-x-2"
                    >
                        <ArrowUp className="h-5 w-5" />
                        <span>
                            {newPostCount} new post{newPostCount > 1 ? 's' : ''} available
                        </span>
                    </button>
                </div>
            )}

            {items.length === 0 && !pinnedPost && !loading ? (
                <div className="bg-surface-container-lowest rounded-2xl editorial-shadow p-8 text-center">
                    <p className="text-outline mb-4">No posts yet.</p>
                    {!user && (
                        <p className="text-sm text-outline">
                            <a href="/auth" className="text-primary hover:underline">
                                Sign in
                            </a>{' '}
                            to join the conversation.
                        </p>
                    )}
                </div>
            ) : (
                <>
                    <div className="space-y-6">
                        {/* Pinned post — only on the "All" tab so it doesn't
                            crowd out category-specific feeds. */}
                        {pinnedPost && (!category || category === 'all') && (
                            <div className="relative">
                                <div className="absolute -top-2 left-4 z-10 bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>push_pin</span>
                                    Pinned
                                </div>
                                <PostCard
                                    key={pinnedPost.id}
                                    post={pinnedPost}
                                    onUpdate={() => {}}
                                />
                            </div>
                        )}
                        {items
                            .filter(it => {
                                if (blockedUserIds.includes(it.data.user_id)) return false
                                if (mutedUserIds.includes(it.data.user_id)) return false
                                // Strip the pinned post from the regular list only
                                // when we're rendering the pinned banner above.
                                const showingPinnedBanner = pinnedPost && (!category || category === 'all')
                                if (showingPinnedBanner && it.type === 'post' && it.id === pinnedPost!.id) return false
                                return true
                            })
                            .map(it => {
                                if (it.type === 'review') {
                                    return <ReviewFeedCard key={`review-${it.id}`} review={it.data} />
                                }
                                const post = it.data as Post
                                return (
                                    <PostCard
                                        key={`post-${post.id}`}
                                        post={post}
                                        onUpdate={() => {}}
                                        reactions={post._reactions}
                                        isFollowing={post._isFollowing}
                                    />
                                )
                            })}
                    </div>

                    {/* Infinite scroll trigger - always render for intersection observer */}
                    <div
                        ref={loadMoreRef}
                        className="flex justify-center py-8"
                    >
                        {hasMore && (
                            <>
                                {loadingMore ? (
                                    <div className="flex items-center space-x-2 text-outline">
                                        <Loader2 className="h-5 w-5 animate-spin"/>
                                        <span>Loading more posts...</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={loadMorePosts}
                                        className="px-4 py-2 silk-gradient hover:opacity-90 text-white rounded-full font-medium transition-colors"
                                    >
                                        Load More Posts
                                    </button>
                                )}
                            </>
                        )}

                        {/* End of feed message */}
                        {!hasMore && items.length > 0 && !loading && (
                            <div className="text-center py-8">
                                <p className="text-outline text-sm">You&apos;re all caught up!</p>
                            </div>
                        )}
                    </div>

                    {/* Error loading more posts */}
                    {error && items.length > 0 && (
                        <div className="bg-error/10 rounded-2xl p-4 text-center mt-4">
                            <p className="text-error text-sm">{error}</p>
                            <button
                                onClick={loadMorePosts}
                                className="mt-2 bg-error hover:opacity-90 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
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