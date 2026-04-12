'use client'

import Link from 'next/link'
import { Heart, PawPrint, Star } from 'lucide-react'
import { PlaceWithDistance } from '@/hooks/useNearbyPlaces'

interface MapPlaceCardProps {
  place: PlaceWithDistance
  user: { id: string } | null
  onToggleFavorite: (placeId: string) => void
  onPanToPlace?: (lat: number, lng: number) => void
}

export default function MapPlaceCard({ place, user, onToggleFavorite }: MapPlaceCardProps) {
  const isFavorited = user ? place.favorite_places.some(fav => fav.user_id === user.id) : false

  return (
    <Link
      href={`/place/${(place as any).slug || place.id}`}
      className="block bg-surface-container-lowest rounded-xl p-4 hover:border-primary/20 transition-colors cursor-pointer ghost-border editorial-shadow"
    >
      {((place as any).main_image_url || (place as any).images?.length > 0) && (
        <div className="relative mb-2">
          <img
            src={(place as any).main_image_url || (place as any).images[0]}
            alt={place.name}
            className="w-full h-24 object-cover rounded-lg"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="absolute top-1.5 left-1.5 flex gap-1">
            {(place as any).vegan_level === 'fully_vegan' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-600 text-white">100% Vegan</span>
            )}
            {place.is_pet_friendly && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500 text-white flex items-center gap-0.5">
                <PawPrint className="h-2.5 w-2.5" /> Pets
              </span>
            )}
          </div>
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <span className="font-semibold text-on-surface text-sm hover:text-primary transition-colors leading-tight">
          {place.name}
        </span>
        {user && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(place.id)
            }}
            className={`p-1 rounded-full transition-colors ${
              isFavorited
                ? 'text-red-500'
                : 'text-outline hover:text-red-500'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="bg-secondary-container text-on-surface px-2 py-0.5 rounded-md text-xs capitalize font-medium">
            {place.category}
          </span>
          {place.is_pet_friendly && (
            <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md text-xs flex items-center gap-1">
              <PawPrint className="h-3 w-3" />
              <span>Pet Friendly</span>
            </span>
          )}
        </div>

        {(place as any).average_rating != null && (place as any).average_rating > 0 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < Math.round((place as any).average_rating)
                    ? 'text-yellow-500 fill-yellow-500'
                    : 'text-outline'
                }`}
              />
            ))}
            <span className="text-xs text-on-surface-variant ml-1">
              {((place as any).average_rating as number).toFixed(1)}
            </span>
          </div>
        )}

        <p className="text-xs text-on-surface-variant line-clamp-1">{place.address}</p>
        <p className="text-xs text-outline font-medium">
          {place.distance.toFixed(1)}km away
        </p>
        {place.description && (
          <p className="text-xs text-on-surface-variant line-clamp-2">{place.description}</p>
        )}
      </div>
    </Link>
  )
}
