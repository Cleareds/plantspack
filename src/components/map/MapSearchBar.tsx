'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search } from 'lucide-react'
import { geocodingService } from '@/lib/geocoding'

interface MapSearchBarProps {
  value: string
  onChange: (value: string) => void
  onSelect: (result: { lat: string; lon: string; display_name: string }) => void
  placeholder?: string
  className?: string
}

export default function MapSearchBar({ value, onChange, onSelect, placeholder = 'Search for places...', className = '' }: MapSearchBarProps) {
  const [results, setResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)

  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([])
      setShowResults(false)
      return
    }

    try {
      const data = await geocodingService.search(query, {
        limit: 8,
        addressDetails: true,
        extraTags: true,
        nameDetails: true,
      })
      setResults(data)
      setShowResults(true)
    } catch (error) {
      console.error('Error searching addresses:', error)
      setResults([])
      setShowResults(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value) {
        searchAddresses(value)
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [value, searchAddresses])

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-container')) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (result: any) => {
    onSelect(result)
    onChange(result.display_name)
    setShowResults(false)
  }

  return (
    <div className={`relative search-container ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-outline" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-0 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none text-sm"
        />
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-surface-container-lowest ghost-border rounded-md editorial-shadow mt-1 z-50 max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-2 hover:bg-surface-container border-b border-outline-variant/15 last:border-b-0"
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
  )
}
