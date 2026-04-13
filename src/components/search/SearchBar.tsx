'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, MapPin, Loader2, Globe, Plus, Clock, ChefHat } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import Link from 'next/link'

const CATEGORY_EMOJI: Record<string, string> = {
  eat: '🌿', hotel: '🛏️', store: '🛍️', organisation: '🐾', event: '🎉', other: '📍',
}
const SUBCATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant', cafe: 'Cafe', fast_food: 'Fast Food', bar: 'Bar/Pub',
  bakery: 'Bakery', ice_cream: 'Ice Cream', grocery: 'Grocery', health_food: 'Health Food',
  hotel: 'Hotel', hostel: 'Hostel', bnb: 'B&B', animal_sanctuary: 'Animal Sanctuary',
}

const RECENT_SEARCHES_KEY = 'plantspack_recent_searches'
const MAX_RECENT = 5

interface RecentSearch {
  label: string
  href: string
  type: 'city' | 'country' | 'place' | 'recipe'
}

function getRecentSearches(): RecentSearch[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
  } catch { return [] }
}

function saveRecentSearch(item: RecentSearch) {
  if (typeof window === 'undefined') return
  const recent = getRecentSearches().filter(r => r.href !== item.href)
  recent.unshift(item)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

interface SearchBarProps {
  className?: string
}

export default function SearchBar({ className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { cities, countries, places, recipes, loading } = useSearch(query)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // Show dropdown when focused with empty query (recent searches) or when typing
  const handleFocus = () => {
    setRecentSearches(getRecentSearches())
    setIsOpen(true)
  }

  useEffect(() => {
    if (query.length >= 2) setIsOpen(true)
  }, [query])

  const clearSearch = () => { setQuery(''); setIsOpen(false); inputRef.current?.focus() }

  const handleResultClick = useCallback((item: RecentSearch) => {
    saveRecentSearch(item)
    setIsOpen(false)
    setQuery('')
  }, [])

  const hasResults = cities.length > 0 || countries.length > 0 || places.length > 0 || recipes.length > 0
  const showNoResults = query.length >= 2 && !loading && !hasResults
  const showRecent = query.length < 2 && recentSearches.length > 0

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      <div className="w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-outline" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Search cities, places, or recipes..."
          className="w-full pl-10 pr-10 py-2 bg-surface-container-low border-0 ghost-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder-outline text-sm"
        />
        {query && (
          <button onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="sm:min-w-[420px] absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest glass-float shadow-ambient rounded-lg z-50 max-h-[28rem] overflow-y-auto">
          {/* Recent searches (when query is empty) */}
          {showRecent && (
            <div>
              <div className="px-3 py-2 bg-surface-container-low/50">
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Recent</span>
              </div>
              {recentSearches.map((r, i) => (
                <Link key={i} href={r.href} onClick={() => handleResultClick(r)}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-low transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center">
                    <Clock className="h-4 w-4 text-on-surface-variant" />
                  </div>
                  <p className="text-sm text-on-surface truncate">{r.label}</p>
                </Link>
              ))}
            </div>
          )}

          {loading && query.length >= 2 && (
            <div className="p-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1 text-primary" />
              <p className="text-xs text-outline">Searching...</p>
            </div>
          )}

          {showNoResults && (
            <div className="p-4 text-center">
              <p className="text-sm text-outline mb-2">No results for &quot;{query}&quot;</p>
              <Link href="/map" onClick={() => { setIsOpen(false); setQuery('') }}
                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                <Plus className="h-3 w-3" /> Add this place to PlantsPack
              </Link>
            </div>
          )}

          {!loading && hasResults && (
            <div className="divide-y divide-outline-variant/10">
              {/* Cities & Countries */}
              {(cities.length > 0 || countries.length > 0) && (
                <div>
                  <div className="px-3 py-2 bg-surface-container-low/50">
                    <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Cities & Countries</span>
                  </div>
                  {countries.map(c => (
                    <Link key={`country-${c.slug}`} href={`/vegan-places/${c.slug}`}
                      onClick={() => handleResultClick({ label: c.country, href: `/vegan-places/${c.slug}`, type: 'country' })}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-low transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface">{c.country}</p>
                        <p className="text-[11px] text-on-surface-variant">{c.placeCount} places · {c.cityCount} cities</p>
                      </div>
                    </Link>
                  ))}
                  {cities.map(c => {
                    const href = `/vegan-places/${c.country.toLowerCase().replace(/\s+/g, '-')}/${c.slug}`
                    return (
                      <Link key={`city-${c.slug}-${c.country}`} href={href}
                        onClick={() => handleResultClick({ label: `${c.city}, ${c.country}`, href, type: 'city' })}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-low transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-sm">
                          🏙️
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-surface">{c.city}</p>
                          <p className="text-[11px] text-on-surface-variant">{c.country} · {c.placeCount} places</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Places */}
              {places.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-surface-container-low/50">
                    <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Places</span>
                  </div>
                  {places.map(place => {
                    const href = `/place/${place.slug || place.id}`
                    return (
                      <Link key={place.id} href={href}
                        onClick={() => handleResultClick({ label: place.name, href, type: 'place' })}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-low transition-colors">
                        {place.main_image_url ? (
                          <img src={place.main_image_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-sm flex-shrink-0">
                            {CATEGORY_EMOJI[place.category] || '📍'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">{place.name}</p>
                          <p className="text-[11px] text-on-surface-variant truncate">
                            {SUBCATEGORY_LABELS[place.subcategory || ''] || place.category}
                            {place.city ? ` · ${place.city}` : ''}
                          </p>
                        </div>
                        {place.vegan_level === 'fully_vegan' && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">
                            100% Vegan
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Recipes */}
              {recipes.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-surface-container-low/50">
                    <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Recipes</span>
                  </div>
                  {recipes.map(recipe => {
                    const href = `/recipe/${recipe.slug || recipe.id}`
                    return (
                      <Link key={recipe.id} href={href}
                        onClick={() => handleResultClick({ label: recipe.title, href, type: 'recipe' })}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-low transition-colors">
                        {recipe.image_url ? (
                          <img src={recipe.image_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <ChefHat className="h-4 w-4 text-orange-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">{recipe.title}</p>
                          <p className="text-[11px] text-on-surface-variant truncate">
                            {[recipe.cuisine, recipe.meal_type].filter(Boolean).join(' · ') || 'Recipe'}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
