'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
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
  main_image_url: string | null
}

export interface SearchResults {
  cities: CityResult[]
  countries: CountryResult[]
  places: PlaceResult[]
  loading: boolean
  error: string | null
}

export function useSearch(query: string, minLength: number = 2) {
  const { isFullyVeganOnly } = useVeganFilter()
  const [results, setResults] = useState<SearchResults>({
    cities: [],
    countries: [],
    places: [],
    loading: false,
    error: null
  })
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(timer)
  }, [query])

  const searchCities = useCallback(async (term: string): Promise<CityResult[]> => {
    try {
      const { data } = await supabase
        .from('directory_cities')
        .select('city, country, city_slug, place_count, fully_vegan_count')
        .ilike('city', `%${term}%`)
        .order('place_count', { ascending: false })
        .limit(6)

      return (data || []).map((c: any) => ({
        city: c.city,
        country: c.country,
        slug: c.city_slug,
        placeCount: isFullyVeganOnly ? (c.fully_vegan_count || 0) : c.place_count,
      }))
    } catch {
      return []
    }
  }, [isFullyVeganOnly])

  const searchCountries = useCallback(async (term: string): Promise<CountryResult[]> => {
    try {
      const { data } = await supabase
        .from('directory_countries')
        .select('country, country_slug, place_count, city_count')
        .ilike('country', `%${term}%`)
        .order('place_count', { ascending: false })
        .limit(3)

      return (data || []).map((c: any) => ({
        country: c.country,
        slug: c.country_slug,
        placeCount: c.place_count,
        cityCount: c.city_count,
      }))
    } catch {
      return []
    }
  }, [])

  const searchPlaces = useCallback(async (term: string): Promise<PlaceResult[]> => {
    try {
      let q = supabase
        .from('places')
        .select('id, name, slug, category, subcategory, vegan_level, city, country, main_image_url')
        .ilike('name', `%${term}%`)
      if (isFullyVeganOnly) q = q.eq('vegan_level', 'fully_vegan')
      const { data } = await q
        .order('average_rating', { ascending: false, nullsFirst: false })
        .limit(6)

      return (data || []) as PlaceResult[]
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery || debouncedQuery.length < minLength) {
        setResults({ cities: [], countries: [], places: [], loading: false, error: null })
        return
      }

      setResults(prev => ({ ...prev, loading: true, error: null }))

      try {
        const [cities, countries, places] = await Promise.all([
          searchCities(debouncedQuery),
          searchCountries(debouncedQuery),
          searchPlaces(debouncedQuery),
        ])

        setResults({ cities, countries, places, loading: false, error: null })
      } catch (error) {
        setResults({ cities: [], countries: [], places: [], loading: false, error: 'Search failed' })
      }
    }

    performSearch()
  }, [debouncedQuery, minLength, searchCities, searchCountries, searchPlaces])

  return results
}
