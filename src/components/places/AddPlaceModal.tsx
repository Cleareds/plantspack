'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Image as ImageIcon } from 'lucide-react'
import { track } from '@/lib/analytics'
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

  // Restore draft from sessionStorage if available
  const getInitialState = () => {
    if (typeof window === 'undefined') return null
    try {
      const draft = sessionStorage.getItem('add_place_draft')
      if (draft) return JSON.parse(draft)
    } catch {}
    return null
  }
  const draft = getInitialState()

  const [newPlace, setNewPlace] = useState({
    name: draft?.name || '',
    category: draft?.category || 'eat',
    address: draft?.address || '',
    description: draft?.description || '',
    website: draft?.website || '',
    opening_hours: draft?.opening_hours || '',
    is_pet_friendly: draft?.is_pet_friendly || false,
    vegan_level: (draft?.vegan_level || 'fully_vegan') as 'fully_vegan' | 'mostly_vegan' | 'vegan_friendly' | 'vegan_options',
    latitude: draft?.latitude || 0,
    longitude: draft?.longitude || 0,
    city: draft?.city || defaultCity || ('' as string | undefined),
    country: draft?.country || defaultCountry || ('' as string | undefined),
  })

  const [placeImages, setPlaceImages] = useState<string[]>(draft?.images || [])
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [addressSearchQuery, setAddressSearchQuery] = useState(draft?.addressQuery || draft?.address || '')
  const [addressSearchResults, setAddressSearchResults] = useState<any[]>([])
  const [showAddressResults, setShowAddressResults] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Save draft to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem('add_place_draft', JSON.stringify({
        ...newPlace,
        addressQuery: addressSearchQuery,
        images: placeImages,
      }))
    } catch {}
  }, [newPlace, placeImages, addressSearchQuery])

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

  const handleAddressSelect = async (result: any) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)

    // Get English address via reverse geocoding (translates Cyrillic etc.)
    let city = result.address?.city || result.address?.town || result.address?.village || undefined
    let country = result.address?.country || undefined
    let address = result.display_name

    try {
      const enResult = await geocodingService.reverse(lat, lon)
      if (enResult) {
        address = enResult.display_name || address
        city = enResult.address?.city || enResult.address?.town || enResult.address?.village || city
        country = enResult.address?.country || country
      }
    } catch {}

    setNewPlace(prev => ({ ...prev, address, latitude: lat, longitude: lon, city, country }))
    setAddressSearchQuery(address)
    setShowAddressResults(false)
  }

  const [successPlace, setSuccessPlace] = useState<{ name: string; slug: string; id: string } | null>(null)

  const generateSlug = (name: string, city?: string) => {
    const base = [name, city].filter(Boolean).join(' ')
    return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!newPlace.latitude || !newPlace.longitude) {
      setSubmitError('Please select an address from the search results')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const slug = generateSlug(newPlace.name, newPlace.city as string | undefined)
      const mainImage = placeImages.length > 0 ? placeImages[0] : null

      const { data: insertedPlace, error } = await supabase
        .from('places')
        .insert({
          ...newPlace,
          slug,
          vegan_level: newPlace.vegan_level,
          images: placeImages,
          main_image_url: mainImage,
          created_by: user.id,
          city: newPlace.city || null,
          country: newPlace.country || null,
        })
        .select(`*, users(id, username, first_name, last_name), favorite_places(id, user_id)`)
        .single()
      if (error) throw error

      // Auto-create a linked post via API (bypasses RLS issues for non-admin users)
      try {
        await fetch('/api/places/' + insertedPlace.id + '/auto-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: newPlace.description || `Check out ${newPlace.name}`,
            images: placeImages,
          }),
        })
      } catch {}

      // Trigger cache revalidation for directory pages
      try {
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city: newPlace.city, country: newPlace.country }),
        })
      } catch {}

      sessionStorage.removeItem('add_place_draft')
      track('place_added', { city: newPlace.city, country: newPlace.country, category: newPlace.category })
      onPlaceAdded?.(insertedPlace)
      setSuccessPlace({ name: insertedPlace.name, slug: insertedPlace.slug || insertedPlace.id, id: insertedPlace.id })
    } catch (error: any) {
      console.error('Error adding place:', error)
      const msg = error?.message || error?.code || 'Unknown error'
      if (msg.includes('row-level security') || msg.includes('RLS') || msg.includes('policy')) {
        setSubmitError('Permission denied. Please make sure you are logged in and try again.')
      } else if (msg.includes('duplicate') || msg.includes('unique')) {
        setSubmitError('A place with this name already exists in this location.')
      } else {
        setSubmitError(`Failed to add place: ${msg}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (successPlace) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[100]" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
        <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-sm editorial-shadow text-center" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🌿</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">Place Added!</h3>
          <p className="text-sm text-on-surface-variant mb-4">
            <strong>{successPlace.name}</strong> has been added to PlantsPack.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href={`/place/${successPlace.slug}`}
              className="w-full px-4 py-2 silk-gradient text-on-primary-btn rounded-lg font-medium text-sm text-center"
            >
              View Place
            </a>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 ghost-border rounded-lg text-on-surface-variant hover:bg-surface-container-low text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[100]" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
        <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-sm editorial-shadow" onClick={e => e.stopPropagation()}>
          <p className="text-on-surface-variant text-center mb-4">Please sign in to add a place.</p>
          <button onClick={onClose} className="w-full px-4 py-2 ghost-border rounded-full text-on-surface-variant hover:bg-surface-container-low">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[100]" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div className="bg-surface-container-lowest sm:rounded-lg p-6 w-full max-w-md max-h-[100vh] sm:max-h-[90vh] overflow-y-auto editorial-shadow text-left fixed sm:relative inset-0 sm:inset-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-on-surface">Add New Place</h2>
          <button onClick={onClose} className="text-outline hover:text-on-surface-variant">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="p-3 bg-error/5 border border-error/15 rounded-lg">
              <p className="text-sm text-error">{submitError}</p>
            </div>
          )}
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

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Opening Hours</label>
            <textarea
              value={newPlace.opening_hours}
              onChange={(e) => setNewPlace(prev => ({ ...prev, opening_hours: e.target.value }))}
              placeholder="e.g. Mo-Fr 09:00-18:00; Sa 10:00-16:00"
              rows={2}
              className="w-full px-3 py-2 bg-surface-container-low border-0 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none resize-none text-sm"
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
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Vegan Level</label>
            <div className="space-y-2">
              {([
                { value: 'fully_vegan', label: '100% Vegan', desc: 'Everything on the menu is vegan — zero animal products' },
                { value: 'mostly_vegan', label: 'Mostly Vegan', desc: 'Nearly all vegan, with a small number of non-vegan items' },
                { value: 'vegan_friendly', label: 'Vegan-Friendly', desc: 'Non-vegan place with a solid vegan section or multiple dedicated dishes' },
                { value: 'vegan_options', label: 'Has Vegan Options', desc: 'Some vegan items available, but not a vegan-focused place' },
              ] as const).map(({ value, label, desc }) => (
                <label key={value} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="add_modal_vegan_level"
                    value={value}
                    checked={newPlace.vegan_level === value}
                    onChange={() => setNewPlace(prev => ({ ...prev, vegan_level: value }))}
                    className="text-primary focus:ring-primary mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-on-surface">{label}</span>
                    <p className="text-xs text-on-surface-variant">{desc}</p>
                  </div>
                </label>
              ))}
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
