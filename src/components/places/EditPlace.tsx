'use client'

import { useState } from 'react'
import { X, Save, Star, Loader2 } from 'lucide-react'
import ImageUploader from '../ui/ImageUploader'

interface EditPlaceProps {
  place: {
    id: string
    name: string
    description: string | null
    category: string
    address: string
    website: string | null
    phone: string | null
    opening_hours?: string | null
    is_pet_friendly: boolean
    images: string[]
    main_image_url?: string | null
    tags?: string[]
  }
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export default function EditPlace({ place, isOpen, onClose, onSaved }: EditPlaceProps) {
  const [name, setName] = useState(place.name)
  const [description, setDescription] = useState(place.description || '')
  const [category, setCategory] = useState(place.category)
  const [website, setWebsite] = useState(place.website || '')
  const [phone, setPhone] = useState(place.phone || '')
  const [openingHours, setOpeningHours] = useState(typeof place.opening_hours === 'string' ? place.opening_hours : '')
  const [isPetFriendly, setIsPetFriendly] = useState(place.is_pet_friendly)
  const [existingImages, setExistingImages] = useState<string[]>(place.images || [])
  const [newImages, setNewImages] = useState<string[]>([])
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(place.main_image_url || null)
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const allImages = [...existingImages, ...newImages]

  const handleRemoveImage = (url: string) => {
    setExistingImages(prev => prev.filter(u => u !== url))
    setNewImages(prev => prev.filter(u => u !== url))
    if (mainImageUrl === url) setMainImageUrl(null)
  }

  const handleNewImages = (urls: string[]) => {
    setNewImages(prev => [...prev, ...urls])
  }

  const handleSetMainImage = (url: string) => {
    setMainImageUrl(mainImageUrl === url ? null : url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/places/${place.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category,
          website: website.trim() || null,
          phone: phone.trim() || null,
          opening_hours: openingHours.trim() || null,
          is_pet_friendly: isPetFriendly,
          images: allImages,
          main_image_url: mainImageUrl,
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update place')
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update place')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface-container-lowest rounded-3xl editorial-shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-lowest rounded-t-3xl flex items-center justify-between px-6 py-4 border-b border-outline-variant/15 z-10">
          <h2 className="font-headline font-bold text-on-surface text-lg tracking-tight">Edit Place</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-xl transition-colors">
            <X className="h-5 w-5 text-on-surface-variant" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border"
              >
                <option value="eat">Eat</option>
                <option value="hotel">Stay</option>
                <option value="store">Store</option>
                <option value="event">Event</option>
                <option value="organisation">Organisation</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-surface-container-low border-0 rounded-lg text-sm resize-none focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border"
              />
            </div>

            {/* Website & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border"
                />
              </div>
            </div>

            {/* Opening Hours */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Opening Hours</label>
              <textarea
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="e.g. Mo-Fr 09:00-18:00; Sa 10:00-16:00; Su closed"
                rows={2}
                className="w-full p-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border resize-none"
              />
              <p className="text-[10px] text-on-surface-variant mt-1">Separate days with semicolons, e.g. Mo-Fr 09:00-18:00; Sa 10:00-16:00</p>
            </div>

            {/* Pet Friendly */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPetFriendly}
                onChange={(e) => setIsPetFriendly(e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="text-sm text-on-surface-variant">Pet friendly</span>
            </label>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Images ({allImages.length})
              </label>

              {/* Existing + New images grid */}
              {allImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {allImages.map((url) => (
                    <div key={url} className="relative group">
                      <img
                        src={url}
                        alt=""
                        className={`h-20 w-20 rounded-lg object-cover ${mainImageUrl === url ? 'ring-2 ring-primary' : ''}`}
                      />
                      <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleSetMainImage(url)}
                          className={`p-0.5 rounded-full transition-colors ${mainImageUrl === url ? 'bg-primary text-white' : 'bg-black/50 text-white hover:bg-primary'}`}
                          title={mainImageUrl === url ? 'Main image' : 'Set as main'}
                        >
                          <Star className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(url)}
                          className="bg-error text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {mainImageUrl === url && (
                        <div className="absolute bottom-0.5 left-0.5 bg-primary text-white text-[9px] px-1 rounded font-medium">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add more images */}
              <button
                type="button"
                onClick={() => setShowImageUploader(!showImageUploader)}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                + Add photos
              </button>

              {showImageUploader && (
                <div className="mt-2">
                  <ImageUploader onImagesChange={handleNewImages} maxImages={10} />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-xl font-medium transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex items-center gap-2 silk-gradient hover:opacity-90 disabled:opacity-50 text-on-primary-btn px-5 py-2.5 rounded-xl font-medium transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
