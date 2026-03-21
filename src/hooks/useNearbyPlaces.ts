'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { supabase, Tables } from '@/lib/supabase'

type Place = Tables<'places'> & {
  users: Tables<'users'>
  favorite_places: { id: string; user_id: string }[]
}

export type PlaceWithDistance = Place & { distance: number }

interface UseNearbyPlacesOptions {
  lat: number | null
  lng: number | null
  radius_km: number
  category: string
  limit?: number
}

// Calculate distance between two points in kilometers (Haversine)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function useNearbyPlaces({ lat, lng, radius_km, category, limit = 20 }: UseNearbyPlacesOptions) {
  const [allPlaces, setAllPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(limit)

  const fetchPlaces = useCallback(async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('places')
        .select(`
          *,
          users (
            id,
            username,
            first_name,
            last_name
          ),
          favorite_places (
            id,
            user_id
          )
        `)
        .order('created_at', { ascending: false })

      if (category !== 'all') {
        query = query.eq('category', category)
      }

      const { data: placesData, error } = await query

      if (error) throw error
      setAllPlaces(placesData || [])
    } catch (error) {
      console.error('Error fetching places:', error)
    } finally {
      setLoading(false)
    }
  }, [category])

  // Compute places sorted by distance from center, filtered by radius
  const placesWithDistance: PlaceWithDistance[] = useMemo(() => {
    if (lat == null || lng == null) return []

    const mapped = allPlaces.map(place => ({
      ...place,
      distance: calculateDistance(lat, lng, place.latitude, place.longitude)
    }))

    return mapped
      .filter(p => p.distance <= radius_km)
      .sort((a, b) => a.distance - b.distance)
  }, [allPlaces, lat, lng, radius_km])

  // Paginated slice
  const places = useMemo(() => {
    return placesWithDistance.slice(0, visibleCount)
  }, [placesWithDistance, visibleCount])

  const hasMore = visibleCount < placesWithDistance.length

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + limit)
  }, [limit])

  const refetch = useCallback(() => {
    setVisibleCount(limit)
    fetchPlaces()
  }, [fetchPlaces, limit])

  // Add a single place to local state without refetching
  const addPlaceLocally = useCallback((place: Place) => {
    setAllPlaces(prev => [place, ...prev])
  }, [])

  // Reset visible count when radius/category changes
  useEffect(() => {
    setVisibleCount(limit)
  }, [radius_km, category, limit])

  return {
    places,
    allFiltered: placesWithDistance,
    loading,
    hasMore,
    loadMore,
    refetch,
    fetchPlaces,
    addPlaceLocally,
  }
}
