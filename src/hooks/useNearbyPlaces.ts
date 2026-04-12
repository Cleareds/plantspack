'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase, Tables } from '@/lib/supabase'
import { useVeganFilter } from '@/lib/vegan-filter-context'

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
  const { isFullyVeganOnly } = useVeganFilter()
  const [places, setPlaces] = useState<PlaceWithDistance[]>([])       // sidebar (paginated)
  const [mapPlaces, setMapPlaces] = useState<PlaceWithDistance[]>([]) // map (viewport)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const fetchIdRef = useRef(0) // prevent stale responses
  const viewportRef = useRef<{ minLat: number; minLng: number; maxLat: number; maxLng: number } | null>(null)

  const fetchPage = useCallback(async (pageNum: number, currentLat: number, currentLng: number, cat: string) => {
    const fetchId = ++fetchIdRef.current
    setLoading(true)

    try {
      const offset = (pageNum - 1) * limit

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('nearby_places', {
          lat: currentLat,
          lng: currentLng,
          lim: limit,
          off_set: offset,
          cat,
        })

      if (rpcError) throw rpcError
      if (fetchId !== fetchIdRef.current) return // stale

      const rawPlaces = rpcData || []

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

        if (fetchId !== fetchIdRef.current) return // stale

        const fullMap = new Map((fullPlaces || []).map(p => [p.id, p]))
        enrichedPlaces = rawPlaces
          .map((rpcPlace: any) => {
            const full = fullMap.get(rpcPlace.id)
            if (!full) return null
            return {
              ...full,
              distance: calculateDistance(currentLat, currentLng, full.latitude, full.longitude),
            }
          })
          .filter(Boolean) as PlaceWithDistance[]
      }

      setPlaces(enrichedPlaces)
      setHasMore(rawPlaces.length === limit)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching nearby places:', error)
      if (fetchId === fetchIdRef.current) {
        setPlaces([])
        setHasMore(false)
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false)
      }
    }
  }, [limit])

  // Fetch places within map viewport (for map markers)
  // Uses ONLY the RPC result — no enrichment query needed.
  // viewport_places already returns all place columns.
  const lastBoundsKey = useRef('')
  const fetchInFlight = useRef(false)
  const fetchViewportPlaces = useCallback(async (bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }, cat: string) => {
    // Skip if bounds haven't meaningfully changed (rounded to 3 decimals ~100m)
    const key = `${bounds.minLat.toFixed(3)},${bounds.minLng.toFixed(3)},${bounds.maxLat.toFixed(3)},${bounds.maxLng.toFixed(3)},${cat}`
    if (key === lastBoundsKey.current) return
    // Skip if a fetch is already in progress
    if (fetchInFlight.current) return
    lastBoundsKey.current = key
    viewportRef.current = bounds
    fetchInFlight.current = true
    try {
      // Fetch all places in viewport with pagination (Supabase caps at 1000 per query)
      const allPlaces: any[] = []
      let offset = 0
      const batchSize = 1000
      while (true) {
        let query = supabase
          .from('places')
          .select('*')
          .gte('latitude', bounds.minLat)
          .lte('latitude', bounds.maxLat)
          .gte('longitude', bounds.minLng)
          .lte('longitude', bounds.maxLng)
          .order('name')
          .range(offset, offset + batchSize - 1)

        if (cat !== 'all') {
          query = query.eq('category', cat)
        }
        if (isFullyVeganOnly) {
          query = query.eq('vegan_level', 'fully_vegan')
        }

        const { data, error: queryError } = await query
        if (queryError) throw queryError
        if (!data || data.length === 0) break
        allPlaces.push(...data)
        if (data.length < batchSize) break
        offset += batchSize
      }

      const rawPlaces = allPlaces
      if (rawPlaces.length === 0) {
        setMapPlaces([])
        return
      }

      const centerLat = (bounds.minLat + bounds.maxLat) / 2
      const centerLng = (bounds.minLng + bounds.maxLng) / 2

      // RPC returns all needed fields — just add distance and cast
      const enriched = rawPlaces.map((p: any) => ({
        ...p,
        users: { id: p.created_by, username: '', first_name: null, last_name: null },
        favorite_places: [],
        distance: calculateDistance(centerLat, centerLng, p.latitude, p.longitude),
      })) as PlaceWithDistance[]

      setMapPlaces(enriched)
    } catch (error) {
      console.error('Error fetching viewport places:', error)
    } finally {
      fetchInFlight.current = false
    }
  }, [])

  // Fetch count for pagination display
  const fetchCount = useCallback(async (cat: string) => {
    try {
      let query = supabase.from('places').select('id', { count: 'exact', head: true })
      if (cat !== 'all') {
        query = query.eq('category', cat)
      }
      const { count } = await query
      setTotalCount(count || 0)
    } catch {
      // ignore
    }
  }, [])

  // Fetch page 1 when location, category, or vegan filter changes
  useEffect(() => {
    if (lat != null && lng != null) {
      fetchPage(1, lat, lng, category)
      fetchCount(category)
    }
  }, [lat, lng, category, isFullyVeganOnly, fetchPage, fetchCount])

  // Re-fetch viewport places when category or vegan filter changes
  useEffect(() => {
    if (viewportRef.current) {
      // Reset bounds key to force refetch
      lastBoundsKey.current = ''
      fetchViewportPlaces(viewportRef.current, category)
    }
  }, [category, isFullyVeganOnly, fetchViewportPlaces])

  const goToPage = useCallback((pageNum: number) => {
    if (lat != null && lng != null) {
      fetchPage(pageNum, lat, lng, category)
    }
  }, [lat, lng, category, fetchPage])

  const refetch = useCallback(() => {
    if (lat != null && lng != null) {
      fetchPage(page, lat, lng, category)
      fetchCount(category)
      if (viewportRef.current) {
        fetchViewportPlaces(viewportRef.current, category)
      }
    }
  }, [lat, lng, category, page, fetchPage, fetchCount, fetchViewportPlaces])

  const addPlaceLocally = useCallback((place: Place) => {
    if (lat == null || lng == null) return
    const placeWithDist: PlaceWithDistance = {
      ...place,
      distance: calculateDistance(lat, lng, place.latitude, place.longitude),
    }
    setPlaces(prev => {
      const updated = [placeWithDist, ...prev]
      updated.sort((a, b) => a.distance - b.distance)
      return updated.slice(0, limit)
    })
    setMapPlaces(prev => [...prev, placeWithDist])
    setTotalCount(prev => prev + 1)
  }, [lat, lng, limit])

  const totalPages = Math.max(1, Math.ceil(totalCount / limit))

  return {
    places,
    mapPlaces,
    allFiltered: mapPlaces.length > 0 ? mapPlaces : places,
    loading,
    hasMore,
    page,
    totalPages,
    totalCount,
    goToPage,
    refetch,
    fetchPlaces: refetch,
    fetchViewportPlaces,
    addPlaceLocally,
    loadMore: () => goToPage(page + 1), // backward compat
  }
}
