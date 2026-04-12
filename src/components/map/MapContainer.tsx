'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase, Tables } from '@/lib/supabase'
import { Plus, Search, Menu, CheckCircle, X } from 'lucide-react'
import { geocodingService } from '@/lib/geocoding'
import AddPlaceModal from '../places/AddPlaceModal'
import { usePageState } from '@/hooks/usePageState'
import { useNearbyPlaces } from '@/hooks/useNearbyPlaces'
import MapView from './MapView'
import MapDiscoveryPanel from './MapDiscoveryPanel'
import MapSearchBar from './MapSearchBar'
import MapCategoryPills from './MapCategoryPills'

type Place = Tables<'places'> & {
  users: Tables<'users'>
  favorite_places: { id: string; user_id: string }[]
}

export default function MapContainerComponent() {
  const searchParams = useSearchParams()
  const initialLocation = searchParams.get('location')
  const { user, authReady } = useAuth()

  // Persisted map state
  const [mapState, setMapState] = usePageState({
    key: 'map_state',
    defaultValue: { selectedCategory: 'all', customCenter: null as [number, number] | null },
    userId: user?.id,
    ttl: 60 * 60 * 1000,
  })
  const selectedCategory = mapState.selectedCategory
  const customCenter = mapState.customCenter
  const setSelectedCategory = useCallback((c: string) => setMapState(prev => ({ ...prev, selectedCategory: c })), [setMapState])
  const setCustomCenter = useCallback((c: [number, number] | null) => setMapState(prev => ({ ...prev, customCenter: c })), [setMapState])

  // Filter state
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [veganOnly, setVeganOnly] = useState(false)
  const [petFriendly, setPetFriendly] = useState(false)

  // Location state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)

  // Search center: custom > mapCenter > userLocation
  const searchCenter = customCenter || mapCenter || userLocation

  // Nearby places hook
  const {
    places: sidebarPlaces,
    mapPlaces,
    allFiltered: filteredPlaces,
    loading,
    page,
    totalPages,
    totalCount,
    goToPage,
    refetch,
    fetchViewportPlaces,
    addPlaceLocally,
  } = useNearbyPlaces({
    lat: searchCenter?.[0] ?? null,
    lng: searchCenter?.[1] ?? null,
    category: selectedCategory,
    limit: 20,
  })

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Leaflet icons
  const [leafletIcon, setLeafletIcon] = useState<any>(null)
  const [placeMarkerIcon, setPlaceMarkerIcon] = useState<any>(null)
  const [fullyVeganIcon, setFullyVeganIcon] = useState<any>(null)
  const [veganFriendlyIcon, setVeganFriendlyIcon] = useState<any>(null)
  const mapRef = useRef<any>(null)

  // Initialize Leaflet icons
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        import('@/lib/leaflet-config').then((config) => {
          setPlaceMarkerIcon(config.veganMarkerIcon)
          setFullyVeganIcon(config.fullyVeganDivIcon)
          setVeganFriendlyIcon(config.veganFriendlyDivIcon)
        })
        setLeafletIcon(new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12.5" cy="12.5" r="8" fill="#3B82F6" stroke="white" stroke-width="3"/>
              <circle cx="12.5" cy="12.5" r="3" fill="white"/>
            </svg>
          `),
          iconSize: [25, 25],
          iconAnchor: [12.5, 12.5],
          popupAnchor: [0, -12.5],
        }))
      })
    }
  }, [])


  // Get current location (only if permission already granted, to avoid repeated prompts)
  const getCurrentLocation = useCallback(async (forcePrompt = false) => {
    const defaultLocation: [number, number] = [50.9307, 5.3378]

    if (!navigator.geolocation) {
      setUserLocation(defaultLocation)
      if (!initialLocation) setMapCenter(defaultLocation)
      return
    }

    // Check permission state first to avoid re-prompting
    if (!forcePrompt && navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        if (permission.state === 'prompt') {
          // Don't auto-prompt — use default location, user can click locate button
          setUserLocation(defaultLocation)
          if (!initialLocation) setMapCenter(defaultLocation)
          return
        }
        if (permission.state === 'denied') {
          setUserLocation(defaultLocation)
          if (!initialLocation) setMapCenter(defaultLocation)
          return
        }
      } catch {
        // Permissions API not supported — fall through to geolocation
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: [number, number] = [position.coords.latitude, position.coords.longitude]
        setUserLocation(location)
        if (!initialLocation) setMapCenter(location)
      },
      () => {
        setUserLocation(defaultLocation)
        if (!initialLocation) setMapCenter(defaultLocation)
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    )
  }, [initialLocation])

  // Map search selection
  const handleSearchSelect = useCallback((result: any) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    const newCenter: [number, number] = [lat, lon]
    setMapCenter(newCenter)
    setCustomCenter(newCenter)
    if (mapRef.current) {
      mapRef.current.setView(newCenter, 15)
    }
  }, [setCustomCenter])


  // Debounced viewport fetch — prevents spamming API on rapid pan/zoom
  const viewportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchViewportRef = useRef(fetchViewportPlaces)
  const categoryRef = useRef(selectedCategory)
  fetchViewportRef.current = fetchViewportPlaces
  categoryRef.current = selectedCategory

  const handleMapMove = useCallback(() => {
    if (!mapRef.current) return

    // Only update mapCenter state if it hasn't been set yet (initial load)
    // Subsequent pans use the ref — no React re-render needed
    if (!mapCenter) {
      const center = mapRef.current.getCenter()
      setMapCenter([center.lat, center.lng])
    }

    // Debounce viewport fetch — wait 600ms after last move
    if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current)
    viewportTimerRef.current = setTimeout(() => {
      if (!mapRef.current) return
      const bounds = mapRef.current.getBounds()
      if (bounds) {
        fetchViewportRef.current(
          {
            minLat: bounds.getSouth(),
            minLng: bounds.getWest(),
            maxLat: bounds.getNorth(),
            maxLng: bounds.getEast(),
          },
          categoryRef.current,
        )
      }
    }, 600)
  }, [mapCenter]) // only dep is mapCenter for initial set

  // Map click handler — also triggers viewport refresh
  const handleMapClick = useCallback((latlng: [number, number]) => {
    setCustomCenter(latlng)
    // Trigger viewport fetch since the map didn't actually move
    handleMapMove()
  }, [setCustomCenter, handleMapMove])

  // Toggle favorite
  const toggleFavorite = async (placeId: string) => {
    if (!user) return
    try {
      // Check current favorites from filteredPlaces (allFiltered includes all)
      const place = filteredPlaces.find(p => p.id === placeId)
      const isFavorited = place?.favorite_places.some(fav => fav.user_id === user.id)

      if (isFavorited) {
        const { error } = await supabase
          .from('favorite_places')
          .delete()
          .eq('place_id', placeId)
          .eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('favorite_places')
          .insert({ place_id: placeId, user_id: user.id })
        if (error) throw error
      }
      refetch()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  // Delete place
  const handleDeletePlace = async (placeId: string) => {
    if (!user) return
    const place = filteredPlaces.find(p => p.id === placeId)
    if (!place || place.created_by !== user.id) {
      alert('You can only delete places you created')
      return
    }
    if (!confirm(`Are you sure you want to delete "${place.name}"? This action cannot be undone.`)) return
    try {
      const { error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId)
        .eq('created_by', user.id)
      if (error) throw error
      refetch()
    } catch (error) {
      console.error('Error deleting place:', error)
      alert('Failed to delete place. Please try again.')
    }
  }

  // Handle place added from modal
  const handlePlaceAdded = useCallback((insertedPlace: any) => {
    addPlaceLocally(insertedPlace as Place)
    const coords: [number, number] = [insertedPlace.latitude, insertedPlace.longitude]
    setCustomCenter(null)
    setMapCenter(coords)
    if (mapRef.current) {
      mapRef.current.setView(coords, 16)
    }
    setSuccessMessage(`"${insertedPlace.name}" has been added successfully!`)
    setTimeout(() => setSuccessMessage(''), 5000)
  }, [addPlaceLocally, setCustomCenter, setMapCenter])

  // Pan to place on map
  const handlePanToPlace = useCallback((lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15)
    }
  }, [])

  // Initialize on auth ready
  useEffect(() => {
    if (!authReady) return
    getCurrentLocation()
  }, [authReady, getCurrentLocation])

  // Set sidebar open on desktop
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Geocode initial location from URL
  useEffect(() => {
    if (!initialLocation || !authReady) return
    const geocodeInitialLocation = async () => {
      try {
        const data = await geocodingService.search(initialLocation, { limit: 1 })
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat)
          const lon = parseFloat(data[0].lon)
          const newCenter: [number, number] = [lat, lon]
          setMapCenter(newCenter)
          setCustomCenter(newCenter)
          setSearchQuery(initialLocation)
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.setView(newCenter, 13)
            }
          }, 100)
        }
      } catch (error) {
        console.error('Error geocoding initial location:', error)
        if (!mapCenter) {
          setMapCenter([50.9307, 5.3378])
        }
      }
    }
    geocodeInitialLocation()
  }, [initialLocation, authReady])

  // Event listeners are now attached inside MapEventHandler (in MapView)
  // which has direct access to the Leaflet map instance via useMap()

  // Category changes are handled by useNearbyPlaces hook automatically

  // Loading state
  if (!userLocation || !mapCenter) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const categories = [
    { value: 'all', label: 'All Places' },
    { value: 'eat', label: 'Eat' },
    { value: 'hotel', label: 'Stay' },
    { value: 'store', label: 'Stores' },
    { value: 'event', label: 'Events' },
    { value: 'organisation', label: 'Organisations' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
          <div className="bg-surface-container-low ghost-border rounded-lg editorial-shadow px-6 py-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-sm font-medium text-primary">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/15 p-3 md:p-4 flex-shrink-0 overflow-x-hidden">
        <div className="max-w-full mx-auto">
          {/* Mobile: Single row with menu button and title */}
          <div className="flex items-center justify-between gap-2 mb-3 lg:hidden">
            <h1 className="text-lg font-semibold text-on-surface flex-1">Vegan Places</h1>
            {user ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 silk-gradient hover:opacity-90 text-on-primary px-3 py-2 rounded-full text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </button>
            ) : (
              <Link
                href="/auth"
                className="flex items-center gap-1 silk-gradient hover:opacity-90 text-on-primary px-3 py-2 rounded-full text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Up</span>
              </Link>
            )}
          </div>

          {/* Desktop: Controls in two rows to prevent overflow */}
          <div className="hidden lg:block space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-xl font-semibold text-on-surface flex-shrink-0">Vegan Places</h1>

              {/* Search Bar */}
              <MapSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSelect={handleSearchSelect}
                className="flex-1 max-w-md"
              />

              {user ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1 silk-gradient hover:opacity-90 text-on-primary px-4 py-2 rounded-full font-medium transition-colors flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Place</span>
                </button>
              ) : (
                <Link
                  href="/auth"
                  className="flex items-center gap-1 silk-gradient hover:opacity-90 text-on-primary px-4 py-2 rounded-full font-medium transition-colors flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Sign Up</span>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              <MapCategoryPills selected={selectedCategory} onSelect={(c) => { setSelectedCategory(c); setSelectedSubcategory(null); }} selectedSub={selectedSubcategory} onSubSelect={setSelectedSubcategory} petFriendly={petFriendly} onPetToggle={setPetFriendly} />
              {customCenter && (
                <button
                  onClick={() => setCustomCenter(null)}
                  className="text-xs px-2 py-1 bg-surface-container-low hover:bg-surface-container text-on-surface-variant rounded ghost-border flex-shrink-0"
                >
                  Reset Center
                </button>
              )}
            </div>
          </div>

          {/* Mobile: Filters and search in separate rows */}
          <div className="lg:hidden space-y-3">
            <MapCategoryPills selected={selectedCategory} onSelect={(c) => { setSelectedCategory(c); setSelectedSubcategory(null); }} selectedSub={selectedSubcategory} onSubSelect={setSelectedSubcategory} petFriendly={petFriendly} onPetToggle={setPetFriendly} />

            {/* Mobile Search Bar */}
            <MapSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSelect={handleSearchSelect}
            />
          </div>
        </div>
      </div>

      {/* Main Content - Map and Discovery Panel */}
      <div className="flex-1 flex overflow-hidden max-h-full relative">
        {/* Map — show all viewport places, filtered by vegan/pet toggles */}
        <MapView
          places={(mapPlaces.length > 0 ? mapPlaces : filteredPlaces).filter(p => {
            if (selectedSubcategory && (p as any).subcategory !== selectedSubcategory) return false
            if (veganOnly && (p as any).vegan_level !== 'fully_vegan') return false
            if (petFriendly && !(p as any).is_pet_friendly) return false
            return true
          })}
          userLocation={userLocation}
          mapCenter={mapCenter}
          customCenter={customCenter}
          onMapClick={handleMapClick}
          onResetCenter={() => setCustomCenter(null)}
          onMapMove={handleMapMove}
          mapRef={mapRef}
          placeMarkerIcon={placeMarkerIcon}
          fullyVeganIcon={fullyVeganIcon}
          veganFriendlyIcon={veganFriendlyIcon}
          leafletIcon={leafletIcon}
          user={user}
          onToggleFavorite={toggleFavorite}
          onDeletePlace={handleDeletePlace}
          loading={loading}
        />

        {/* Floating panel toggle button (mobile only, when panel closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden absolute top-4 right-4 z-30 bg-surface-container-lowest hover:bg-surface-container-low p-3 rounded-lg editorial-shadow ghost-border transition-colors"
            aria-label="Show places list"
          >
            <div className="flex items-center gap-2">
              <Menu className="h-5 w-5 text-on-surface-variant" />
              <span className="text-sm font-medium text-on-surface-variant">
                {mapPlaces.length || sidebarPlaces.length} places
              </span>
            </div>
          </button>
        )}

        {/* Map count indicator */}
        <div className="absolute top-4 left-4 z-30 bg-surface-container-lowest/90 backdrop-blur-sm rounded-lg px-3 py-2 editorial-shadow ghost-border hidden md:block">
          <p className="text-xs text-on-surface-variant">
            {mapPlaces.length > 0 ? `${mapPlaces.length} places in view` : loading ? 'Loading...' : 'Zoom in to see places'}
          </p>
        </div>

        {/* Discovery Panel - RIGHT side */}
        <MapDiscoveryPanel
          places={(() => {
            let list = mapPlaces.length > 0 ? [...mapPlaces].sort((a, b) => a.distance - b.distance) : sidebarPlaces;
            if (selectedSubcategory) list = list.filter(p => (p as any).subcategory === selectedSubcategory);
            if (veganOnly) list = list.filter(p => (p as any).vegan_level === 'fully_vegan');
            if (petFriendly) list = list.filter(p => (p as any).is_pet_friendly);
            return list.slice(0, 20);
          })()}
          totalCount={mapPlaces.length > 0 ? mapPlaces.length : totalCount}
          customCenter={customCenter}
          user={user}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onToggleFavorite={toggleFavorite}
          onPanToPlace={handlePanToPlace}
          page={mapPlaces.length > 0 ? 1 : page}
          totalPages={mapPlaces.length > 0 ? 1 : totalPages}
          onPageChange={mapPlaces.length > 0 ? () => {} : goToPage}
          loading={loading}
        />
      </div>

      {/* Add Place Modal */}
      {showAddForm && (
        <AddPlaceModal
          onClose={() => setShowAddForm(false)}
          onPlaceAdded={handlePlaceAdded}
        />
      )}
    </div>
  )
}
