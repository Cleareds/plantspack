'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useParams } from 'next/navigation'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import { savePageState, loadPageState } from '@/lib/page-state-storage'
import Link from 'next/link'
import { User, Calendar, MapPin, Heart, ExternalLink, PawPrint, Crown, Ban, Package, Star, CalendarCheck } from 'lucide-react'
import StarRating from '@/components/places/StarRating'
import ProfileFollowers from '@/components/profile/ProfileFollowers'
import ProfileSidebar from '@/components/profile/ProfileSidebar'
import UserStatsCompact from '@/components/profile/UserStatsCompact'
import { getUserSubscription, SUBSCRIPTION_TIERS } from '@/lib/stripe'
import PostCard from '@/components/posts/PostCard'
import OwnerBadge from '@/components/places/OwnerBadge'
import type { UserOwnedPlace } from '@/types/place-claims'

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  const { user, profile: currentUserProfile, loading: authLoading } = useAuth()
  useScrollRestoration({ key: `profile_scroll_${username}`, delay: 100 })

  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [profileTab, setProfileTab] = useState('all')
  const [addedPlaces, setAddedPlaces] = useState<any[]>([])
  const [favoritePlaces, setFavoritePlaces] = useState<any[]>([])
  const [userPacks, setUserPacks] = useState<any[]>([])
  const [joinedPacks, setJoinedPacks] = useState<any[]>([])
  const [ownedPlaces, setOwnedPlaces] = useState<UserOwnedPlace[]>([])
  const [myEvents, setMyEvents] = useState<any[]>([])
  const [userReviews, setUserReviews] = useState<any[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const isOwnProfile = currentUserProfile?.username === username

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth'
    }
  }, [authLoading, user])

  // Save profile data to cache after every successful load
  const prevLoadingRef = useRef(true)
  useEffect(() => {
    const wasLoading = prevLoadingRef.current
    prevLoadingRef.current = loading
    if (wasLoading && !loading && profile) {
      savePageState(`profile_data_${username}`, {
        profile, posts, addedPlaces, favoritePlaces, userPacks, joinedPacks, ownedPlaces
      }, 5 * 60 * 1000)
    }
  })

  const loadProfileData = useCallback(async () => {
    type ProfileCache = {
      profile: any; posts: any[]; addedPlaces: any[]; favoritePlaces: any[]
      userPacks: any[]; joinedPacks: any[]; ownedPlaces: UserOwnedPlace[]
    }
    const cacheKey = `profile_data_${username}`
    const cached = loadPageState<ProfileCache>(cacheKey)
    if (cached) {
      setProfile(cached.profile)
      setPosts(cached.posts)
      setAddedPlaces(cached.addedPlaces)
      setFavoritePlaces(cached.favoritePlaces)
      setUserPacks(cached.userPacks)
      setJoinedPacks(cached.joinedPacks)
      setOwnedPlaces(cached.ownedPlaces)
      setLoading(false)
    } else {
      setLoading(true)
    }

    // Fetch profile
    const { data: profileData, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !profileData) {
      setLoading(false)
      return
    }

    setProfile(profileData)

      // Fetch posts with full data for PostCard
      const { data: postsData } = await supabase
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
          post_likes (id, user_id),
          comments (id),
          place:place_id (
            id, name, slug, address, category, images, average_rating, is_pet_friendly, website
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
        .eq('user_id', profileData.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      // On other people's profiles, filter to public only
      const isOwn = user && profileData.id === user.id
      const filteredPosts = isOwn ? postsData : postsData?.filter((p: any) => p.privacy === 'public')
      setPosts(filteredPosts || [])

      // Fetch user's added places
      const { data: addedPlacesData } = await supabase
        .from('places')
        .select('*')
        .eq('created_by', profileData.id)
        .order('created_at', { ascending: false })
        .limit(20)

      setAddedPlaces(addedPlacesData || [])

      // Fetch user's owned places (verified business owner)
      const { data: ownedPlacesData } = await supabase
        .rpc('get_user_owned_places', { p_user_id: profileData.id })

      setOwnedPlaces(ownedPlacesData || [])

      // Fetch user's favorite places
      const { data: favoritePlacesData } = await supabase
        .from('favorite_places')
        .select(`
          *,
          places (
            id,
            name,
            slug,
            category,
            address,
            description,
            website,
            is_pet_friendly,
            vegan_level,
            images,
            main_image_url,
            city,
            country,
            latitude,
            longitude
          )
        `)
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(20)

      setFavoritePlaces(favoritePlacesData || [])

      // Fetch user's packs (created by user)
      try {
        const packsRes = await fetch(`/api/packs?creator_id=${profileData.id}&limit=10`)
        const packsData = await packsRes.json()
        if (packsRes.ok) {
          setUserPacks(packsData.packs || [])
        }
      } catch (err) {
        console.error('Error loading packs:', err)
      }

      // Fetch packs user has joined (as member or moderator, excluding creator)
      try {
        const { data: memberData } = await supabase
          .from('pack_members')
          .select(`
            role,
            joined_at,
            packs:pack_id (
              id,
              title,
              description,
              category,
              categories,
              banner_url,
              is_published,
              creator_id
            )
          `)
          .eq('user_id', profileData.id)
          .neq('role', 'admin')
          .order('joined_at', { ascending: false })
          .limit(5)

        if (memberData) {
          // Filter out nulls and map to pack objects with role
          const joinedPacksData = memberData
            .filter((m: any) => m.packs)
            .map((m: any) => ({
              ...m.packs,
              member_role: m.role
            }))
          setJoinedPacks(joinedPacksData)
        }
      } catch (err) {
        console.error('Error loading joined packs:', err)
      }

      // Fetch user's event responses (interested/going)
      try {
        const { data: eventResponses } = await supabase
          .from('event_responses')
          .select(`
            status,
            post_id,
            posts:post_id (id, title, content, event_data)
          `)
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(10)

        const events = (eventResponses || [])
          .filter((r: any) => r.posts)
          .map((r: any) => ({ ...r.posts, response_status: r.status }))
        setMyEvents(events)
      } catch (err) {
        console.error('Error loading events:', err)
      }

      // Fetch user's place reviews
      try {
        const { data: placeReviews } = await supabase
          .from('place_reviews')
          .select('id, place_id, rating, content, images, video_url, created_at, places:place_id(id, name, slug)')
          .eq('user_id', profileData.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20)

        // Fetch user's recipe reviews
        const { data: recipeReviews } = await supabase
          .from('recipe_reviews')
          .select('id, post_id, rating, content, images, video_url, created_at, posts:post_id(id, title, slug)')
          .eq('user_id', profileData.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20)

        // Combine and sort by date
        const combined = [
          ...(placeReviews || []).map((r: any) => ({ ...r, review_type: 'place' as const })),
          ...(recipeReviews || []).map((r: any) => ({ ...r, review_type: 'recipe' as const })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        setUserReviews(combined)
      } catch (err) {
        console.error('Error loading reviews:', err)
      }

      // Fetch subscription if viewing own profile
      if (user && profileData.id === user.id) {
        try {
          const subData = await getUserSubscription(user.id)
          setSubscription(subData)
        } catch (err) {
          console.error('Error loading subscription:', err)
        }
      }

      setLoading(false)
  }, [username, user])

  useEffect(() => {
    loadProfileData()
  }, [loadProfileData])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const generateGoogleMapsUrl = (address: string, name: string) => {
    const query = encodeURIComponent(`${name}, ${address}`)
    return `https://www.google.com/maps/search/?api=1&query=${query}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant">Profile not found</p>
        </div>
      </div>
    )
  }


  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - only show for own profile */}
        {isOwnProfile && (
          <div className="lg:col-span-1 space-y-6">
            <ProfileSidebar username={username} />
          </div>
        )}

        {/* Main Content */}
        <div className={isOwnProfile ? "lg:col-span-3" : "lg:col-span-4"}>
          {/* Profile Header */}
          <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-3 mb-6">
        <div className="flex items-start space-x-6 mb-4">
          <div className="h-20 w-20 rounded-full bg-surface-container-low flex items-center justify-center overflow-hidden flex-shrink-0 avatar-container">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="h-20 w-20 object-cover rounded-full"
              />
            ) : (
              <User className="h-12 w-12 text-primary" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-on-surface">
                {profile.first_name && profile.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile.username}
              </h1>
              {profile.subscription_tier && profile.subscription_tier !== 'free' && (
                <div
                  className="flex items-center space-x-1 px-1 sm:px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    color: SUBSCRIPTION_TIERS[profile.subscription_tier]?.badge.color,
                    backgroundColor: SUBSCRIPTION_TIERS[profile.subscription_tier]?.badge.bgColor
                  }}
                >
                  <Crown className="h-4 w-4" />
                  <span className={"hidden sm:inline"}>Supporter</span>
                </div>
              )}
              {profile.is_banned && (
                <div className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <Ban className="h-4 w-4" />
                  <span>Banned</span>
                </div>
              )}
            </div>
            <p className="text-on-surface-variant mb-2">@{profile.username}</p>

            {profile.bio && (
              <p className="text-on-surface-variant mb-4">{profile.bio}</p>
            )}

            {/* Owner Badges */}
            {ownedPlaces.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {ownedPlaces.map((ownedPlace) => (
                  <OwnerBadge
                    key={ownedPlace.place_id}
                    placeName={ownedPlace.place_name}
                    placeId={ownedPlace.place_id}
                    size="sm"
                  />
                ))}
              </div>
            )}

            <div className="flex items-center space-x-4 text-sm text-outline">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {formatDate(profile.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Stats */}
        <div className="pt-4 border-t border-outline-variant/15 flex justify-end">
          <UserStatsCompact userId={profile.id} />
        </div>
      </div>

          {/* Profile Content Tabs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts with Category Tabs */}
        <div className="lg:col-span-2">
          {/* Tab navigation */}
          {(() => {
            const recipePosts = posts?.filter((p: any) => p.category === 'recipe') || []
            const placePosts = posts?.filter((p: any) => p.category === 'place') || []
            const eventPosts = posts?.filter((p: any) => p.category === 'event') || []

            const tabs = [
              { key: 'all', label: 'All', count: posts?.length || 0 },
              { key: 'recipe', label: 'Recipes', count: recipePosts.length },
              { key: 'place', label: 'Places', count: placePosts.length },
              { key: 'event', label: 'Events', count: eventPosts.length },
              { key: 'reviews', label: 'Reviews', count: userReviews.length },
            ]

            const filteredPosts = profileTab === 'all'
              ? posts
              : profileTab === 'reviews'
              ? []
              : posts?.filter((p: any) => p.category === profileTab) || []

            return (
              <>
                <div className="flex gap-4 mb-4 border-b border-outline-variant/15 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setProfileTab(tab.key)}
                      className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                        profileTab === tab.key
                          ? 'border-primary text-primary'
                          : 'border-transparent text-outline hover:text-on-surface-variant'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                {profileTab === 'reviews' ? (
                  userReviews.length === 0 ? (
                    <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-8 text-center text-outline">
                      <p>No reviews yet.</p>
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
                ) : !filteredPosts || filteredPosts.length === 0 ? (
                  <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-8 text-center text-outline">
                    <p>No {profileTab === 'all' ? 'posts' : profileTab === 'recipe' ? 'recipes' : profileTab === 'place' ? 'places' : 'events'} yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPosts.map((post: any) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onUpdate={loadProfileData}
                      />
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Following/Followers */}
          <ProfileFollowers userId={profile.id} />

          {/* My Events */}
          {myEvents.length > 0 && (
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border">
              <div className="p-4 border-b border-outline-variant/15">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-on-surface">
                    My Events ({myEvents.length})
                  </h3>
                </div>
              </div>
              <div className="divide-y divide-outline-variant/15">
                {myEvents.slice(0, 5).map((event: any) => {
                  const ed = event.event_data
                  const startDate = ed?.start_time ? new Date(ed.start_time) : null
                  return (
                    <Link key={event.id} href={`/event/${event.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-container-low transition-colors">
                      {startDate && (
                        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-[8px] font-bold text-primary uppercase leading-none">
                            {startDate.toLocaleDateString(undefined, { month: 'short' })}
                          </span>
                          <span className="text-sm font-bold text-on-surface leading-none">
                            {startDate.getDate()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">
                          {event.title || event.content?.split('\n')[0]?.substring(0, 60)}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                          {event.response_status === 'going' ? (
                            <><CalendarCheck className="h-3 w-3 text-green-600" /><span className="text-green-600">Going</span></>
                          ) : (
                            <><Star className="h-3 w-3 text-primary" /><span className="text-primary">Interested</span></>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* My Added Places */}
          <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border">
            <div className="p-4 border-b border-outline-variant/15">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-on-surface">
                  My Added Places ({addedPlaces?.length || 0})
                </h3>
              </div>
            </div>
            
            {!addedPlaces || addedPlaces.length === 0 ? (
              <div className="p-4 text-center text-outline text-sm">
                <p>No places added yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/15">
                {addedPlaces.slice(0, 5).map((place) => (
                  <div key={place.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Link
                            href={`/place/${(place as any).slug || place.id}`}
                            className="font-medium text-on-surface text-sm truncate hover:text-primary transition-colors"
                          >
                            {place.name}
                          </Link>
                          {place.is_pet_friendly && (
                            <PawPrint className="h-4 w-4 text-orange-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="bg-surface-container-low text-on-surface px-2 py-0.5 rounded text-xs capitalize">
                            {place.category}
                          </span>
                          {place.is_pet_friendly && (
                            <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs flex items-center space-x-1">
                              <PawPrint className="h-3 w-3" />
                              <span>Pet Friendly</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant mb-2">{place.address}</p>
                        {place.description && (
                          <p className="text-xs text-outline line-clamp-2">{place.description}</p>
                        )}
                      </div>
                      <a
                        href={generateGoogleMapsUrl(place.address, place.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 flex-shrink-0 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    {place.website && (
                      <div className="mt-2 pt-2 border-t border-outline-variant/15">
                        <a
                          href={place.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Visit Website</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
                {addedPlaces.length > 5 && (
                  <div className="p-4 text-center">
                    <span className="text-sm text-outline">
                      +{addedPlaces.length - 5} more places
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* My Favorite Places */}
          <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border">
            <div className="p-4 border-b border-outline-variant/15">
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-on-surface">
                  My Favorite Places ({favoritePlaces?.length || 0})
                </h3>
              </div>
            </div>
            
            {!favoritePlaces || favoritePlaces.length === 0 ? (
              <div className="p-4 text-center text-outline text-sm">
                <p>No favorite places yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/15">
                {favoritePlaces.slice(0, 5).map((favorite) => {
                  const place = favorite.places
                  if (!place) return null
                  const img = (place as any).main_image_url || (place as any).images?.[0]

                  return (
                    <Link key={favorite.id} href={`/place/${(place as any).slug || place.id}`}
                      className="flex items-center gap-3 p-4 hover:bg-surface-container-low/50 transition-colors">
                      {img ? (
                        <img src={img} alt={place.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-surface-container-low flex items-center justify-center text-xl flex-shrink-0">
                          {place.category === 'eat' ? '🌿' : place.category === 'hotel' ? '🛏️' : place.category === 'store' ? '🛍️' : '📍'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-on-surface text-sm truncate">{place.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          {[place.address, (place as any).city, (place as any).country].filter(Boolean).join(', ')}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {(place as any).vegan_level === 'fully_vegan' ? (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">100% Vegan</span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Vegan-Friendly</span>
                          )}
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant capitalize">{place.category}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
                {favoritePlaces.length > 5 && (
                  <div className="p-4 text-center">
                    <span className="text-sm text-outline">
                      +{favoritePlaces.length - 5} more favorites
                    </span>
                  </div>
                )}
              </div>
            )}
            </div>

          {/* Packs link */}
          <Link href="/packs" className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-lg editorial-shadow ghost-border hover:border-primary/20 transition-all">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>groups</span>
            <span className="text-sm font-medium text-on-surface">Browse Packs</span>
          </Link>

          {/* My Packs */}
          {userPacks.length > 0 && (
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border">
              <div className="p-4 border-b border-outline-variant/15">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-on-surface">
                      Packs ({userPacks.length})
                    </h3>
                  </div>
                  <Link href="/packs" className="text-sm text-primary hover:text-primary font-medium">
                    View all
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-outline-variant/15">
                {userPacks.slice(0, 5).map((pack: any) => (
                  <Link key={pack.id} href={`/packs/${pack.slug}`} className="block p-4 hover:bg-surface-container-low transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-on-surface text-sm truncate">{pack.title}</h4>
                          {!pack.is_published && (
                            <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-xs">
                              Draft
                            </span>
                          )}
                        </div>
                        {pack.description && (
                          <p className="text-xs text-outline line-clamp-2">{pack.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-outline">
                          <span>{pack.member_count || 0} members</span>
                          <span>{pack.post_count || 0} posts</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                {userPacks.length > 5 && (
                  <div className="p-4 text-center">
                    <Link href="/packs" className="text-sm text-primary hover:text-primary font-medium">
                      +{userPacks.length - 5} more packs
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Joined Packs */}
          {joinedPacks.length > 0 && (
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border">
              <div className="p-4 border-b border-outline-variant/15">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-on-surface">
                      Joined Packs ({joinedPacks.length})
                    </h3>
                  </div>
                  <Link href="/packs" className="text-sm text-primary hover:text-primary font-medium">
                    View all
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-outline-variant/15">
                {joinedPacks.slice(0, 5).map((pack: any) => (
                  <Link key={pack.id} href={`/packs/${pack.slug}`} className="block p-4 hover:bg-surface-container-low transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-on-surface text-sm truncate">{pack.title}</h4>
                          {pack.member_role && (
                            <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs capitalize">
                              {pack.member_role}
                            </span>
                          )}
                        </div>
                        {pack.description && (
                          <p className="text-xs text-outline line-clamp-2">{pack.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-outline">
                          <span>{pack.member_count || 0} members</span>
                          <span>{pack.post_count || 0} posts</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}