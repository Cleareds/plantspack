'use client'

import { useState, useEffect } from 'react'
import { X, Search, MapPin, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import StarRating from '@/components/places/StarRating'

type Place = {
  id: string
  name: string
  category: string
  address: string
  description: string | null
  latitude: number
  longitude: number
  average_rating?: number
  review_count?: number
}

interface AddPlaceModalProps {
  packId: string
  onClose: () => void
  onPlaceAdded: () => void
}

export default function AddPlaceModal({ packId, onClose, onPlaceAdded }: AddPlaceModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [sectionName, setSectionName] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    const searchPlaces = async () => {
      if (searchQuery.length < 2) {
        setPlaces([])
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('places')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        setPlaces(data || [])
      } catch (error) {
        console.error('Error searching places:', error)
        setPlaces([])
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(searchPlaces, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleAddPlace = async (placeId: string) => {
    try {
      setAdding(placeId)
      const response = await fetch(`/api/packs/${packId}/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          section_name: sectionName || null,
          is_pinned: isPinned
        })
      })

      if (response.ok) {
        onPlaceAdded()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add place to pack')
      }
    } catch (error) {
      console.error('Error adding place:', error)
      alert('Failed to add place. Please try again.')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Place to Pack</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places by name or address..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Name (optional)
              </label>
              <input
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="e.g., Best Restaurants, Must Visit"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPinned"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="isPinned" className="ml-2 text-sm text-gray-700">
                Pin to top of list
              </label>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-600">Searching...</p>
            </div>
          )}

          {!loading && searchQuery.length < 2 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>Start typing to search for places</p>
            </div>
          )}

          {!loading && searchQuery.length >= 2 && places.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>No places found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}

          {!loading && places.length > 0 && (
            <div className="space-y-3">
              {places.map((place) => (
                <div
                  key={place.id}
                  className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-green-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1">{place.name}</h3>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {place.category}
                      </span>
                    </div>
                    {place.average_rating && place.average_rating > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <StarRating rating={place.average_rating} size="sm" />
                        <span className="text-xs text-gray-600">
                          ({place.review_count || 0})
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-1 text-sm text-gray-500">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{place.address}</span>
                    </div>
                    {place.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {place.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddPlace(place.id)}
                    disabled={adding === place.id}
                    className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {adding === place.id ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
