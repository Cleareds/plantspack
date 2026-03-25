'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Star, PawPrint, ExternalLink } from 'lucide-react'
import CityMap from './CityMap'

const CATEGORY_LABELS: Record<string, string> = {
  eat: 'Eat',
  hotel: 'Stay',
  store: 'Store',
  event: 'Event',
  organisation: 'Organisation',
  other: 'Other',
}

interface Place {
  id: string
  slug: string | null
  name: string
  category: string
  address: string
  description: string | null
  images: string[]
  main_image_url: string | null
  average_rating: number
  review_count: number
  is_pet_friendly: boolean
  website: string | null
  latitude: number
  longitude: number
}

export default function CityPlacesList({ places }: { places: Place[] }) {
  const categories = [...new Set(places.map(p => p.category))].sort()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = activeCategory ? places.filter(p => p.category === activeCategory) : places

  return (
    <div>
      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !activeCategory ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            All ({places.length})
          </button>
          {categories.map(cat => {
            const count = places.filter(p => p.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {CATEGORY_LABELS[cat] || cat} ({count})
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Places List */}
        <div className="flex-1 space-y-4 min-w-0">
          {filtered.map(place => {
            const thumbnail = place.main_image_url || place.images?.[0]
            return (
              <Link
                key={place.id}
                href={`/place/${place.slug || place.id}`}
                prefetch={false}
                className="group flex gap-4 p-4 bg-surface-container-lowest rounded-xl editorial-shadow ghost-border hover:border-primary/20 transition-all hover:-translate-y-0.5"
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={place.name}
                    className="w-20 h-20 md:w-28 md:h-20 rounded-lg object-cover flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 md:w-28 md:h-20 rounded-lg bg-surface-container-low flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-outline" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors line-clamp-1">
                      {place.name}
                    </h2>
                    {place.website && (
                      <ExternalLink className="h-3.5 w-3.5 text-outline flex-shrink-0 mt-0.5" />
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5 mt-1">
                    <span className="bg-secondary-container text-on-surface px-1.5 py-0.5 rounded text-xs capitalize font-medium">
                      {CATEGORY_LABELS[place.category] || place.category}
                    </span>
                    {place.is_pet_friendly && (
                      <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-xs flex items-center gap-0.5">
                        <PawPrint className="h-3 w-3" />
                        Pets
                      </span>
                    )}
                    {place.average_rating > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-on-surface-variant">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {place.average_rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">{place.address}</p>
                </div>
              </Link>
            )
          })}

          {filtered.length === 0 && (
            <p className="text-center text-on-surface-variant py-8">No places found in this category.</p>
          )}
        </div>

        {/* Sticky Map */}
        <div className="lg:w-[400px] flex-shrink-0">
          <div className="lg:sticky lg:top-24">
            <CityMap
              places={filtered.map(p => ({ id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude, category: p.category }))}
              className="h-[300px] lg:h-[calc(100vh-8rem)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
