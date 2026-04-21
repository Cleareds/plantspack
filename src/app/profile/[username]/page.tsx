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
import ProfileHero from '@/components/profile/ProfileHero'
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
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 gap-6">
        {/* Main Content (desktop Sidebar in layout already provides Profile
            nav links, so we no longer need the in-page ProfileSidebar) */}
        <div>
          <ProfileHero
            user={profile}
            mode={isOwnProfile ? 'owner' : 'public'}
            actions={isOwnProfile ? (
              <>
                <Link
                  href={`/profile/${profile.username}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  ✏️ Edit profile
                </Link>
                <Link
                  href="/profile/contributions"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-container text-on-primary-container hover:opacity-90 transition-opacity"
                >
                  <Package className="h-4 w-4" />
                  Manage contributions
                </Link>
              </>
            ) : null}
            callout={
              <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {formatDate(profile.created_at)}
                </span>
                {ownedPlaces.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ownedPlaces.slice(0, 3).map((op) => (
                      <OwnerBadge
                        key={op.place_id}
                        placeName={op.place_name}
                        placeId={op.place_id}
                        size="sm"
                      />
                    ))}
                    {ownedPlaces.length > 3 && (
                      <span className="text-xs text-outline self-center">+{ownedPlaces.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            }
          />

          {/* Social · Favorites · Packs widgets (3-column on desktop).
              Posts are no longer shown here — see /profile/contributions
              for the full managed list. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Social widget */}
            <ProfileFollowers userId={profile.id} />

            {/* Favorite Places widget */}
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border flex flex-col">
              <div className="p-4 border-b border-outline-variant/15">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-on-surface">
                    Favorite places ({favoritePlaces?.length || 0})
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
                        className="flex items-center gap-3 p-3 hover:bg-surface-container-low/50 transition-colors">
                        {img ? (
                          <img src={img} alt={place.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center text-xl flex-shrink-0">
                            {place.category === 'eat' ? '🌿' : place.category === 'hotel' ? '🛏️' : place.category === 'store' ? '🛍️' : '📍'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-on-surface text-sm truncate">{place.name}</p>
                          <p className="text-xs text-on-surface-variant truncate">
                            {[(place as any).city, (place as any).country].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                  {favoritePlaces.length > 5 && (
                    <div className="p-3 text-center">
                      <span className="text-xs text-outline">+{favoritePlaces.length - 5} more</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Packs widget (merged created + joined) */}
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border flex flex-col">
              <div className="p-4 border-b border-outline-variant/15">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-on-surface">
                      Packs ({(userPacks?.length || 0) + (joinedPacks?.length || 0)})
                    </h3>
                  </div>
                  <Link href="/packs" className="text-xs text-primary font-medium hover:underline">Browse</Link>
                </div>
              </div>
              {(userPacks?.length || 0) + (joinedPacks?.length || 0) === 0 ? (
                <div className="p-4 text-center text-outline text-sm">
                  <p>No packs yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/15">
                  {[
                    ...(userPacks || []).map((p: any) => ({ ...p, _role: 'creator' })),
                    ...(joinedPacks || []).map((p: any) => ({ ...p, _role: 'member' })),
                  ].slice(0, 5).map((pack: any) => (
                    <Link key={`${pack._role}-${pack.id}`} href={`/packs/${pack.slug}`}
                      className="block p-3 hover:bg-surface-container-low/50 transition-colors">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-medium text-on-surface text-sm truncate">{pack.title}</h4>
                        {pack._role === 'creator' && !pack.is_published && (
                          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px]">Private</span>
                        )}
                        {pack._role === 'member' && (
                          <span className="bg-surface-container-low text-on-surface-variant px-1.5 py-0.5 rounded text-[10px]">Member</span>
                        )}
                      </div>
                      {pack.description && (
                        <p className="text-xs text-outline line-clamp-2">{pack.description}</p>
                      )}
                    </Link>
                  ))}
                  {(userPacks.length + joinedPacks.length) > 5 && (
                    <div className="p-3 text-center">
                      <Link href="/packs" className="text-xs text-primary font-medium hover:underline">
                        +{(userPacks.length + joinedPacks.length) - 5} more
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
  )
}
