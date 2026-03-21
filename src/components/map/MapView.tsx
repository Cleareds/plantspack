'use client'

import { MutableRefObject } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Heart, X, PawPrint } from 'lucide-react'
import { PlaceWithDistance } from '@/hooks/useNearbyPlaces'

// Dynamic imports for react-leaflet (SSR-safe)
const LeafletMapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false })

const MapClickHandler = dynamic(() =>
  import('react-leaflet').then(mod => {
    const { useMapEvents } = mod
    return function MapClickHandlerComponent({ onMapClick }: { onMapClick: (latlng: [number, number]) => void }) {
      useMapEvents({
        click: (e) => {
          const { lat, lng } = e.latlng
          onMapClick([lat, lng])
        }
      })
      return null
    }
  }),
  { ssr: false }
)

interface MapViewProps {
  places: PlaceWithDistance[]
  userLocation: [number, number] | null
  mapCenter: [number, number]
  searchRadius: number
  searchCenter: [number, number] | null
  customCenter: [number, number] | null
  onMapClick: (latlng: [number, number]) => void
  onResetCenter: () => void
  mapRef: MutableRefObject<any>
  placeMarkerIcon: any
  leafletIcon: any
  user: { id: string } | null
  onToggleFavorite: (placeId: string) => void
  onDeletePlace: (placeId: string) => void
  loading: boolean
}

export default function MapView({
  places,
  userLocation,
  mapCenter,
  searchRadius,
  searchCenter,
  customCenter,
  onMapClick,
  onResetCenter,
  mapRef,
  placeMarkerIcon,
  leafletIcon,
  user,
  onToggleFavorite,
  onDeletePlace,
  loading,
}: MapViewProps) {
  return (
    <div className="flex-1 relative min-h-0 w-full">
      <LeafletMapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        className="z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onMapClick={onMapClick} />

        {/* Search radius circle */}
        {searchCenter && (
          <Circle
            center={searchCenter}
            radius={searchRadius * 1000}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5'
            }}
          />
        )}

        {/* Custom search center marker */}
        {customCenter && leafletIcon && (
          <Marker position={customCenter} icon={leafletIcon}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-primary">Search Center</h3>
                <p className="text-sm text-on-surface-variant">Places within {searchRadius}km of this point</p>
                <button
                  onClick={onResetCenter}
                  className="mt-2 text-xs bg-surface-container-low hover:bg-surface-container px-2 py-1 rounded"
                >
                  Reset to your location
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* User Location Marker */}
        {userLocation && leafletIcon && !customCenter && (
          <Marker position={userLocation} icon={leafletIcon}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-blue-600">Your Location</h3>
                <p className="text-sm text-on-surface-variant">This is your current position</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Place markers */}
        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={placeMarkerIcon}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-start justify-between mb-2">
                  <Link
                    href={`/place/${place.id}`}
                    className="font-semibold text-on-surface hover:text-primary transition-colors"
                  >
                    {place.name}
                  </Link>
                  <div className="flex items-center space-x-1">
                    {user && (
                      <button
                        onClick={() => onToggleFavorite(place.id)}
                        className={`p-1 rounded ${
                          place.favorite_places.some(fav => fav.user_id === user.id)
                            ? 'text-red-500'
                            : 'text-outline hover:text-red-500'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${place.favorite_places.some(fav => fav.user_id === user.id) ? 'fill-current' : ''}`} />
                      </button>
                    )}
                    {user && user.id === place.created_by && (
                      <button
                        onClick={() => onDeletePlace(place.id)}
                        className="p-1 rounded text-outline hover:text-error"
                        title="Delete place"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-sm text-on-surface-variant">
                  <div className="flex items-center space-x-1">
                    <span className="capitalize">{place.category}</span>
                    {place.is_pet_friendly && (
                      <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs flex items-center space-x-1">
                        <PawPrint className="h-3 w-3" />
                        <span>Pet Friendly</span>
                      </span>
                    )}
                  </div>
                  <p>{place.address}</p>
                  {place.description && <p>{place.description}</p>}
                  {place.website && (
                    <a
                      href={place.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Visit Website
                    </a>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-outline-variant/15 text-xs text-outline">
                  Added by @{place.users.username}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </LeafletMapContainer>

      {loading && (
        <div className="absolute inset-0 bg-surface-container-lowest bg-opacity-75 flex items-center justify-center z-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  )
}
