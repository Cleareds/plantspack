'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Plus, MapPin, Heart, X, Search } from 'lucide-react'
import { Tables } from '@/lib/supabase'
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

type Place = Tables<'places'> & {
  users: Tables<'users'>
  favorite_places: { id: string; user_id: string }[]
}

export default function Map() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
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
    longitude: 0
  })
  const [leafletIcon, setLeafletIcon] = useState<any>(null)
  const mapRef = useRef<any>(null)
  const { user, authReady } = useAuth()

  const categories = [
    { value: 'all', label: 'All Places', icon: MapPin },
    { value: 'restaurant', label: 'Restaurants', icon: MapPin },
    { value: 'event', label: 'Events', icon: MapPin },
    { value: 'museum', label: 'Museums', icon: MapPin },
    { value: 'other', label: 'Other', icon: MapPin },
  ]

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

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      const { data: placesData, error } = await query

      if (error) throw error
      setPlaces(placesData || [])
    } catch (error) {
      console.error('Error fetching places:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  // Fix Leaflet marker icons and create custom icons on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        })
        
        // Create custom icon for user location
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

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-container')) {
        setShowSearchResults(false)
      }
      if (!target.closest('.address-search-container')) {
        setShowAddressSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search for addresses using Nominatim
  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&extratags=1&namedetails=1&bounded=0&dedupe=1`
      )
      const data = await response.json()
      setSearchResults(data)
      setShowSearchResults(true)
    } catch (error) {
      console.error('Error searching addresses:', error)
      setSearchResults([])
      setShowSearchResults(false)
    }
  }, [])

  // Handle search input with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchAddresses(searchQuery)
      } else {
        setSearchResults([])
        setShowSearchResults(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchAddresses])

  // Handle search result selection
  const handleSearchSelect = useCallback((result: any) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    setMapCenter([lat, lon])
    setSearchQuery(result.display_name)
    setShowSearchResults(false)
    
    // Pan the map to the selected location
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 15)
    }
  }, [])

  // Search for addresses in the add form
  const searchFormAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSearchResults([])
      setShowAddressSearchResults(false)
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&extratags=1&namedetails=1&bounded=0&dedupe=1`
      )
      const data = await response.json()
      setAddressSearchResults(data)
      setShowAddressSearchResults(true)
    } catch (error) {
      console.error('Error searching addresses for form:', error)
      setAddressSearchResults([])
      setShowAddressSearchResults(false)
    }
  }, [])

  // Handle address search input with debouncing for form
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
    
    
    setNewPlace(prev => ({
      ...prev,
      address: result.display_name,
      latitude: lat,
      longitude: lon
    }))
    setAddressSearchQuery(result.display_name)
    setShowAddressSearchResults(false)
    
    // Pan the map to show the selected location
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 15)
    }
  }, [])

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [position.coords.latitude, position.coords.longitude]
          setUserLocation(location)
          setMapCenter(location)
        },
        (error) => {
          console.error('Error getting location:', error)
          // Default to Hasselt, Belgium area 
          const defaultLocation: [number, number] = [50.9307, 5.3378]
          setUserLocation(defaultLocation)
          setMapCenter(defaultLocation)
        },
        {
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
          enableHighAccuracy: false
        }
      )
    } else {
      // Default to Hasselt, Belgium area
      const defaultLocation: [number, number] = [50.9307, 5.3378]
      setUserLocation(defaultLocation)
      setMapCenter(defaultLocation)
    }
  }, [])

  // Calculate distance between two points in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Memoize places sorted by distance from map center
  const placesByDistance = useMemo(() => {
    if (!mapCenter) return []
    
    const placesWithDistance = places.map(place => ({
      ...place,
      distance: calculateDistance(mapCenter[0], mapCenter[1], place.latitude, place.longitude)
    }))
    
    return placesWithDistance.sort((a, b) => a.distance - b.distance)
  }, [places, mapCenter])

  // Memoize closest places for sidebar (max 5, within 200km)
  const sidebarPlaces = useMemo(() => {
    return placesByDistance.filter(place => place.distance <= 200).slice(0, 5)
  }, [placesByDistance])

  // Handle map center change
  const handleMapMove = useCallback(() => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter()
      setMapCenter([center.lat, center.lng])
    }
  }, [])

  const toggleFavorite = async (placeId: string) => {
    if (!user) return

    try {
      const place = places.find(p => p.id === placeId)
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

      fetchPlaces()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleDeletePlace = async (placeId: string) => {
    if (!user) return

    const place = places.find(p => p.id === placeId)
    if (!place || place.created_by !== user.id) {
      alert('You can only delete places you created')
      return
    }

    if (!confirm(`Are you sure you want to delete "${place.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId)
        .eq('created_by', user.id) // Extra security check

      if (error) throw error
      
      fetchPlaces()
    } catch (error) {
      console.error('Error deleting place:', error)
      alert('Failed to delete place. Please try again.')
    }
  }

  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      return
    }

    // Validate that address has been selected with coordinates
    if (!newPlace.latitude || !newPlace.longitude) {
      alert('Please select an address from the search results')
      return
    }

    try {
      const { error } = await supabase
        .from('places')
        .insert({
          ...newPlace,
          created_by: user.id
        })
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      

      setShowAddForm(false)
      setNewPlace({
        name: '',
        category: 'restaurant',
        address: '',
        description: '',
        website: '',
        is_pet_friendly: false,
        latitude: 0,
        longitude: 0
      })
      setAddressSearchQuery('')
      setAddressSearchResults([])
      setShowAddressSearchResults(false)
      fetchPlaces()
    } catch (error) {
      console.error('Error adding place:', error)
      alert('Failed to add place. Please try again.')
    }
  }

  // Handle form close
  const handleFormClose = useCallback(() => {
    setShowAddForm(false)
    setAddressSearchQuery('')
    setAddressSearchResults([])
    setShowAddressSearchResults(false)
    setNewPlace({
      name: '',
      category: 'restaurant',
      address: '',
      description: '',
      website: '',
      is_pet_friendly: false,
      latitude: 0,
      longitude: 0
    })
  }, [])

  // Initialize map and data when auth is ready
  useEffect(() => {
    console.log('🔄 Map useEffect - authReady:', authReady, 'user:', user?.id)
    
    if (!authReady) {
      console.log('⏳ Waiting for auth to be ready...')
      return
    }
    
    console.log('✅ Auth ready, initializing map...')
    getCurrentLocation()
    fetchPlaces()
  }, [authReady, getCurrentLocation, fetchPlaces])

  // Set up map event listeners
  useEffect(() => {
    const mapInstance = mapRef.current
    if (mapInstance) {
      mapInstance.on('moveend', handleMapMove)
      return () => {
        // Store reference to avoid stale closure
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

  if (!userLocation || !mapCenter) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  const hasNearbyPlaces = sidebarPlaces.length > 0

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Controls */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Vegan Places</h1>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-4 relative search-container">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for places..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-1 z-50 max-h-60 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchSelect(result)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {result.display_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
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

          {user ? (
            <button
              onClick={() => {
                setShowAddForm(true)
              }}
              className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Place</span>
            </button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Sign up to add places</p>
              <Link 
                href="/auth" 
                className="inline-flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Sign Up</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Sidebar and Map */}
      <div className="flex-1 flex overflow-hidden max-h-full">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto z-20">
          <div className="p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Nearby Places
            </h2>
            
            {!hasNearbyPlaces ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No places found within 200km radius.
                </p>
                {user && (
                  <p className="text-gray-400 text-xs mt-2">
                    Be the first to add one!
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sidebarPlaces.map((place) => (
                  <div key={place.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                       onClick={() => {
                         if (mapRef.current) {
                           mapRef.current.setView([place.latitude, place.longitude], 15)
                         }
                       }}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{place.name}</h3>
                      {user && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(place.id)
                          }}
                          className={`p-1 rounded ${
                            place.favorite_places.some(fav => fav.user_id === user.id)
                              ? 'text-red-600'
                              : 'text-gray-400 hover:text-red-600'
                          }`}
                        >
                          <Heart className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs capitalize">
                          {place.category}
                        </span>
                        {place.is_pet_friendly && (
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                            Pet Friendly
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{place.address}</p>
                      <p className="text-xs text-gray-400">
                        {place.distance.toFixed(1)}km away
                      </p>
                      {place.description && (
                        <p className="text-xs text-gray-700 line-clamp-2">{place.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative min-h-0">
          <MapContainer
            ref={mapRef}
            center={userLocation}
            zoom={13}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
            className="z-10"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* User Location Marker */}
            {userLocation && leafletIcon && (
              <Marker
                position={userLocation}
                icon={leafletIcon}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-blue-600">Your Location</h3>
                    <p className="text-sm text-gray-600">This is your current position</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {places.map((place) => (
              <Marker
                key={place.id}
                position={[place.latitude, place.longitude]}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{place.name}</h3>
                      <div className="flex items-center space-x-1">
                        {user && (
                          <button
                            onClick={() => toggleFavorite(place.id)}
                            className={`p-1 rounded ${
                              place.favorite_places.some(fav => fav.user_id === user.id)
                                ? 'text-red-600'
                                : 'text-gray-400 hover:text-red-600'
                            }`}
                          >
                            <Heart className="h-4 w-4" />
                          </button>
                        )}
                        {user && user.id === place.created_by && (
                          <button
                            onClick={() => handleDeletePlace(place.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-600"
                            title="Delete place"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <span className="capitalize">{place.category}</span>
                        {place.is_pet_friendly && (
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                            Pet Friendly
                          </span>
                        )}
                      </div>
                      <p>{place.address}</p>
                      {place.description && <p>{place.description}</p>}
                      {place.website && (
                        <a
                          href={place.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline"
                        >
                          Visit Website
                        </a>
                      )}
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                      Added by @{place.users.username}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* Add Place Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Place</h2>
              <button
                onClick={handleFormClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlace} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Place Name *
                </label>
                <input
                  type="text"
                  value={newPlace.name}
                  onChange={(e) => setNewPlace(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newPlace.category}
                  onChange={(e) => setNewPlace(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {categories.filter(c => c.value !== 'all').map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="address-search-container">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={addressSearchQuery}
                      onChange={(e) => setAddressSearchQuery(e.target.value)}
                      placeholder="Search for address..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  {/* Address Search Results Dropdown */}
                  {showAddressSearchResults && addressSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-1 z-50 max-h-40 overflow-y-auto">
                      {addressSearchResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleAddressSelect(result)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {result.display_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
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
                  <div className="mt-1 text-xs text-gray-500">
                    Selected: {newPlace.address}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newPlace.description}
                  onChange={(e) => setNewPlace(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={newPlace.website}
                  onChange={(e) => setNewPlace(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pet-friendly"
                  checked={newPlace.is_pet_friendly}
                  onChange={(e) => setNewPlace(prev => ({ ...prev, is_pet_friendly: e.target.checked }))}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="pet-friendly" className="ml-2 block text-sm text-gray-700">
                  Pet Friendly
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleFormClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
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