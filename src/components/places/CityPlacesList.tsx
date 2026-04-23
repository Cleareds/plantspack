'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { MapPin, PawPrint, ExternalLink, Phone, Clock, Globe, Navigation, ChevronLeft, ChevronRight } from 'lucide-react'
import CityMap from './CityMap'
import RatingBadge from './RatingBadge'
import PlaceImage from './PlaceImage'
import AddPlaceButton from './AddPlaceButton'
import { useVeganFilter } from '@/lib/vegan-filter-context'
import { Plus } from 'lucide-react'

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

export default function CityPlacesList({ places, cityName, countryName }: { places: Place[]; cityName?: string; countryName?: string }) {
  const { isFullyVeganOnly } = useVeganFilter()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Read filters from URL params
  const activeCategory = searchParams?.get('category') || null
  const activeSubcategory = searchParams?.get('sub') || null
  const petOnly = searchParams?.get('pet') === '1'
  const sortBy = (searchParams?.get('sort') as 'name' | 'rating' | 'vegan') || 'name'

  // Update URL params — alphabetical order for consistency
  const setFilter = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    // Reset to page 1 when filters change (unless explicitly setting page)
    if (!('page' in updates)) params.delete('page')
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key)
      else params.set(key, value)
    }
    const sorted = new URLSearchParams([...params.entries()].sort((a, b) => a[0].localeCompare(b[0])))
    const qs = sorted.toString()
    router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false })
  }, [searchParams, router, pathname])

  // Pre-filter by global vegan toggle
  const basePlaces = isFullyVeganOnly ? places.filter(p => p.vegan_level === 'fully_vegan') : places
  const categories = [...new Set(basePlaces.map(p => p.category))].sort()

  // Get available subcategories for active category
  const subcategories = activeCategory
    ? [...new Set(basePlaces.filter(p => p.category === activeCategory).map(p => p.subcategory).filter(Boolean))]
    : []

  // Safety: reset stale filters when underlying data changes
  const validCategory = activeCategory && categories.includes(activeCategory) ? activeCategory : null
  const validSubcategory = activeSubcategory && subcategories.includes(activeSubcategory) ? activeSubcategory : null

  const PAGE_SIZE = 30
  const currentPage = parseInt(searchParams?.get('page') || '1') || 1

  const filtered = basePlaces.filter(p => {
    if (validCategory && p.category !== validCategory) return false
    if (validSubcategory && p.subcategory !== validSubcategory) return false
    if (petOnly && !p.is_pet_friendly) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'rating') return (b.average_rating || 0) - (a.average_rating || 0)
    if (sortBy === 'vegan') {
      if (a.vegan_level === 'fully_vegan' && b.vegan_level !== 'fully_vegan') return -1
      if (b.vegan_level === 'fully_vegan' && a.vegan_level !== 'fully_vegan') return 1
      return (b.average_rating || 0) - (a.average_rating || 0)
    }
    return a.name.localeCompare(b.name)
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const needsPagination = filtered.length > PAGE_SIZE

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Category pills */}
        <button onClick={() => setFilter({ category: null, sub: null })}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!validCategory ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
          All ({basePlaces.length})
        </button>
        {categories.map(cat => {
          const count = basePlaces.filter(p => p.category === cat).length
          return (
            <button key={cat} onClick={() => setFilter({ category: validCategory === cat ? null : cat, sub: null })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${validCategory === cat ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
              {CATEGORY_LABELS[cat] || cat} ({count})
            </button>
          )
        })}

        {/* Subcategory pills — show when a category is selected */}
        {validCategory && subcategories.length > 1 && (
          <>
            <div className="w-px h-8 bg-outline-variant/30 self-center" />
            {subcategories.map(sub => {
              if (!sub) return null
              const count = basePlaces.filter(p => p.category === validCategory && p.subcategory === sub).length
              const label = (validCategory && SUBCATEGORY_LABELS[validCategory]?.[sub]) || sub
              return (
                <button key={sub} onClick={() => setFilter({ sub: validSubcategory === sub ? null : sub })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${validSubcategory === sub ? 'bg-primary/80 text-on-primary-btn' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
                  {label} ({count})
                </button>
              )
            })}
          </>
        )}

        {/* Divider */}
        <div className="w-px h-8 bg-outline-variant/30 self-center" />

        {/* Pet-friendly toggle */}
        <button onClick={() => setFilter({ pet: petOnly ? null : '1' })}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${petOnly ? 'bg-orange-500 text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
          🐾 Pet-Friendly
        </button>

        {/* Sort */}
        <div className="w-px h-8 bg-outline-variant/30 self-center" />
        {(['name', 'rating', 'vegan'] as const).map(mode => (
          <button key={mode} onClick={() => setFilter({ sort: mode === 'name' ? null : mode })}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              sortBy === mode ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'
            }`}>
            {mode === 'name' ? 'A-Z' : mode === 'rating' ? '⭐ Rating' : '🌿 Vegan first'}
          </button>
        ))}

        {/* Result count */}
        <span className="self-center text-xs text-on-surface-variant">
          {needsPagination ? `${(currentPage-1)*PAGE_SIZE+1}–${Math.min(currentPage*PAGE_SIZE, filtered.length)} of ` : ''}{filtered.length} results
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Places List */}
        <div className="flex-1 space-y-4 min-w-0">
          {paginated.map(place => {
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
                    <PlaceImage
                      src={thumbnail}
                      alt={place.name}
                      category={place.category}
                      className="w-24 h-24 md:w-32 md:h-24 rounded-lg object-cover"
                    />
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
                    <RatingBadge
                      rating={place.average_rating}
                      reviewCount={place.review_count}
                      size="xs"
                      className="mt-1.5"
                    />

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

          {/* Bottom "Add a place" card — only on the last page so scrolling
              to the end of the list surfaces the add-CTA where the user
              already is (no scroll-back required). Skipped when we don't
              have city/country, and on filtered views to avoid a confusing
              "Add a place in Berlin" offer while inside a category filter. */}
          {cityName && countryName && filtered.length > 0 && currentPage >= totalPages && !validCategory && !validSubcategory && !petOnly && (
            <div className="bg-primary/5 border border-dashed border-primary/30 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-medium text-on-surface">Not finding a place?</p>
                <p className="text-sm text-on-surface-variant">
                  Help the vegan community in {cityName}{' '}grow — add a place we&apos;re missing.
                </p>
              </div>
              <AddPlaceButton
                cityName={cityName}
                countryName={countryName}
                className="flex-shrink-0 inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary-btn px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add a place in {cityName}
              </AddPlaceButton>
            </div>
          )}

          {/* Pagination */}
          {needsPagination && (
            <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <p className="text-xs text-on-surface-variant">
                {(currentPage-1)*PAGE_SIZE+1}–{Math.min(currentPage*PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setFilter({ page: String(currentPage - 1) }); window.scrollTo(0, 0) }}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium ghost-border hover:bg-surface-container-low disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 inline" /> Previous
                </button>
                <span className="text-xs text-on-surface-variant">{currentPage}/{totalPages}</span>
                <button
                  onClick={() => { setFilter({ page: String(currentPage + 1) }); window.scrollTo(0, 0) }}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium ghost-border hover:bg-surface-container-low disabled:opacity-30 transition-colors"
                >
                  Next <ChevronRight className="h-4 w-4 inline" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Map */}
        <div className="lg:w-[400px] flex-shrink-0">
          <div className="lg:sticky lg:top-24">
            <CityMap
              places={filtered.map(p => ({ id: p.id, name: p.name, slug: p.slug || undefined, latitude: p.latitude, longitude: p.longitude, category: p.category }))}
              className="h-[300px] lg:h-[calc(100vh-8rem)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
