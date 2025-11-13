'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { User, Calendar, MapPin, Heart, ExternalLink, PawPrint, Crown } from 'lucide-react'
import ProfileFollowers from '@/components/profile/ProfileFollowers'
import ProfileSidebar from '@/components/profile/ProfileSidebar'
import { getUserSubscription, SUBSCRIPTION_TIERS } from '@/lib/stripe'
import PostCard from '@/components/posts/PostCard'

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  const { user, profile: currentUserProfile, loading: authLoading } = useAuth()

  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [addedPlaces, setAddedPlaces] = useState<any[]>([])
  const [favoritePlaces, setFavoritePlaces] = useState<any[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const isOwnProfile = currentUserProfile?.username === username

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth'
    }
  }, [authLoading, user])

  const loadProfileData = useCallback(async () => {
    setLoading(true)

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
        .eq('privacy', 'public')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      setPosts(postsData || [])

      // Fetch user's added places
      const { data: addedPlacesData } = await supabase
        .from('places')
        .select('*')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })

      setAddedPlaces(addedPlacesData || [])

      // Fetch user's favorite places
      const { data: favoritePlacesData } = await supabase
        .from('favorite_places')
        .select(`
          *,
          places (
            id,
            name,
            category,
            address,
            description,
            website,
            is_pet_friendly,
            latitude,
            longitude
          )
        `)
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })

      setFavoritePlaces(favoritePlacesData || [])

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
        </div>
      </div>
    )
  }

  const subscriptionTier = subscription ? SUBSCRIPTION_TIERS[subscription.tier] : null

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - only show for own profile */}
        {isOwnProfile && (
          <div className="lg:col-span-1">
            <ProfileSidebar username={username} />
          </div>
        )}

        {/* Main Content */}
        <div className={isOwnProfile ? "lg:col-span-3" : "lg:col-span-4"}>
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start space-x-6">
          <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center overflow-hidden flex-shrink-0 avatar-container">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.username}
                className="h-24 w-24 object-cover rounded-full"
              />
            ) : (
              <User className="h-12 w-12 text-green-600" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.first_name && profile.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile.username}
              </h1>
              {isOwnProfile && subscriptionTier && (
                <div
                  className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    color: subscriptionTier.badge.color,
                    backgroundColor: subscriptionTier.badge.bgColor
                  }}
                >
                  <Crown className="h-4 w-4" />
                  <span>{subscriptionTier.badge.text}</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 mb-2">@{profile.username}</p>

            {profile.bio && (
              <p className="text-gray-700 mb-4">{profile.bio}</p>
            )}

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {formatDate(profile.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

          {/* Profile Content Tabs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Posts ({posts?.length || 0})
            </h2>
          </div>

          {!posts || posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              <p>No public posts yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onUpdate={loadProfileData}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Following/Followers */}
          <ProfileFollowers userId={profile.id} />
          
          {/* My Added Places */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">
                  My Added Places ({addedPlaces?.length || 0})
                </h3>
              </div>
            </div>
            
            {!addedPlaces || addedPlaces.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                <p>No places added yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {addedPlaces.slice(0, 5).map((place) => (
                  <div key={place.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900 text-sm truncate">{place.name}</h4>
                          {place.is_pet_friendly && (
                            <PawPrint className="h-4 w-4 text-orange-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs capitalize">
                            {place.category}
                          </span>
                          {place.is_pet_friendly && (
                            <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs flex items-center space-x-1">
                              <PawPrint className="h-3 w-3" />
                              <span>Pet Friendly</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{place.address}</p>
                        {place.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">{place.description}</p>
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
                      <div className="mt-2 pt-2 border-t border-gray-100">
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
                    <span className="text-sm text-gray-500">
                      +{addedPlaces.length - 5} more places
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* My Favorite Places */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">
                  My Favorite Places ({favoritePlaces?.length || 0})
                </h3>
              </div>
            </div>
            
            {!favoritePlaces || favoritePlaces.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                <p>No favorite places yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {favoritePlaces.slice(0, 5).map((favorite) => {
                  const place = favorite.places
                  if (!place) return null
                  
                  return (
                    <div key={favorite.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 text-sm truncate">{place.name}</h4>
                            {place.is_pet_friendly && (
                              <PawPrint className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs capitalize">
                              {place.category}
                            </span>
                            {place.is_pet_friendly && (
                              <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs flex items-center space-x-1">
                                <PawPrint className="h-3 w-3" />
                                <span>Pet Friendly</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{place.address}</p>
                          {place.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">{place.description}</p>
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
                        <div className="mt-2 pt-2 border-t border-gray-100">
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
                  )
                })}
                {favoritePlaces.length > 5 && (
                  <div className="p-4 text-center">
                    <span className="text-sm text-gray-500">
                      +{favoritePlaces.length - 5} more favorites
                    </span>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}