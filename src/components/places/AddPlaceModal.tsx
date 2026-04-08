'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { geocodingService } from '@/lib/geocoding'
import ImageUploader from '../ui/ImageUploader'

const PLACE_CATEGORIES = [
  { value: 'eat', label: 'Eat' },
  { value: 'hotel', label: 'Stay' },
  { value: 'store', label: 'Stores' },
  { value: 'event', label: 'Events' },
  { value: 'organisation', label: 'Organisations' },
  { value: 'other', label: 'Other' },
]

interface AddPlaceModalProps {
  onClose: () => void
  onPlaceAdded?: (place: any) => void
  defaultCity?: string
  defaultCountry?: string
}

export default function AddPlaceModal({ onClose, onPlaceAdded, defaultCity, defaultCountry }: AddPlaceModalProps) {
  const { user } = useAuth()

  const [newPlace, setNewPlace] = useState({
    name: '',
    category: 'eat',
    address: '',
    description: '',
    website: '',
    is_pet_friendly: false,
    vegan_level: 'fully_vegan' as 'fully_vegan' | 'vegan_friendly',
    latitude: 0,
    longitude: 0,
    city: defaultCity || ('' as string | undefined),
    country: defaultCountry || ('' as string | undefined),
  })

  const [placeImages, setPlaceImages] = useState<string[]>([])
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [addressSearchQuery, setAddressSearchQuery] = useState('')
  const [addressSearchResults, setAddressSearchResults] = useState<any[]>([])
  const [showAddressResults, setShowAddressResults] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Close address dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.address-search-container')) {
        setShowAddressResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced address search
  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSearchResults([])
      setShowAddressResults(false)
      return
    }
    try {
      const data = await geocodingService.search(query, {
        limit: 8, addressDetails: true, extraTags: true, nameDetails: true,
      })
      setAddressSearchResults(data)
      setShowAddressResults(true)
    } catch {
      setAddressSearchResults([])
      setShowAddressResults(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (addressSearchQuery) searchAddresses(addressSearchQuery)
      else { setAddressSearchResults([]); setShowAddressResults(false) }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [addressSearchQuery, searchAddresses])

  const handleAddressSelect = (result: any) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    const city = result.address?.city || result.address?.town || result.address?.village || undefined
    const country = result.address?.country || undefined
    setNewPlace(prev => ({ ...prev, address: result.display_name, latitude: lat, longitude: lon, city, country }))
    setAddressSearchQuery(result.display_name)
    setShowAddressResults(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!newPlace.latitude || !newPlace.longitude) {
      alert('Please select an address from the search results')
      return
    }
    setSubmitting(true)
    try {
      const { data: insertedPlace, error } = await supabase
        .from('places')
        .insert({ ...newPlace, vegan_level: newPlace.vegan_level, images: placeImages, created_by: user.id, city: newPlace.city || null, country: newPlace.country || null })
        .select(`*, users(id, username, first_name, last_name), favorite_places(id, user_id)`)
        .single()
      if (error) throw error

      // Auto-create a linked post
      try {
        await supabase.from('posts').insert({
          user_id: user.id,
          content: newPlace.description || `Check out ${newPlace.name}`,
          category: 'place',
          place_id: insertedPlace.id,
          images: placeImages.length > 0 ? placeImages : [],
          privacy: 'public',
        })
      } catch {}

      onPlaceAdded?.(insertedPlace)
      onClose()
    } catch (error) {
      console.error('Error adding place:', error)
      alert('Failed to add place. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[60]" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
        <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-sm editorial-shadow" onClick={e => e.stopPropagation()}>
          <p className="text-on-surface-variant text-center mb-4">Please sign in to add a place.</p>
          <button onClick={onClose} className="w-full px-4 py-2 ghost-border rounded-full text-on-surface-variant hover:bg-surface-container-low">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[60]" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto editorial-shadow" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-on-surface">Add New Place</h2>
          <button onClick={onClose} className="text-outline hover:text-on-surface-variant">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              {PLACE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
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

              {showAddressResults && addressSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-surface-container-lowest ghost-border rounded-md editorial-shadow mt-1 z-50 max-h-40 overflow-y-auto">
                  {addressSearchResults.map((result, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleAddressSelect(result)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-container border-b border-outline-variant/15 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-on-surface truncate">{result.display_name}</div>
                      <div className="text-xs text-outline mt-1">
                        {result.type && <span className="capitalize">{result.type}</span>}
                        {result.address && (
                          <span className="ml-2">
                            {[result.address.country, result.address.state, result.address.city].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {newPlace.address && (
              <div className="mt-1 text-xs text-outline">Selected: {newPlace.address}</div>
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
              id="add-modal-pet-friendly"
              checked={newPlace.is_pet_friendly}
              onChange={(e) => setNewPlace(prev => ({ ...prev, is_pet_friendly: e.target.checked }))}
              className="h-4 w-4 text-primary focus:ring-primary border-outline-variant/15 rounded"
            />
            <label htmlFor="add-modal-pet-friendly" className="ml-2 block text-sm text-on-surface-variant">Pet Friendly</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Vegan Level</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="add_modal_vegan_level"
                  value="fully_vegan"
                  checked={newPlace.vegan_level === 'fully_vegan'}
                  onChange={() => setNewPlace(prev => ({ ...prev, vegan_level: 'fully_vegan' }))}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm text-on-surface-variant">100% Vegan</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="add_modal_vegan_level"
                  value="vegan_friendly"
                  checked={newPlace.vegan_level === 'vegan_friendly'}
                  onChange={() => setNewPlace(prev => ({ ...prev, vegan_level: 'vegan_friendly' }))}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm text-on-surface-variant">Vegan-Friendly</span>
              </label>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowImageUploader(!showImageUploader)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                placeImages.length > 0 || showImageUploader ? 'text-primary' : 'text-outline hover:text-on-surface-variant'
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              {placeImages.length > 0 ? `${placeImages.length} photo${placeImages.length > 1 ? 's' : ''}` : 'Add photos'}
            </button>
            {showImageUploader && (
              <div className="mt-2">
                <ImageUploader onImagesChange={setPlaceImages} maxImages={5} />
              </div>
            )}
            {placeImages.length > 0 && !showImageUploader && (
              <div className="flex gap-1.5 mt-2">
                {placeImages.map((url, i) => (
                  <img key={i} src={url} alt="" className="h-12 w-12 rounded-md object-cover" />
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 ghost-border rounded-full text-on-surface-variant hover:bg-surface-container-low"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 silk-gradient hover:opacity-90 text-on-primary rounded-full disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Place'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
