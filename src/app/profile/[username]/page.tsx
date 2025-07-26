import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { User, Calendar, MapPin, Heart } from 'lucide-react'

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !profile) {
    notFound()
  }

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      post_likes (id),
      comments (id)
    `)
    .eq('user_id', profile.id)
    .eq('privacy', 'public')
    .order('created_at', { ascending: false })

  // Fetch user's added places
  const { data: addedPlaces } = await supabase
    .from('places')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  // Fetch user's favorite places
  const { data: favoritePlaces } = await supabase
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
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
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
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.first_name && profile.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : profile.username}
            </h1>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Posts ({posts?.length || 0})
              </h2>
            </div>
            
            {!posts || posts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No public posts yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {posts.map((post) => (
                  <div key={post.id} className="p-6">
                    <div className="mb-2">
                      <span className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap mb-3">{post.content}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{post.post_likes?.length || 0} likes</span>
                      <span>{post.comments?.length || 0} comments</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Places Sidebar */}
        <div className="space-y-6">
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
                    <h4 className="font-medium text-gray-900 text-sm">{place.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs capitalize">
                        {place.category}
                      </span>
                      {place.is_pet_friendly && (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                          Pet Friendly
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{place.address}</p>
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
                {favoritePlaces.slice(0, 5).map((favorite) => (
                  <div key={favorite.id} className="p-4">
                    <h4 className="font-medium text-gray-900 text-sm">{favorite.places.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs capitalize">
                        {favorite.places.category}
                      </span>
                      {favorite.places.is_pet_friendly && (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                          Pet Friendly
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{favorite.places.address}</p>
                  </div>
                ))}
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
  )
}