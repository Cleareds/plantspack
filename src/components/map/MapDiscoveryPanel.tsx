'use client'

import { MapPin, X } from 'lucide-react'
import { PlaceWithDistance } from '@/hooks/useNearbyPlaces'
import MapPlaceCard from './MapPlaceCard'

interface MapDiscoveryPanelProps {
  places: PlaceWithDistance[]
  totalFiltered: number
  searchRadius: number
  customCenter: [number, number] | null
  user: { id: string } | null
  isOpen: boolean
  onClose: () => void
  onToggleFavorite: (placeId: string) => void
  onPanToPlace: (lat: number, lng: number) => void
  hasMore: boolean
  onLoadMore: () => void
}

export default function MapDiscoveryPanel({
  places,
  totalFiltered,
  searchRadius,
  customCenter,
  user,
  isOpen,
  onClose,
  onToggleFavorite,
  onPanToPlace,
  hasMore,
  onLoadMore,
}: MapDiscoveryPanelProps) {
  const hasPlaces = places.length > 0

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-20"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel - RIGHT side */}
      <div
        className={`
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          fixed lg:static inset-y-0 right-0 z-30
          w-80 bg-surface/95 backdrop-blur-xl
          flex-shrink-0 overflow-y-auto
          transition-transform duration-300 ease-in-out
          lg:transition-none
        `}
        style={{
          top: 'var(--header-height, 0)',
          boxShadow: '-20px 0 40px rgba(45,47,44,0.06)',
        }}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 left-4 p-2 hover:bg-surface-container rounded-md transition-colors z-10"
          aria-label="Close panel"
        >
          <X className="h-5 w-5 text-on-surface-variant" />
        </button>

        <div className="p-4 pt-14 lg:pt-4">
          <h2 className="text-lg font-medium text-on-surface mb-1">
            Places within {searchRadius}km
          </h2>
          {customCenter && (
            <p className="text-xs text-primary mb-3 font-medium">
              Searching from custom location
            </p>
          )}
          {!hasPlaces && (
            <p className="text-xs text-outline mb-4">
              Found {totalFiltered} total places
            </p>
          )}

          {!hasPlaces ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-outline mx-auto mb-3" />
              <p className="text-outline text-sm">
                No places found within {searchRadius}km radius.
              </p>
              {user && (
                <p className="text-outline text-xs mt-2">
                  Click on the map to change search center or increase radius!
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {places.map((place) => (
                <MapPlaceCard
                  key={place.id}
                  place={place}
                  user={user}
                  onToggleFavorite={onToggleFavorite}
                  onPanToPlace={onPanToPlace}
                />
              ))}

              {hasMore && (
                <button
                  onClick={onLoadMore}
                  className="w-full py-2.5 text-sm font-medium text-primary hover:bg-surface-container rounded-lg transition-colors ghost-border"
                >
                  Load More
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
