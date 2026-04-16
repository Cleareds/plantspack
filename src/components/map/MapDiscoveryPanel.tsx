'use client'

import { MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { PlaceWithDistance } from '@/hooks/useNearbyPlaces'
import MapPlaceCard from './MapPlaceCard'

interface MapDiscoveryPanelProps {
  places: PlaceWithDistance[]
  totalCount: number
  customCenter: [number, number] | null
  user: { id: string } | null
  isOpen: boolean
  onClose: () => void
  onToggleFavorite: (placeId: string) => void
  onPanToPlace: (lat: number, lng: number) => void
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  loading: boolean
}

export default function MapDiscoveryPanel({
  places,
  totalCount,
  customCenter,
  user,
  isOpen,
  onClose,
  onToggleFavorite,
  onPanToPlace,
  page,
  totalPages,
  onPageChange,
  loading,
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

        <div className="p-4 pt-14 lg:pt-4 pb-20 lg:pb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-medium text-on-surface">
              Nearby Places
            </h2>
            <span className="text-xs text-outline font-medium">
              {totalCount} total
            </span>
          </div>
          {customCenter && (
            <p className="text-xs text-primary mb-3 font-medium">
              Searching from custom location
            </p>
          )}

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-surface-container-lowest rounded-xl p-3 animate-pulse">
                  <div className="h-4 bg-surface-container-high rounded w-2/3 mb-2" />
                  <div className="h-3 bg-surface-container-high rounded w-full" />
                </div>
              ))}
            </div>
          ) : !hasPlaces ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-outline mx-auto mb-3" />
              <p className="text-outline text-sm">
                No places found nearby.
              </p>
              {user && (
                <p className="text-outline text-xs mt-2">
                  Click on the map to change search center!
                </p>
              )}
            </div>
          ) : (
            <>
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
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-4 pt-3 border-t border-outline-variant/15">
                  <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-on-surface-variant" />
                  </button>

                  {getPageNumbers(page, totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-1 text-xs text-outline">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => onPageChange(p as number)}
                        className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                          p === page
                            ? 'bg-primary text-on-primary-btn'
                            : 'hover:bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-on-surface-variant" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | string)[] = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}
