'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Check, Circle, MapPinned, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface Pack {
  id: string
  title: string
  description: string | null
  user_role: 'admin' | 'moderator' | 'member' | null
  categories?: string[]
}

interface AddToPackButtonProps {
  placeId: string
  placeName: string
}

export default function AddToPackButton({ placeId, placeName }: AddToPackButtonProps) {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [packs, setPacks] = useState<Pack[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [newTripName, setNewTripName] = useState('')
  const [creatingTrip, setCreatingTrip] = useState(false)
  const [packPlaceIds, setPackPlaceIds] = useState<Record<string, string>>({})

  const closeModal = useCallback(() => setShowModal(false), [])

  // Escape key + click outside
  useEffect(() => {
    if (!showModal) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showModal, closeModal])

  useEffect(() => {
    if (showModal && user) fetchUserPacks()
  }, [showModal, user])

  const fetchUserPacks = async () => {
    if (!user) return
    try {
      setLoading(true)
      // Fetch packs where user is admin/moderator
      const { data, error } = await supabase
        .from('pack_members')
        .select(`
          pack_id,
          role,
          packs!inner (
            id, title, description, categories, is_published
          )
        `)
        .eq('user_id', user.id)
        .in('role', ['admin', 'moderator'])

      if (error) throw error

      const userPacks = (data || [])
        .filter((pm: any) => pm.packs)
        .map((pm: any) => ({
          id: pm.packs.id,
          title: pm.packs.title,
          description: pm.packs.description,
          user_role: pm.role,
          categories: pm.packs.categories || [],
        }))

      setPacks(userPacks)

      // Check which packs already contain this place
      if (userPacks.length > 0) {
        const { data: existing } = await supabase
          .from('pack_places')
          .select('pack_id, id')
          .eq('place_id', placeId)
          .in('pack_id', userPacks.map(p => p.id))

        const existingMap = new Set((existing || []).map((e: any) => e.pack_id))
        setAdded(existingMap)
        // Store pack_place IDs for removal
        const idMap: Record<string, string> = {}
        for (const e of (existing || [])) idMap[e.pack_id] = e.id
        setPackPlaceIds(idMap)
      }
    } catch (error) {
      console.error('Error fetching packs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePack = async (packId: string) => {
    const isInPack = added.has(packId)
    setAdding(packId)

    try {
      if (isInPack) {
        // Remove from pack
        const packPlaceId = packPlaceIds[packId]
        if (!packPlaceId) return
        const response = await fetch(`/api/packs/${packId}/places/${packPlaceId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (response.ok) {
          setAdded(prev => { const next = new Set(prev); next.delete(packId); return next })
          const newIds = { ...packPlaceIds }
          delete newIds[packId]
          setPackPlaceIds(newIds)
        }
      } else {
        // Add to pack
        const response = await fetch(`/api/packs/${packId}/places`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ place_id: placeId, is_pinned: false })
        })

        if (response.ok) {
          const data = await response.json()
          setAdded(prev => new Set(prev).add(packId))
          if (data.packPlace?.id) setPackPlaceIds(prev => ({ ...prev, [packId]: data.packPlace.id }))
        } else {
          const error = await response.json()
          if (error.error?.includes('already')) {
            setAdded(prev => new Set(prev).add(packId))
          } else {
            alert(error.error || 'Failed to add place')
          }
        }
      }
    } catch {
      alert('Failed. Please try again.')
    } finally {
      setAdding(null)
    }
  }

  const handleCreateTrip = async () => {
    if (!newTripName.trim() || newTripName.trim().length < 3) return
    setCreatingTrip(true)

    try {
      const res = await fetch('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newTripName.trim(),
          is_published: false,
          categories: ['Trip'],
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to create trip')
        return
      }

      const { pack } = await res.json()

      // Add the current place to the new trip
      await fetch(`/api/packs/${pack.id}/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ place_id: placeId, is_pinned: false }),
      })

      setPacks(prev => [{ id: pack.id, title: pack.title, description: null, user_role: 'admin', categories: ['Trip'] }, ...prev])
      setAdded(prev => new Set(prev).add(pack.id))
      setNewTripName('')
    } catch {
      alert('Failed to create trip')
    } finally {
      setCreatingTrip(false)
    }
  }

  if (!user) return null

  const trips = packs.filter(p => p.categories?.some(c => c.toLowerCase() === 'trip'))
  const regularPacks = packs.filter(p => !p.categories?.some(c => c.toLowerCase() === 'trip'))

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 silk-gradient text-on-primary rounded-md hover:opacity-90 font-medium transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add to Pack / Trip
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col editorial-shadow" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
              <h2 className="text-lg font-bold text-on-surface">Save Place</h2>
              <button onClick={closeModal} className="text-on-surface-variant hover:text-on-surface">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Create new trip */}
              <div className="px-6 py-4 border-b border-outline-variant/10">
                <div className="flex items-center gap-2 mb-2">
                  <MapPinned className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-on-surface">New Trip</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTrip()}
                    placeholder="e.g. Barcelona June 2026"
                    className="flex-1 px-3 py-2 bg-surface-container-low border-0 ghost-border rounded-lg text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none"
                  />
                  <button
                    onClick={handleCreateTrip}
                    disabled={creatingTrip || newTripName.trim().length < 3}
                    className="px-3 py-2 silk-gradient text-on-primary-btn rounded-lg text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-colors"
                  >
                    {creatingTrip ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </div>
              ) : (
                <div className="px-6 py-3">
                  {trips.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">My Trips</p>
                      <div className="space-y-2">
                        {trips.map(pack => (
                          <button
                            key={pack.id}
                            onClick={() => handleTogglePack(pack.id)}
                            disabled={adding === pack.id}
                            className="w-full text-left p-3 ghost-border rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-60"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <MapPinned className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="text-sm font-medium text-on-surface truncate">{pack.title}</span>
                              </div>
                              {adding === pack.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                              ) : added.has(pack.id) ? (
                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-outline flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {regularPacks.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">My Packs</p>
                      <div className="space-y-2">
                        {regularPacks.map(pack => (
                          <button
                            key={pack.id}
                            onClick={() => handleTogglePack(pack.id)}
                            disabled={adding === pack.id}
                            className="w-full text-left p-3 ghost-border rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-60"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-on-surface truncate">{pack.title}</p>
                                {pack.description && (
                                  <p className="text-[11px] text-on-surface-variant truncate">{pack.description}</p>
                                )}
                              </div>
                              {adding === pack.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                              ) : added.has(pack.id) ? (
                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-outline flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {trips.length === 0 && regularPacks.length === 0 && (
                    <p className="text-sm text-on-surface-variant text-center py-4">
                      Create your first trip above to save this place!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
