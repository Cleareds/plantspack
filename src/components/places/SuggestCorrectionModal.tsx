'use client'

import { useState, useEffect } from 'react'
import { X, Send, Loader2, CheckCircle, Camera } from 'lucide-react'
import ImageUploader from '../ui/ImageUploader'

interface SuggestCorrectionModalProps {
  place: {
    id: string
    name: string
    address: string
    description: string | null
    category: string
    website: string | null
    phone: string | null
    opening_hours?: string | Record<string, string> | null
    vegan_level?: string
  }
  isOpen: boolean
  onClose: () => void
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  address: 'Address',
  description: 'Description',
  category: 'Category',
  website: 'Website',
  phone: 'Phone',
  opening_hours: 'Opening Hours',
  vegan_level: 'Vegan Level',
}

export default function SuggestCorrectionModal({ place, isOpen, onClose }: SuggestCorrectionModalProps) {
  const [corrections, setCorrections] = useState<Record<string, any>>({})
  const [newImages, setNewImages] = useState<string[]>([])
  const [showUploader, setShowUploader] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const editableFields = ['name', 'address', 'description', 'website', 'phone', 'opening_hours', 'vegan_level']

  const handleFieldChange = (field: string, value: string) => {
    const currentValue = (place as any)[field] || ''
    if (value === currentValue || value === '') {
      const next = { ...corrections }
      delete next[field]
      setCorrections(next)
    } else {
      setCorrections(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = async () => {
    const hasChanges = Object.keys(corrections).length > 0 || newImages.length > 0
    if (!hasChanges) {
      setError('Please make at least one change or add photos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const allCorrections = { ...corrections }
      if (newImages.length > 0) {
        allCorrections.append_images = newImages
      }

      const res = await fetch(`/api/places/${place.id}/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrections: allCorrections, note: note.trim() || null }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setSuccess(true)
      setTimeout(() => { onClose(); setSuccess(false); setCorrections({}); setNote('') }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit correction')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-surface-container-lowest rounded-3xl editorial-shadow p-8 text-center z-10">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-on-surface text-lg">Thank you!</h3>
          <p className="text-sm text-on-surface-variant mt-1">Your correction has been submitted for review.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface-container-lowest rounded-3xl editorial-shadow max-w-lg w-full max-h-[90vh] overflow-y-auto z-10">
        <div className="sticky top-0 bg-surface-container-lowest rounded-t-3xl flex items-center justify-between px-6 py-4 border-b border-outline-variant/15 z-10">
          <div>
            <h2 className="font-headline font-bold text-on-surface text-lg tracking-tight">Suggest a Correction</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{place.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-xl transition-colors">
            <X className="h-5 w-5 text-on-surface-variant" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <p className="text-sm text-on-surface-variant">
            Edit the fields you want to correct. Only changed fields will be submitted.
          </p>

          {editableFields.map(field => {
            const currentValue = (place as any)[field] || ''
            const isChanged = corrections[field] !== undefined
            return (
              <div key={field}>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  {FIELD_LABELS[field]}
                  {isChanged && <span className="ml-1.5 text-[10px] text-primary font-bold">CHANGED</span>}
                </label>
                {field === 'description' ? (
                  <textarea
                    defaultValue={currentValue}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    rows={3}
                    className={`w-full p-2.5 bg-surface-container-low border-0 rounded-lg text-sm resize-none focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border ${isChanged ? 'ring-1 ring-primary/30' : ''}`}
                  />
                ) : field === 'vegan_level' ? (
                  <select
                    defaultValue={currentValue}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    className={`w-full p-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border ${isChanged ? 'ring-1 ring-primary/30' : ''}`}
                  >
                    <option value="fully_vegan">100% Vegan</option>
                    <option value="mostly_vegan">Mostly Vegan</option>
                    <option value="vegan_friendly">Vegan-Friendly</option>
                    <option value="vegan_options">Has Vegan Options</option>
                  </select>
                ) : field === 'opening_hours' ? (
                  <textarea
                    defaultValue={currentValue}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    rows={2}
                    placeholder="Mo-Fr 09:00-18:00; Sa 10:00-16:00"
                    className={`w-full p-2.5 bg-surface-container-low border-0 rounded-lg text-sm resize-none focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border ${isChanged ? 'ring-1 ring-primary/30' : ''}`}
                  />
                ) : (
                  <input
                    type={field === 'website' ? 'url' : field === 'phone' ? 'tel' : 'text'}
                    defaultValue={currentValue}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    className={`w-full p-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border ${isChanged ? 'ring-1 ring-primary/30' : ''}`}
                  />
                )}
              </div>
            )
          })}

          {/* Add photos */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
              Add Photos
              {newImages.length > 0 && <span className="ml-1.5 text-[10px] text-primary font-bold">{newImages.length} ADDED</span>}
            </label>
            {newImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {newImages.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 bg-error text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {showUploader ? (
              <ImageUploader onImagesChange={(urls) => setNewImages(prev => [...prev, ...urls])} maxImages={5} />
            ) : (
              <button
                type="button"
                onClick={() => setShowUploader(true)}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
              >
                <Camera className="h-4 w-4" />
                Upload photos
              </button>
            )}
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this correction is needed..."
              className="w-full p-2.5 bg-surface-container-low border-0 rounded-lg text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-on-surface-variant">
              {Object.keys(corrections).length + (newImages.length > 0 ? 1 : 0)} change{Object.keys(corrections).length + (newImages.length > 0 ? 1 : 0) !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-xl font-medium transition-colors text-sm">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || (Object.keys(corrections).length === 0 && newImages.length === 0)}
                className="flex items-center gap-2 silk-gradient hover:opacity-90 disabled:opacity-50 text-on-primary-btn px-5 py-2.5 rounded-xl font-medium transition-colors text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Correction
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
