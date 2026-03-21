'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase, Tables } from '@/lib/supabase'
import { Plus, Search, Menu, CheckCircle, X } from 'lucide-react'
import { geocodingService } from '@/lib/geocoding'
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
    defaultValue: { selectedCategory: 'all', searchRadius: 50, customCenter: null as [number, number] | null },
    userId: user?.id,
    ttl: 60 * 60 * 1000,
  })
  const selectedCategory = mapState.selectedCategory
  const searchRadius = mapState.searchRadius
  const customCenter = mapState.customCenter
  const setSelectedCategory = useCallback((c: string) => setMapState(prev => ({ ...prev, selectedCategory: c })), [setMapState])
  const setSearchRadius = useCallback((r: number) => setMapState(prev => ({ ...prev, searchRadius: r })), [setMapState])
  const setCustomCenter = useCallback((c: [number, number] | null) => setMapState(prev => ({ ...prev, customCenter: c })), [setMapState])

  // Location state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)

  // Search center: custom > mapCenter > userLocation
  const searchCenter = customCenter || mapCenter || userLocation

  // Nearby places hook
  const {
    places: sidebarPlaces,
    allFiltered: filteredPlaces,
    loading,
    hasMore,
    loadMore,
    refetch,
    fetchPlaces,
    addPlaceLocally,
  } = useNearbyPlaces({
    lat: searchCenter?.[0] ?? null,
    lng: searchCenter?.[1] ?? null,
    radius_km: searchRadius,
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
  const [addressSearchQuery, setAddressSearchQuery] = useState('')
  const [addressSearchResults, setAddressSearchResults] = useState<any[]>([])
  const [showAddressSearchResults, setShowAddressSearchResults] = useState(false)
  const [newPlace, setNewPlace] = useState({
    name: '',
    category: 'restaurant',
    address: '',
    description: '',
    website: '',
    is_pet_friendly: false,
    latitude: 0,
    longitude: 0,
  })

  // Leaflet icons
  const [leafletIcon, setLeafletIcon] = useState<any>(null)
  const [placeMarkerIcon, setPlaceMarkerIcon] = useState<any>(null)
  const mapRef = useRef<any>(null)

  // Initialize Leaflet icons
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        import('@/lib/leaflet-config').then((config) => {
          setPlaceMarkerIcon(config.veganMarkerIcon)
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

  // Close address search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.address-search-container')) {
        setShowAddressSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [position.coords.latitude, position.coords.longitude]
          setUserLocation(location)
          if (!initialLocation) {
            setMapCenter(location)
          }
        },
        (error) => {
          console.error('Error getting location:', error)
          const defaultLocation: [number, number] = [50.9307, 5.3378]
          setUserLocation(defaultLocation)
          if (!initialLocation) {
            setMapCenter(defaultLocation)
          }
        },
        { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
      )
    } else {
      const defaultLocation: [number, number] = [50.9307, 5.3378]
      setUserLocation(defaultLocation)
      if (!initialLocation) {
        setMapCenter(defaultLocation)
      }
    }
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

  // Address search for form
  const searchFormAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSearchResults([])
      setShowAddressSearchResults(false)
      return
    }
    try {
      const data = await geocodingService.search(query, {
        limit: 8, addressDetails: true, extraTags: true, nameDetails: true,
      })
      setAddressSearchResults(data)
      setShowAddressSearchResults(true)
    } catch (error) {
      console.error('Error searching addresses for form:', error)
      setAddressSearchResults([])
      setShowAddressSearchResults(false)
    }
  }, [])

  // Debounce form address search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (addressSearchQuery) {
        searchFormAddresses(addressSearchQuery)
      } else {
        setAddressSearchResults([])
        setShowAddressSearchResults(false)
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [addressSearchQuery, searchFormAddresses])

  // Handle address selection in form
  const handleAddressSelect = useCallback((result: any) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    setNewPlace(prev => ({ ...prev, address: result.display_name, latitude: lat, longitude: lon }))
    setAddressSearchQuery(result.display_name)
    setShowAddressSearchResults(false)
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 15)
    }
  }, [])

  // Map click handler
  const handleMapClick = useCallback((latlng: [number, number]) => {
    setCustomCenter(latlng)
  }, [setCustomCenter])

  // Map move handler
  const handleMapMove = useCallback(() => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter()
      setMapCenter([center.lat, center.lng])
    }
  }, [])

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

  // Add place
  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!newPlace.latitude || !newPlace.longitude) {
      alert('Please select an address from the search results')
      return
    }
    try {
      const { data: insertedPlace, error } = await supabase
        .from('places')
        .insert({ ...newPlace, created_by: user.id })
        .select(`*, users(id, username, first_name, last_name), favorite_places(id, user_id)`)
        .single()
      if (error) throw error

      const addedName = newPlace.name
      const addedCoords: [number, number] = [newPlace.latitude, newPlace.longitude]

      setShowAddForm(false)
      setNewPlace({ name: '', category: 'restaurant', address: '', description: '', website: '', is_pet_friendly: false, latitude: 0, longitude: 0 })
      setAddressSearchQuery('')
      setAddressSearchResults([])
      setShowAddressSearchResults(false)

      addPlaceLocally(insertedPlace as Place)
      setCustomCenter(null)
      setMapCenter(addedCoords)

      if (mapRef.current) {
        mapRef.current.setView(addedCoords, 16)
      }

      setSuccessMessage(`"${addedName}" has been added successfully!`)
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error) {
      console.error('Error adding place:', error)
      alert('Failed to add place. Please try again.')
    }
  }

  // Close add form
  const handleFormClose = useCallback(() => {
    setShowAddForm(false)
    setAddressSearchQuery('')
    setAddressSearchResults([])
    setShowAddressSearchResults(false)
    setNewPlace({ name: '', category: 'restaurant', address: '', description: '', website: '', is_pet_friendly: false, latitude: 0, longitude: 0 })
  }, [])

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
    fetchPlaces()
  }, [authReady, getCurrentLocation, fetchPlaces])

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

  // Map event listeners
  useEffect(() => {
    const mapInstance = mapRef.current
    if (mapInstance) {
      mapInstance.on('moveend', handleMapMove)
      return () => {
        if (mapInstance) {
          mapInstance.off('moveend', handleMapMove)
        }
      }
    }
  }, [handleMapMove])

  // Refetch when category changes
  useEffect(() => {
    if (authReady) {
      fetchPlaces()
    }
  }, [selectedCategory, authReady, fetchPlaces])

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
    { value: 'restaurant', label: 'Restaurants' },
    { value: 'event', label: 'Events' },
    { value: 'museum', label: 'Museums' },
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
      <div className="bg-surface-container-lowest border-b border-outline-variant/15 p-3 md:p-4 flex-shrink-0">
        <div className="max-w-full mx-auto">
          {/* Mobile: Single row with menu button and title */}
          <div className="flex items-center justify-between gap-2 mb-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-surface-container rounded-md transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5 text-on-surface-variant" />
            </button>
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

          {/* Desktop: All controls in one row */}
          <div className="hidden lg:flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-on-surface">Vegan Places</h1>
              <MapCategoryPills selected={selectedCategory} onSelect={setSelectedCategory} />

              {/* Radius Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface-variant">Radius:</span>
                <select
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                  className="ghost-border rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none"
                >
                  <option value={5}>5km</option>
                  <option value={10}>10km</option>
                  <option value={25}>25km</option>
                  <option value={50}>50km</option>
                  <option value={100}>100km</option>
                  <option value={200}>200km</option>
                </select>
              </div>

              {/* Reset Center Button */}
              {customCenter && (
                <button
                  onClick={() => setCustomCenter(null)}
                  className="text-xs px-2 py-1 bg-surface-container-low hover:bg-surface-container text-on-surface-variant rounded ghost-border"
                >
                  Reset Center
                </button>
              )}
            </div>

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
                className="flex items-center gap-1 silk-gradient hover:opacity-90 text-on-primary px-4 py-2 rounded-full font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Place</span>
              </button>
            ) : (
              <Link
                href="/auth"
                className="flex items-center gap-1 silk-gradient hover:opacity-90 text-on-primary px-4 py-2 rounded-full font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Sign Up</span>
              </Link>
            )}
          </div>

          {/* Mobile: Filters and search in separate rows */}
          <div className="lg:hidden space-y-3">
            <MapCategoryPills selected={selectedCategory} onSelect={setSelectedCategory} />

            <div className="flex items-center gap-2">
              <select
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="ghost-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none"
              >
                <option value={5}>5km</option>
                <option value={10}>10km</option>
                <option value={25}>25km</option>
                <option value={50}>50km</option>
                <option value={100}>100km</option>
                <option value={200}>200km</option>
              </select>
            </div>

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
        {/* Map */}
        <MapView
          places={filteredPlaces}
          userLocation={userLocation}
          mapCenter={mapCenter}
          searchRadius={searchRadius}
          searchCenter={searchCenter}
          customCenter={customCenter}
          onMapClick={handleMapClick}
          onResetCenter={() => setCustomCenter(null)}
          mapRef={mapRef}
          placeMarkerIcon={placeMarkerIcon}
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
                {sidebarPlaces.length} places
              </span>
            </div>
          </button>
        )}

        {/* Map Instructions */}
        <div className="absolute top-4 left-4 z-30 bg-surface-container-lowest/90 backdrop-blur-sm rounded-lg p-3 editorial-shadow ghost-border max-w-xs hidden md:block">
          <p className="text-xs text-on-surface-variant">
            <strong>Tip:</strong> Click anywhere on the map to set a new search center and find places within your selected radius.
          </p>
        </div>

        {/* Discovery Panel - RIGHT side */}
        <MapDiscoveryPanel
          places={sidebarPlaces}
          totalFiltered={filteredPlaces.length}
          searchRadius={searchRadius}
          customCenter={customCenter}
          user={user}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onToggleFavorite={toggleFavorite}
          onPanToPlace={handlePanToPlace}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>

      {/* Add Place Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto editorial-shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-on-surface">Add New Place</h2>
              <button onClick={handleFormClose} className="text-outline hover:text-on-surface-variant">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlace} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Place Name *</label>
                <input
                  type="text"
                  value={newPlace.name}
                  onChange={(e) => setNewPlace(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container-low border-0 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Category</label>
                <select
                  value={newPlace.category}
                  onChange={(e) => setNewPlace(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container-low border-0 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                >
                  {categories.filter(c => c.value !== 'all').map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="address-search-container">
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Address *</label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-outline" />
                    <input
                      type="text"
                      value={addressSearchQuery}
                      onChange={(e) => setAddressSearchQuery(e.target.value)}
                      placeholder="Search for address..."
                      className="w-full pl-10 pr-4 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                      required
                    />
                  </div>

                  {showAddressSearchResults && addressSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-surface-container-lowest ghost-border rounded-md editorial-shadow mt-1 z-50 max-h-40 overflow-y-auto">
                      {addressSearchResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleAddressSelect(result)}
                          className="w-full text-left px-3 py-2 hover:bg-surface-container border-b border-outline-variant/15 last:border-b-0"
                        >
                          <div className="text-sm font-medium text-on-surface truncate">
                            {result.display_name}
                          </div>
                          <div className="text-xs text-outline mt-1">
                            {result.type && <span className="capitalize">{result.type}</span>}
                            {result.address && (
                              <span className="ml-2">
                                {[result.address.country, result.address.state, result.address.city]
                                  .filter(Boolean)
                                  .join(', ')}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {newPlace.address && (
                  <div className="mt-1 text-xs text-outline">
                    Selected: {newPlace.address}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Description</label>
                <textarea
                  value={newPlace.description}
                  onChange={(e) => setNewPlace(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-container-low border-0 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Website</label>
                <input
                  type="url"
                  value={newPlace.website}
                  onChange={(e) => setNewPlace(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-container-low border-0 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pet-friendly"
                  checked={newPlace.is_pet_friendly}
                  onChange={(e) => setNewPlace(prev => ({ ...prev, is_pet_friendly: e.target.checked }))}
                  className="h-4 w-4 text-primary focus:ring-primary border-outline-variant/15 rounded"
                />
                <label htmlFor="pet-friendly" className="ml-2 block text-sm text-on-surface-variant">
                  Pet Friendly
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleFormClose}
                  className="flex-1 px-4 py-2 ghost-border rounded-full text-on-surface-variant hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 silk-gradient hover:opacity-90 text-on-primary rounded-full"
                >
                  Add Place
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
