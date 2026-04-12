'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Star, PawPrint, ExternalLink, Phone, Clock, Globe, Navigation } from 'lucide-react'
import CityMap from './CityMap'

const CATEGORY_LABELS: Record<string, string> = {
  eat: 'Eat',
  hotel: 'Stay',
  store: 'Store',
  event: 'Event',
  organisation: 'Animal Sanctuary',
  other: 'Other',
}

const SUBCATEGORY_LABELS: Record<string, Record<string, string>> = {
  eat: { restaurant: 'Restaurant', cafe: 'Cafe', fast_food: 'Fast Food', bar: 'Bar/Pub', bakery: 'Bakery', ice_cream: 'Ice Cream' },
  store: { grocery: 'Grocery', bakery: 'Bakery', health_food: 'Health Food', specialty: 'Specialty', other_shop: 'Other' },
  hotel: { hotel: 'Hotel', hostel: 'Hostel', bnb: 'B&B', retreat: 'Retreat', other_stay: 'Other' },
}

const VEGAN_LABELS: Record<string, string> = {
  fully_vegan: '100% Vegan',
  vegan_friendly: 'Vegan-Friendly',
}

interface Place {
  id: string
  slug: string | null
  name: string
  category: string
  subcategory: string | null
  address: string
  description: string | null
  images: string[]
  main_image_url: string | null
  average_rating: number
  review_count: number
  is_pet_friendly: boolean
  website: string | null
  phone: string | null
  opening_hours: Record<string, string> | null
  google_place_id: string | null
  latitude: number
  longitude: number
  vegan_level: string | null
  cuisine_types: string[] | null
}

export default function CityPlacesList({ places }: { places: Place[] }) {
  const categories = [...new Set(places.map(p => p.category))].sort()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
  const [veganOnly, setVeganOnly] = useState(false)
  const [petOnly, setPetOnly] = useState(false)

  // Get available subcategories for active category
  const subcategories = activeCategory
    ? [...new Set(places.filter(p => p.category === activeCategory).map(p => p.subcategory).filter(Boolean))]
    : []

  const filtered = places.filter(p => {
    if (activeCategory && p.category !== activeCategory) return false
    if (activeSubcategory && p.subcategory !== activeSubcategory) return false
    if (veganOnly && p.vegan_level !== 'fully_vegan') return false
    if (petOnly && !p.is_pet_friendly) return false
    return true
  })

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Category pills */}
        <button onClick={() => { setActiveCategory(null); setActiveSubcategory(null); }}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!activeCategory ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
          All ({places.length})
        </button>
        {categories.map(cat => {
          const count = places.filter(p => p.category === cat).length
          return (
            <button key={cat} onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setActiveSubcategory(null); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
              {CATEGORY_LABELS[cat] || cat} ({count})
            </button>
          )
        })}

        {/* Subcategory pills — show when a category is selected */}
        {activeCategory && subcategories.length > 1 && (
          <>
            <div className="w-px h-8 bg-outline-variant/30 self-center" />
            {subcategories.map(sub => {
              if (!sub) return null
              const count = places.filter(p => p.category === activeCategory && p.subcategory === sub).length
              const label = SUBCATEGORY_LABELS[activeCategory]?.[sub] || sub
              return (
                <button key={sub} onClick={() => setActiveSubcategory(activeSubcategory === sub ? null : sub)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${activeSubcategory === sub ? 'bg-primary/80 text-on-primary-btn' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
                  {label} ({count})
                </button>
              )
            })}
          </>
        )}

        {/* Divider */}
        <div className="w-px h-8 bg-outline-variant/30 self-center" />

        {/* Vegan-only toggle */}
        <button onClick={() => setVeganOnly(!veganOnly)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${veganOnly ? 'bg-green-600 text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
          🌿 100% Vegan
        </button>

        {/* Pet-friendly toggle */}
        <button onClick={() => setPetOnly(!petOnly)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${petOnly ? 'bg-orange-500 text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
          🐾 Pet-Friendly
        </button>

        {/* Result count */}
        <span className="self-center text-xs text-on-surface-variant">{filtered.length} results</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Places List */}
        <div className="flex-1 space-y-4 min-w-0">
          {filtered.map(place => {
            const thumbnail = place.main_image_url || place.images?.[0]
            const googleMapsUrl = place.google_place_id
              ? `https://www.google.com/maps/place/?q=place_id:${place.google_place_id}`
              : `https://www.google.com/maps/search/${encodeURIComponent(place.name + ' ' + place.address)}`
            const appleMapsUrl = `http://maps.apple.com/?q=${encodeURIComponent(place.name)}&address=${encodeURIComponent(place.address)}&ll=${place.latitude},${place.longitude}`
            const cuisines = (place.cuisine_types || []).filter(c => c && c !== 'vegan' && c !== 'regional').slice(0, 3)

            return (
              <div key={place.id} className="bg-surface-container-lowest rounded-xl editorial-shadow ghost-border overflow-hidden hover:border-primary/20 transition-all">
                <Link
                  href={`/place/${place.slug || place.id}`}
                  prefetch={false}
                  className="group flex gap-4 p-4"
                >
                  <div className="relative flex-shrink-0">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={place.name}
                        className="w-24 h-24 md:w-32 md:h-24 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-24 h-24 md:w-32 md:h-24 rounded-lg bg-surface-container-low flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-outline" />
                      </div>
                    )}
                    {/* Overlay badges */}
                    <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                      {place.vegan_level === 'fully_vegan' && (
                        <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-green-600 text-white leading-none">VEGAN</span>
                      )}
                      {place.is_pet_friendly && (
                        <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-orange-500 text-white leading-none">🐾</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors line-clamp-1">
                      {place.name}
                    </h2>

                    {/* Badges */}
                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                      <span className="bg-secondary-container text-on-surface px-1.5 py-0.5 rounded text-xs capitalize font-medium">
                        {CATEGORY_LABELS[place.category] || place.category}
                      </span>
                      {place.vegan_level && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${place.vegan_level === 'fully_vegan' ? 'bg-green-100 text-green-800' : 'bg-lime-100 text-lime-800'}`}>
                          {VEGAN_LABELS[place.vegan_level] || place.vegan_level}
                        </span>
                      )}
                      {place.is_pet_friendly && (
                        <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-xs flex items-center gap-0.5">
                          <PawPrint className="h-3 w-3" /> Pets
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    {place.average_rating > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < Math.round(place.average_rating) ? 'text-yellow-500 fill-yellow-500' : 'text-outline'}`} />
                        ))}
                        <span className="text-xs text-on-surface-variant ml-0.5">
                          {place.average_rating.toFixed(1)} ({place.review_count} {place.review_count === 1 ? 'review' : 'reviews'})
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {place.description && (
                      <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2">{place.description}</p>
                    )}

                    {/* Cuisine tags */}
                    {cuisines.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {cuisines.map(c => (
                          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface-variant capitalize">
                            {c.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Contact & Maps bar */}
                <div className="flex items-center gap-3 px-4 pb-3 pt-0 text-xs">
                  <span className="flex items-center gap-1 text-on-surface-variant">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-1">{place.address}</span>
                  </span>
                  <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                    {place.phone && (
                      <a href={`tel:${place.phone}`} onClick={e => e.stopPropagation()} className="text-primary hover:text-primary/80" title={place.phone}>
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {place.website && (
                      <a href={place.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:text-primary/80" title="Website">
                        <Globe className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:text-primary/80" title="Google Maps">
                      <Navigation className="h-3.5 w-3.5" />
                    </a>
                    <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:text-primary/80" title="Apple Maps">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
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
