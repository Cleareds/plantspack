import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Globe, Heart, ExternalLink, Phone, Calendar, User, CheckCircle } from 'lucide-react'
import StarRating from '@/components/places/StarRating'
import RatingDistribution from '@/components/places/RatingDistribution'
import PlaceTagBadges from '@/components/places/PlaceTagBadges'
import PlaceReviews from '@/components/places/PlaceReviews'
import PlaceMap from '@/components/places/PlaceMap'
import FavoriteButton from '@/components/social/FavoriteButton'
import AddToPackButton from '@/components/places/AddToPackButton'
import ClaimBusinessButton from '@/components/places/ClaimBusinessButton'
import { formatDistanceToNow } from 'date-fns'
import type { PlaceOwnerPublic } from '@/types/place-claims'

type PlaceData = {
  id: string
  name: string
  category: string
  address: string
  description: string | null
  website: string | null
  phone: string | null
  is_pet_friendly: boolean
  latitude: number
  longitude: number
  tags: string[]
  opening_hours: Record<string, string> | null
  event_time: { start: string; end: string } | null
  created_at: string
  created_by: string
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
  favorite_places: { id: string; user_id: string }[]
  average_rating: number
  review_count: number
  rating_distribution: {
    '5': number
    '4': number
    '3': number
    '2': number
    '1': number
    total: number
  }
  owner: PlaceOwnerPublic | null
}

async function getPlace(id: string): Promise<PlaceData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const [placeResponse, ownerResponse] = await Promise.all([
      fetch(`${baseUrl}/api/places/${id}`, {
        next: { revalidate: 60 }
      }),
      fetch(`${baseUrl}/api/places/${id}/owner`, {
        next: { revalidate: 60 }
      })
    ])

    if (!placeResponse.ok) {
      return null
    }

    const placeData = await placeResponse.json()
    const ownerData = ownerResponse.ok ? await ownerResponse.json() : { owner: null }

    return {
      ...placeData.place,
      owner: ownerData.owner
    }
  } catch (error) {
    console.error('Error fetching place:', error)
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const place = await getPlace(id)

  if (!place) {
    return {
      title: 'Place Not Found - PlantsPack'
    }
  }

  const rating = place.average_rating > 0 ? `⭐ ${place.average_rating.toFixed(1)}` : ''
  const description = place.description || `${place.name} - ${place.category} in ${place.address}`

  return {
    title: `${place.name} ${rating} - PlantsPack`,
    description,
    openGraph: {
      title: place.name,
      description,
      type: 'website',
      siteName: 'PlantsPack'
    }
  }
}

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const place = await getPlace(id)

  if (!place) {
    notFound()
  }

  const categoryLabels: Record<string, string> = {
    restaurant: 'Restaurant',
    event: 'Event',
    museum: 'Museum',
    other: 'Other'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-green-600 transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/map?location=${encodeURIComponent(place.address)}`}
            className="hover:text-green-600 transition-colors"
          >
            Map
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{place.name}</span>
        </nav>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {categoryLabels[place.category] || place.category}
                  </span>
                  {place.is_pet_friendly && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      🐾 Pet Friendly
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{place.name}</h1>
                {place.average_rating > 0 && (
                  <div className="flex items-center gap-3 mb-3">
                    <StarRating rating={place.average_rating} size="md" showValue />
                    <span className="text-sm text-gray-600">
                      ({place.review_count} {place.review_count === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
                {place.tags && place.tags.length > 0 && (
                  <div className="mb-3">
                    <PlaceTagBadges tags={place.tags} size="sm" />
                  </div>
                )}
              </div>
              <div className="ml-4 flex items-center gap-2">
                <FavoriteButton
                  entityType="place"
                  entityId={place.id}
                  initialFavorites={place.favorite_places}
                />
                <AddToPackButton placeId={place.id} placeName={place.name} />
                <ClaimBusinessButton
                  placeId={place.id}
                  placeName={place.name}
                  isOwner={!!place.owner}
                />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4 border-b border-gray-200">
            {place.description && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{place.description}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 mb-1">Address</div>
                  <div className="text-sm text-gray-600 mb-2">{place.address}</div>
                  <div className="flex gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Google Maps
                    </a>
                    <span className="text-gray-300">•</span>
                    <a
                      href={`http://maps.apple.com/?q=${encodeURIComponent(place.name)}&address=${encodeURIComponent(place.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Apple Maps
                    </a>
                  </div>
                </div>
              </div>

              {place.website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Website</div>
                    <a
                      href={place.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      Visit Website <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {place.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Phone</div>
                    <a
                      href={`tel:${place.phone}`}
                      className="text-sm text-green-600 hover:text-green-700"
                    >
                      {place.phone}
                    </a>
                  </div>
                </div>
              )}

              {place.opening_hours && (place.category === 'restaurant' || place.category === 'cafe') && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 mb-2">Opening Hours</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(place.opening_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="text-gray-600 capitalize">{day}:</span>
                          <span className="text-gray-900">{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {place.event_time && place.category === 'event' && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Event Time</div>
                    <div className="text-sm text-gray-600">
                      {new Date(place.event_time.start).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                      {place.event_time.end && (
                        <>
                          {' - '}
                          {new Date(place.event_time.end).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Added</div>
                  <div className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(place.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Added by</div>
                  <Link
                    href={`/profile/${place.users.username}`}
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    {place.users.first_name
                      ? `${place.users.first_name} ${place.users.last_name || ''}`.trim()
                      : place.users.username}
                  </Link>
                </div>
              </div>

              {place.owner && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Verified Owner</div>
                    <Link
                      href={`/profile/${place.owner.username}`}
                      className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      {place.owner.first_name && place.owner.last_name
                        ? `${place.owner.first_name} ${place.owner.last_name}`
                        : place.owner.username}
                    </Link>
                    <span className="text-xs text-gray-500">
                      Verified {formatDistanceToNow(new Date(place.owner.verified_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
            <PlaceMap
              latitude={place.latitude}
              longitude={place.longitude}
              name={place.name}
              address={place.address}
            />
          </div>

          {/* Rating Distribution */}
          {place.review_count > 0 && (
            <div className="p-6 border-b border-gray-200">
              <RatingDistribution distribution={place.rating_distribution} />
            </div>
          )}

          {/* Reviews */}
          <div className="p-6">
            <PlaceReviews placeId={place.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
