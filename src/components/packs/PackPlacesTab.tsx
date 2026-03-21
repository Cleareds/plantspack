'use client'

import { useState, useEffect } from 'react'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import StarRating from '@/components/places/StarRating'
import PlaceTagBadges from '@/components/places/PlaceTagBadges'
import FavoriteButton from '@/components/social/FavoriteButton'
import AddPlaceModal from './AddPlaceModal'

type PackPlace = {
  id: string
  position: number
  is_pinned: boolean
  section_name: string | null
  added_at: string
  places: {
    id: string
    name: string
    category: string
    address: string
    description: string | null
    tags: string[]
    latitude: number
    longitude: number
    users: {
      id: string
      username: string
      first_name: string | null
      last_name: string | null
    }
    average_rating: number
    review_count: number
    favorite_places: { id: string; user_id: string }[]
  }
}

interface PackPlacesTabProps {
  packId: string
  userRole: 'admin' | 'moderator' | 'member' | null
  userId: string | null
}

export default function PackPlacesTab({ packId, userRole, userId }: PackPlacesTabProps) {
  const [places, setPlaces] = useState<PackPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const canManagePlaces = userRole === 'admin' || userRole === 'moderator'

  const fetchPlaces = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/packs/${packId}/places?limit=100`)
      const data = await response.json()

      if (response.ok) {
        setPlaces(data.places)
      }
    } catch (error) {
      console.error('Error fetching pack places:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlaces()
  }, [packId])

  const handleRemovePlace = async (packPlaceId: string, placeName: string) => {
    if (!confirm(`Remove "${placeName}" from this pack?`)) return

    try {
      setDeletingId(packPlaceId)
      const response = await fetch(`/api/packs/${packId}/places/${packPlaceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setPlaces(prev => prev.filter(p => p.id !== packPlaceId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove place')
      }
    } catch (error) {
      console.error('Error removing place:', error)
      alert('Failed to remove place. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-on-surface-variant">Loading places...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      {canManagePlaces && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 silk-gradient hover:opacity-90 text-on-primary rounded-md font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Place
          </button>
        </div>
      )}

      {/* Places Grid */}
      {places.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {places.map((packPlace) => {
            const place = packPlace.places

            return (
              <div
                key={packPlace.id}
                className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/place/${place.id}`}
                        className="text-lg font-semibold text-on-surface hover:text-primary transition-colors line-clamp-1"
                      >
                        {place.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-container-low text-on-surface-variant">
                          {place.category}
                        </span>
                        {packPlace.is_pinned && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-container-low text-primary">
                            📌 Pinned
                          </span>
                        )}
                      </div>
                    </div>
                    {canManagePlaces && (
                      <button
                        onClick={() => handleRemovePlace(packPlace.id, place.name)}
                        disabled={deletingId === packPlace.id}
                        className="text-outline hover:text-error transition-colors disabled:opacity-50"
                        title="Remove from pack"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Rating */}
                  {place.average_rating > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <StarRating rating={place.average_rating} size="sm" />
                      <span className="text-xs text-on-surface-variant">
                        ({place.review_count})
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {place.tags && place.tags.length > 0 && (
                    <div className="mb-3">
                      <PlaceTagBadges tags={place.tags} size="sm" />
                    </div>
                  )}

                  {/* Description */}
                  {place.description && (
                    <p className="text-sm text-on-surface-variant line-clamp-2 mb-3">
                      {place.description}
                    </p>
                  )}

                  {/* Address */}
                  <div className="flex items-start gap-2 text-sm text-outline mb-3">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{place.address}</span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-outline-variant/15">
                    <div className="text-xs text-outline">
                      Added by{' '}
                      <Link
                        href={`/user/${place.users.username}`}
                        className="text-primary hover:text-primary"
                      >
                        {place.users.first_name || place.users.username}
                      </Link>
                    </div>
                    <FavoriteButton
                      entityType="place"
                      entityId={place.id}
                      initialFavorites={place.favorite_places || []}
                      size="sm"
                      showCount={true}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-12 text-center">
          <MapPin className="h-16 w-16 text-outline mx-auto mb-4" />
          <h3 className="text-lg font-medium text-on-surface mb-2">
            No places yet
          </h3>
          <p className="text-on-surface-variant mb-4">
            {canManagePlaces
              ? 'Start building your collection of vegan places'
              : 'This pack is waiting for places to be added'}
          </p>
          {canManagePlaces && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 silk-gradient hover:opacity-90 text-on-primary rounded-md font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add First Place
            </button>
          )}
        </div>
      )}

      {/* Add Place Modal */}
      {showAddModal && (
        <AddPlaceModal
          packId={packId}
          onClose={() => setShowAddModal(false)}
          onPlaceAdded={() => {
            fetchPlaces()
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}
