'use client'

import { useState, useEffect } from 'react'
import { useVeganFilter } from '@/lib/vegan-filter-context'

export interface CityResult {
  city: string
  country: string
  slug: string
  placeCount: number
  grade?: string
  score?: number
}

export interface CountryResult {
  country: string
  slug: string
  placeCount: number
  cityCount: number
}

export interface PlaceResult {
  id: string
  name: string
  slug: string | null
  category: string
  subcategory: string | null
  vegan_level: string | null
  city: string | null
  country: string | null
  address: string | null
  main_image_url: string | null
  rank?: number
  distance_km?: number | null
}

export interface RecipeResult {
  id: string
  title: string
  slug: string | null
  image_url: string | null
  meal_type: string | null
  cuisine: string | null
}

export interface SearchResults {
  cities: CityResult[]
  countries: CountryResult[]
  places: PlaceResult[]
  recipes: RecipeResult[]
  loading: boolean
  error: string | null
}

// useSearch — single round-trip to /api/search instead of the previous
// 4-parallel-browser-queries-against-Supabase pattern. The API endpoint
// fans out to ranked Postgres FTS+trigram RPCs server-side.
export function useSearch(query: string, minLength: number = 2) {
  const { isFullyVeganOnly } = useVeganFilter()
  const [results, setResults] = useState<SearchResults>({
    cities: [],
    countries: [],
    places: [],
    recipes: [],
    loading: false,
    error: null,
  })
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery || debouncedQuery.length < minLength) {
        setResults({ cities: [], countries: [], places: [], recipes: [], loading: false, error: null })
        return
      }
      setResults((prev) => ({ ...prev, loading: true, error: null }))

      const params = new URLSearchParams({ q: debouncedQuery })
      if (isFullyVeganOnly) params.set('vl', 'fully_vegan')

      try {
        const res = await fetch(`/api/search?${params.toString()}`)
        if (!res.ok) throw new Error('search failed')
        const data = await res.json()

        const cities: CityResult[] = (data.cities || []).map((c: any) => ({
          city: c.city,
          country: c.country,
          slug: c.city_slug,
          placeCount: c.place_count ?? 0,
        }))

        // Countries are intentionally not surfaced from the new search
        // RPC — they would have stale aggregate counts that confuse the
        // dropdown. Browsing to a country happens via clicking a city.
        const countries: CountryResult[] = []

        const places: PlaceResult[] = (data.places || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          category: p.category,
          subcategory: null,
          vegan_level: p.vegan_level,
          city: p.city,
          country: p.country,
          address: null,
          main_image_url: p.main_image_url,
          rank: p.rank,
          distance_km: p.distance_km,
        }))

        const recipes: RecipeResult[] = (data.recipes || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          image_url: r.image_url,
          meal_type: null,
          cuisine: null,
        }))

        setResults({ cities, countries, places, recipes, loading: false, error: null })
      } catch {
        setResults({ cities: [], countries: [], places: [], recipes: [], loading: false, error: 'Search failed' })
      }
    }
    performSearch()
  }, [debouncedQuery, minLength, isFullyVeganOnly])

  return results
}

// Fire-and-forget click logger. Always returns immediately so it cannot
// delay navigation; failures are silent — this is analytics, not data.
export function logSearchClick(args: {
  q: string
  result_count: number
  clicked_slug?: string | null
  clicked_kind?: 'place' | 'city' | 'recipe' | null
}) {
  try {
    let sessionId = ''
    if (typeof window !== 'undefined') {
      sessionId = window.localStorage.getItem('plantspack_session_id') || ''
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        window.localStorage.setItem('plantspack_session_id', sessionId)
      }
    }
    fetch('/api/search/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...args, session_id: sessionId }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // intentionally swallow — analytics must not break UX
  }
}
