'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'
import PostCard from '@/components/posts/PostCard'
import { Loader2, MapPin, Users, UserPlus, Ban } from 'lucide-react'
import FollowButton from '@/components/social/FollowButton'
import BlockButton from '@/components/social/BlockButton'
import MuteButton from '@/components/social/MuteButton'
import ReportButton from '@/components/moderation/ReportButton'
import TierBadge from '@/components/ui/TierBadge'
import UserStatsCompact from '@/components/profile/UserStatsCompact'
import Link from 'next/link'

type Post = Tables<'posts'> & {
  users: Tables<'users'>
  post_likes: { id: string; user_id: string }[]
  comments: { id: string }[]
}

type Place = Tables<'places'>
type Follow = Tables<'follows'> & {
  follower_user?: Tables<'users'>
  following_user?: Tables<'users'>
}

const POSTS_PER_PAGE = 10

export default function UserProfilePage() {
  const params = useParams()
  const username = params.username as string
  const { user: currentUser, loading: authLoading } = useAuth()

  const [profileUser, setProfileUser] = useState<Tables<'users'> | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [followers, setFollowers] = useState<Follow[]>([])
  const [following, setFollowing] = useState<Follow[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      window.location.href = '/auth'
    }
  }, [authLoading, currentUser])

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, subscription_tier')
        .eq('username', username)
        .single()

      if (userError) throw userError
      if (!userData) throw new Error('User not found')

      setProfileUser(userData)
      
      // Fetch user's favorite places
      const { data: placesData } = await supabase
        .from('favorite_places')
        .select(`
          places (*)
        `)
        .eq('user_id', userData.id)
        .limit(6)

      const places = placesData?.map(fp => fp.places).filter(place => place !== null).flat() || []
      setPlaces(places as Place[])

      // Fetch followers (limited to 3)
      const { data: followersData } = await supabase
        .from('follows')
        .select(`
          *,
          follower_user:users!follows_follower_id_fkey (*)
        `)
        .eq('following_id', userData.id)
        .limit(3)

      setFollowers(followersData || [])

      // Fetch following (limited to 3)
      const { data: followingData } = await supabase
        .from('follows')
        .select(`
          *,
          following_user:users!follows_following_id_fkey (*)
        `)
        .eq('follower_id', userData.id)
        .limit(3)

      setFollowing(followingData || [])

    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }, [username])

  // Fetch user's posts
  const fetchPosts = useCallback(async (loadMore: boolean = false) => {
    if (!profileUser) return
    
    try {
      if (loadMore) {
        setLoadingPosts(true)
      }

      const currentOffset = loadMore ? offsetRef.current : 0
      
      const { data, error } = await supabase
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
        .eq('user_id', profileUser.id)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + POSTS_PER_PAGE - 1)

      if (error) throw error

      const newPosts = data || []
      
      if (loadMore) {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id))
          const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id))
          return [...prev, ...uniqueNewPosts]
        })
        offsetRef.current = currentOffset + POSTS_PER_PAGE
      } else {
        setPosts(newPosts)
        offsetRef.current = POSTS_PER_PAGE
      }

      setHasMorePosts(newPosts.length === POSTS_PER_PAGE)
      
    } catch (err) {
      console.error('Error fetching posts:', err)
      setError('Failed to load posts')
    } finally {
      setLoadingPosts(false)
    }
  }, [profileUser])

  // Load more posts
  const loadMorePosts = useCallback(() => {
    if (!loadingPosts && hasMorePosts) {
      fetchPosts(true)
    }
  }, [fetchPosts, loadingPosts, hasMorePosts])

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const currentRef = loadMoreRef.current
    if (!currentRef || loadingPosts) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && hasMorePosts && !loadingPosts) {
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
  }, [hasMorePosts, loadingPosts, loadMorePosts, posts.length])

  // Initial load
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Load posts after profile is loaded
  useEffect(() => {
    if (profileUser) {
      fetchPosts()
    }
  }, [profileUser, fetchPosts])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  if (error || !profileUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-800">{error || 'User not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {profileUser.avatar_url ? (
                <img
                  src={profileUser.avatar_url}
                  alt={`${profileUser.username}'s avatar`}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-medium text-2xl">
                    {profileUser.first_name?.[0] || profileUser.username[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profileUser.first_name && profileUser.last_name
                    ? `${profileUser.first_name} ${profileUser.last_name}`
                    : profileUser.username}
                </h1>
                {(profileUser as any).subscription_tier && (profileUser as any).subscription_tier !== 'free' && (
                  <TierBadge tier={(profileUser as any).subscription_tier as 'medium' | 'premium'} size="md" />
                )}
                {profileUser.is_banned && (
                  <div className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    <Ban className="h-4 w-4" />
                    <span>Banned</span>
                  </div>
                )}
              </div>
              <p className="text-gray-500">@{profileUser.username}</p>
              {profileUser.bio && (
                <p className="text-gray-700 mt-2">{profileUser.bio}</p>
              )}
            </div>
          </div>
          {currentUser && currentUser.id !== profileUser.id && (
            <div className="flex items-center space-x-2">
              <FollowButton userId={profileUser.id} />
              <MuteButton userId={profileUser.id} />
              <BlockButton userId={profileUser.id} />
              <ReportButton
                reportedType="user"
                reportedId={profileUser.id}
                className="px-2 py-1"
              />
            </div>
          )}
        </div>

        {/* Compact Stats */}
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <UserStatsCompact userId={profileUser.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Posts */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Posts</h2>
          </div>
          
          {posts.length === 0 && !loadingPosts ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No posts yet.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onUpdate={() => fetchPosts()} />
                ))}
              </div>

              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {hasMorePosts && (
                  <>
                    {loadingPosts ? (
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
                
                {!hasMorePosts && posts.length > 0 && (
                  <div className="text-center">
                    <p className="text-gray-500 text-sm">End of posts</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Favorite Places */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-green-600" />
                Favorite Places
              </h3>
              {places.length > 3 && (
                <Link href={`/user/${username}/places`} className="text-green-600 hover:text-green-700 text-sm">
                  View all
                </Link>
              )}
            </div>
            {places.length === 0 ? (
              <p className="text-gray-500 text-sm">No favorite places yet.</p>
            ) : (
              <div className="space-y-2">
                {places.slice(0, 6).map((place) => (
                  <div key={place.id} className="text-sm">
                    <p className="font-medium text-gray-900">{place.name}</p>
                    <p className="text-gray-500 text-xs">{place.category}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Following */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <UserPlus className="h-5 w-5 mr-2 text-green-600" />
                Following
              </h3>
              {following.length >= 3 && (
                <Link href={`/user/${username}/following`} className="text-green-600 hover:text-green-700 text-sm">
                  View all
                </Link>
              )}
            </div>
            {following.length === 0 ? (
              <p className="text-gray-500 text-sm">Not following anyone yet.</p>
            ) : (
              <div className="space-y-3">
                {following.map((follow) => follow.following_user && (
                  <Link key={follow.id} href={`/user/${follow.following_user.username}`}>
                    <div className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md transition-colors">
                      {follow.following_user.avatar_url ? (
                        <img
                          src={follow.following_user.avatar_url}
                          alt={`${follow.following_user.username}'s avatar`}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 font-medium text-xs">
                            {follow.following_user.first_name?.[0] || follow.following_user.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {follow.following_user.first_name && follow.following_user.last_name
                            ? `${follow.following_user.first_name} ${follow.following_user.last_name}`
                            : follow.following_user.username}
                        </p>
                        <p className="text-xs text-gray-500">@{follow.following_user.username}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Followers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                Followers
              </h3>
              {followers.length >= 3 && (
                <Link href={`/user/${username}/followers`} className="text-green-600 hover:text-green-700 text-sm">
                  View all
                </Link>
              )}
            </div>
            {followers.length === 0 ? (
              <p className="text-gray-500 text-sm">No followers yet.</p>
            ) : (
              <div className="space-y-3">
                {followers.map((follow) => follow.follower_user && (
                  <Link key={follow.id} href={`/user/${follow.follower_user.username}`}>
                    <div className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-md transition-colors">
                      {follow.follower_user.avatar_url ? (
                        <img
                          src={follow.follower_user.avatar_url}
                          alt={`${follow.follower_user.username}'s avatar`}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 font-medium text-xs">
                            {follow.follower_user.first_name?.[0] || follow.follower_user.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {follow.follower_user.first_name && follow.follower_user.last_name
                            ? `${follow.follower_user.first_name} ${follow.follower_user.last_name}`
                            : follow.follower_user.username}
                        </p>
                        <p className="text-xs text-gray-500">@{follow.follower_user.username}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}