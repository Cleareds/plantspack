'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, MapPin } from 'lucide-react'
import { geocodingService } from '@/lib/geocoding'

interface AddressResult {
  display_name: string
  lat: string
  lon: string
  type?: string
  address?: {
    city?: string
    town?: string
    village?: string
    state?: string
    region?: string
    country?: string
  }
}

interface AddressSearchProps {
  value: string
  selectedAddress?: string
  onSelect: (result: { address: string; latitude: number; longitude: number }) => void
  placeholder?: string
  required?: boolean
}

export default function AddressSearch({ value, selectedAddress, onSelect, placeholder = 'Search for address...', required }: AddressSearchProps) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState<AddressResult[]>([])
  const [showResults, setShowResults] = useState(false)

  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([])
      setShowResults(false)
      return
    }
    try {
      const data = await geocodingService.search(searchQuery, {
        limit: 8, addressDetails: true, extraTags: true, nameDetails: true,
      })
      setResults(data)
      setShowResults(true)
    } catch (error) {
      console.error('Error searching addresses:', error)
      setResults([])
      setShowResults(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query && query !== selectedAddress) {
        searchAddresses(query)
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [query, selectedAddress, searchAddresses])

  const handleSelect = (result: AddressResult) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    setQuery(result.display_name)
    setShowResults(false)
    onSelect({ address: result.display_name, latitude: lat, longitude: lon })
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-outline" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"
          required={required}
        />
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-surface-container-lowest ghost-border rounded-md editorial-shadow mt-1 z-50 max-h-40 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full text-left px-3 py-2 hover:bg-surface-container border-b border-outline-variant/15 last:border-b-0"
            >
              <div className="text-sm font-medium text-on-surface truncate">
                {result.display_name}
              </div>
              {result.address && (
                <div className="text-xs text-outline mt-0.5">
                  {[result.address.city || result.address.town || result.address.village, result.address.country]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedAddress && (
        <div className="mt-1 flex items-center gap-1 text-xs text-primary">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{selectedAddress}</span>
        </div>
      )}
    </div>
  )
}
