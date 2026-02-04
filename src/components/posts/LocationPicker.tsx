'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MapPin, Search, Navigation, X, Loader2 } from 'lucide-react'
import { getCurrentLocation, type LocationData } from '@/lib/post-analytics'
import { geocodingService } from '@/lib/geocoding'

interface LocationPickerProps {
  onSelect: (location: LocationData) => void
  onClose: () => void
  currentLocation?: LocationData | null
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
    region?: string
    country?: string
  }
}

export default function LocationPicker({ onSelect, onClose, currentLocation }: LocationPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [gettingCurrent, setGettingCurrent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Debounced search with rate limiting
  useEffect(() => {
    if (query.length < 3) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await geocodingService.search(query, { limit: 6 })
        setResults(data)
      } catch (error) {
        console.error('Location search error:', error)
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleResultSelect = useCallback((result: NominatimResult) => {
    const addr = result.address || {}
    const city = addr.city || addr.town || addr.village || addr.municipality || ''
    const region = addr.state || addr.region || ''
    const country = addr.country || ''

    onSelect({
      city,
      region,
      country,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    })
  }, [onSelect])

  const handleUseCurrentLocation = useCallback(async () => {
    setGettingCurrent(true)
    try {
      const location = await getCurrentLocation()
      if (location) {
        onSelect(location)
      }
    } catch (error) {
      console.warn('Failed to get current location:', error)
    } finally {
      setGettingCurrent(false)
    }
  }, [onSelect])

  // Format display name to be shorter
  const formatName = (name: string) => {
    const parts = name.split(', ')
    if (parts.length > 3) {
      return parts.slice(0, 3).join(', ')
    }
    return name
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div ref={modalRef} className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Add Location</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a location..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {/* Use Current Location button */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={gettingCurrent}
            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
          >
            {gettingCurrent ? (
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
            ) : (
              <Navigation className="h-5 w-5 text-blue-600 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-blue-600">Use my current location</p>
              {currentLocation && (
                <p className="text-xs text-gray-500">
                  {currentLocation.city && currentLocation.region
                    ? `${currentLocation.city}, ${currentLocation.region}`
                    : currentLocation.city || currentLocation.region || 'Location detected'}
                </p>
              )}
            </div>
          </button>

          {/* Search results */}
          {results.length > 0 ? (
            results.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleResultSelect(result)}
                className="w-full flex items-start space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
              >
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">{formatName(result.display_name)}</p>
                  <p className="text-xs text-gray-500 capitalize">{result.type?.replace(/_/g, ' ')}</p>
                </div>
              </button>
            ))
          ) : query.length >= 3 && !searching ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No locations found
            </div>
          ) : query.length > 0 && query.length < 3 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Type at least 3 characters to search
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
