'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase, Tables } from '@/lib/supabase'

type Place = Tables<'places'> & {
  users: Tables<'users'>
  favorite_places: { id: string; user_id: string }[]
}

export type PlaceWithDistance = Place & { distance: number }

interface UseNearbyPlacesOptions {
  lat: number | null
  lng: number | null
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

export function useNearbyPlaces({ lat, lng, category, limit = 20 }: UseNearbyPlacesOptions) {
  const [places, setPlaces] = useState<PlaceWithDistance[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  const fetchPlaces = useCallback(async (loadMore = false) => {
    if (lat == null || lng == null) return

    try {
      if (!loadMore) {
        setLoading(true)
        setOffset(0)
      }

      const currentOffset = loadMore ? offset : 0

      // Use PostGIS RPC for server-side proximity sorting + pagination
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('nearby_places', {
          lat,
          lng,
          lim: limit,
          off_set: currentOffset,
          cat: category,
        })

      if (rpcError) throw rpcError

      const rawPlaces = rpcData || []

      // Fetch related data (users + favorites) for these places
      let enrichedPlaces: PlaceWithDistance[] = []
      if (rawPlaces.length > 0) {
        const placeIds = rawPlaces.map((p: any) => p.id)

        const { data: fullPlaces } = await supabase
          .from('places')
          .select(`
            *,
            users (id, username, first_name, last_name),
            favorite_places (id, user_id)
          `)
          .in('id', placeIds)

        // Preserve RPC order (sorted by distance) and add distance
        const fullMap = new Map((fullPlaces || []).map(p => [p.id, p]))
        enrichedPlaces = rawPlaces
          .map((rpcPlace: any) => {
            const full = fullMap.get(rpcPlace.id)
            if (!full) return null
            return {
              ...full,
              distance: calculateDistance(lat, lng, full.latitude, full.longitude),
            }
          })
          .filter(Boolean) as PlaceWithDistance[]
      }

      if (loadMore) {
        setPlaces(prev => [...prev, ...enrichedPlaces])
      } else {
        setPlaces(enrichedPlaces)
      }

      setHasMore(rawPlaces.length === limit)
      setOffset(currentOffset + rawPlaces.length)
    } catch (error) {
      console.error('Error fetching nearby places:', error)
      if (!loadMore) setPlaces([])
    } finally {
      setLoading(false)
    }
  }, [lat, lng, category, limit, offset])

  // Initial fetch + refetch when center or category changes
  useEffect(() => {
    if (lat != null && lng != null) {
      fetchPlaces(false)
    }
  }, [lat, lng, category]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    fetchPlaces(true)
  }, [fetchPlaces])

  const refetch = useCallback(() => {
    fetchPlaces(false)
  }, [fetchPlaces])

  // Add a single place to local state without refetching
  const addPlaceLocally = useCallback((place: Place) => {
    if (lat == null || lng == null) return
    const placeWithDist: PlaceWithDistance = {
      ...place,
      distance: calculateDistance(lat, lng, place.latitude, place.longitude),
    }
    setPlaces(prev => {
      const updated = [placeWithDist, ...prev]
      updated.sort((a, b) => a.distance - b.distance)
      return updated
    })
  }, [lat, lng])

  return {
    places,
    allFiltered: places, // For backward compat with MapView markers
    loading,
    hasMore,
    loadMore,
    refetch,
    fetchPlaces: () => fetchPlaces(false),
    addPlaceLocally,
  }
}
