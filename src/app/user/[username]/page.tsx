'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'
import PostCard from '@/components/posts/PostCard'
import { Loader2, MapPin, Users, UserPlus, Ban, Package } from 'lucide-react'
import StarRating from '@/components/places/StarRating'
import FollowButton from '@/components/social/FollowButton'
import BlockButton from '@/components/social/BlockButton'
import MuteButton from '@/components/social/MuteButton'
import ReportButton from '@/components/moderation/ReportButton'
import TierBadge from '@/components/ui/TierBadge'
import ProfileHero from '@/components/profile/ProfileHero'
import Link from 'next/link'
import Image from 'next/image'

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
  const [userReviews, setUserReviews] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')

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

      // Fetch user's place reviews
      const { data: placeReviews } = await supabase
        .from('place_reviews')
        .select('id, place_id, rating, content, images, video_url, created_at, places:place_id(id, name, slug)')
        .eq('user_id', userData.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20)

      // Fetch user's recipe reviews
      const { data: recipeReviews } = await supabase
        .from('recipe_reviews')
        .select('id, post_id, rating, content, images, video_url, created_at, posts:post_id(id, title, slug)')
        .eq('user_id', userData.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20)

      // Combine and sort by date
      const combinedReviews = [
        ...(placeReviews || []).map((r: any) => ({ ...r, review_type: 'place' as const })),
        ...(recipeReviews || []).map((r: any) => ({ ...r, review_type: 'recipe' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setUserReviews(combinedReviews)

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
          ),
          place:place_id (
            id, name, slug, address, category, images, average_rating, is_pet_friendly, website
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <ProfileHero
        user={profileUser}
        mode="public"
        actions={
          currentUser && currentUser.id !== profileUser.id ? (
            <>
              <FollowButton userId={profileUser.id} />
              <MuteButton userId={profileUser.id} />
              <BlockButton userId={profileUser.id} />
              <ReportButton reportedType="user" reportedId={profileUser.id} className="px-2 py-1" />
            </>
          ) : null
        }
        callout={
          currentUser && currentUser.id === profileUser.id ? (
            <Link
              href={`/profile/${profileUser.username}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              This is your public profile — Go to My Profile →
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Posts */}
        <div className="lg:col-span-2">
          {(() => {
            const recipePosts = posts.filter(p => p.category === 'recipe')
            const placePosts = posts.filter(p => p.category === 'place')
            const eventPosts = posts.filter(p => p.category === 'event')

            const tabs = [
              { key: 'all', label: 'All', count: posts.length },
              { key: 'recipe', label: 'Recipes', count: recipePosts.length },
              { key: 'place', label: 'Places', count: placePosts.length },
              { key: 'event', label: 'Events', count: eventPosts.length },
              { key: 'reviews', label: 'Reviews', count: userReviews.length },
            ]

            const filteredPosts = activeTab === 'all'
              ? posts
              : activeTab === 'reviews'
              ? []
              : posts.filter(p => p.category === activeTab)

            return (
              <>
                <div className="flex gap-4 mb-4 border-b border-outline-variant/15 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                        activeTab === tab.key
                          ? 'border-primary text-primary'
                          : 'border-transparent text-outline hover:text-on-surface-variant'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                {activeTab === 'reviews' ? (
                  userReviews.length === 0 ? (
                    <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-8 text-center">
                      <p className="text-outline">No reviews yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userReviews.map((review: any) => {
                        const isPlace = review.review_type === 'place'
                        const linkedName = isPlace
                          ? review.places?.name
                          : review.posts?.title
                        const linkedHref = isPlace
                          ? `/place/${review.places?.slug || review.place_id}`
                          : `/recipe/${review.posts?.slug || review.post_id}`

                        return (
                          <div
                            key={`${review.review_type}-${review.id}`}
                            className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-4"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  isPlace
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {isPlace ? 'Place review' : 'Recipe review'}
                              </span>
                              <StarRating rating={review.rating} size="sm" />
                            </div>

                            {linkedName && (
                              <Link
                                href={linkedHref}
                                className="text-sm font-medium text-primary hover:underline mb-1 inline-block"
                              >
                                {linkedName}
                              </Link>
                            )}

                            {review.content && (
                              <p className="text-sm text-on-surface-variant line-clamp-2 mt-1">
                                {review.content}
                              </p>
                            )}

                            {review.images && review.images.length > 0 && (
                              <div className="flex gap-2 mt-2 overflow-x-auto">
                                {review.images.slice(0, 4).map((img: string, i: number) => (
                                  <img
                                    key={i}
                                    src={img}
                                    alt={`Review image ${i + 1}`}
                                    className="h-16 w-16 rounded-md object-cover flex-shrink-0"
                                  />
                                ))}
                              </div>
                            )}

                            <p className="text-xs text-outline mt-2">
                              {new Date(review.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )
                ) : filteredPosts.length === 0 && !loadingPosts ? (
                  <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-8 text-center">
                    <p className="text-outline">No {activeTab === 'all' ? 'posts' : activeTab === 'recipe' ? 'recipes' : activeTab === 'place' ? 'places' : 'events'} yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {filteredPosts.map((post) => (
                        <PostCard key={post.id} post={post} onUpdate={() => fetchPosts()} />
                      ))}
                    </div>

                    {/* Infinite scroll trigger */}
                    <div ref={loadMoreRef} className="flex justify-center py-8">
                      {hasMorePosts && (
                        <>
                          {loadingPosts ? (
                            <div className="flex items-center space-x-2 text-outline">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Loading more...</span>
                            </div>
                          ) : (
                            <button
                              onClick={loadMorePosts}
                              className="px-4 py-2 silk-gradient hover:opacity-90 text-on-primary rounded-md font-medium transition-colors"
                            >
                              Load More
                            </button>
                          )}
                        </>
                      )}

                      {!hasMorePosts && posts.length > 0 && (
                        <div className="text-center">
                          <p className="text-outline text-sm">End of posts</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )
          })()}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Favorite Places */}
          <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-on-surface flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                Favorite Places
              </h3>
              {places.length > 3 && (
                <Link href={`/user/${username}/places`} className="text-primary hover:text-primary-container text-sm">
                  View all
                </Link>
              )}
            </div>
            {places.length === 0 ? (
              <p className="text-outline text-sm">No favorite places yet.</p>
            ) : (
              <div className="space-y-2">
                {places.slice(0, 6).map((place) => (
                  <div key={place.id} className="text-sm">
                    <p className="font-medium text-on-surface">{place.name}</p>
                    <p className="text-outline text-xs">{place.category}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Following */}
          <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-on-surface flex items-center">
                <UserPlus className="h-5 w-5 mr-2 text-primary" />
                Following
              </h3>
              {following.length >= 3 && (
                <Link href={`/user/${username}/following`} className="text-primary hover:text-primary-container text-sm">
                  View all
                </Link>
              )}
            </div>
            {following.length === 0 ? (
              <p className="text-outline text-sm">Not following anyone yet.</p>
            ) : (
              <div className="space-y-3">
                {following.map((follow) => follow.following_user && (
                  <Link key={follow.id} href={`/user/${follow.following_user.username}`}>
                    <div className="flex items-center space-x-2 hover:bg-surface-container-low p-2 rounded-md transition-colors">
                      {follow.following_user.avatar_url ? (
                        <Image
                          src={follow.following_user.avatar_url}
                          alt={`${follow.following_user.username}'s avatar`}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-surface-container-low flex items-center justify-center">
                          <span className="text-primary font-medium text-xs">
                            {follow.following_user.first_name?.[0] || follow.following_user.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-on-surface truncate">
                          {follow.following_user.first_name && follow.following_user.last_name
                            ? `${follow.following_user.first_name} ${follow.following_user.last_name}`
                            : follow.following_user.username}
                        </p>
                        <p className="text-xs text-outline">@{follow.following_user.username}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Followers */}
          <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-on-surface flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary" />
                Followers
              </h3>
              {followers.length >= 3 && (
                <Link href={`/user/${username}/followers`} className="text-primary hover:text-primary-container text-sm">
                  View all
                </Link>
              )}
            </div>
            {followers.length === 0 ? (
              <p className="text-outline text-sm">No followers yet.</p>
            ) : (
              <div className="space-y-3">
                {followers.map((follow) => follow.follower_user && (
                  <Link key={follow.id} href={`/user/${follow.follower_user.username}`}>
                    <div className="flex items-center space-x-2 hover:bg-surface-container-low p-2 rounded-md transition-colors">
                      {follow.follower_user.avatar_url ? (
                        <Image
                          src={follow.follower_user.avatar_url}
                          alt={`${follow.follower_user.username}'s avatar`}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-surface-container-low flex items-center justify-center">
                          <span className="text-primary font-medium text-xs">
                            {follow.follower_user.first_name?.[0] || follow.follower_user.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-on-surface truncate">
                          {follow.follower_user.first_name && follow.follower_user.last_name
                            ? `${follow.follower_user.first_name} ${follow.follower_user.last_name}`
                            : follow.follower_user.username}
                        </p>
                        <p className="text-xs text-outline">@{follow.follower_user.username}</p>
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