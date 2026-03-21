'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface Pack {
  id: string
  title: string
  description: string | null
  user_role: 'admin' | 'moderator' | 'member' | null
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

  useEffect(() => {
    if (showModal && user) {
      fetchUserPacks()
    }
  }, [showModal, user])

  const fetchUserPacks = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pack_members')
        .select(`
          pack_id,
          role,
          packs!inner (
            id,
            title,
            description
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
          user_role: pm.role
        }))

      setPacks(userPacks)
    } catch (error) {
      console.error('Error fetching packs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToPack = async (packId: string) => {
    try {
      setAdding(packId)
      const response = await fetch(`/api/packs/${packId}/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          is_pinned: false
        })
      })

      if (response.ok) {
        // Show success feedback
        alert(`"${placeName}" added to pack successfully!`)
        setShowModal(false)
      } else {
        const error = await response.json()
        if (error.error?.includes('already in pack')) {
          alert('This place is already in the pack')
        } else {
          alert(error.error || 'Failed to add place to pack')
        }
      }
    } catch (error) {
      console.error('Error adding place to pack:', error)
      alert('Failed to add place to pack. Please try again.')
    } finally {
      setAdding(null)
    }
  }

  if (!user) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 silk-gradient text-on-primary rounded-md hover:opacity-90 font-medium transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add to Pack
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/15">
              <h2 className="text-xl font-semibold text-on-surface">Add to Pack</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-outline hover:text-on-surface-variant transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-on-surface-variant">Loading your packs...</p>
                </div>
              ) : packs.length === 0 ? (
                <div className="text-center py-8 text-outline">
                  <p className="mb-4">You don't have any packs where you can add places.</p>
                  <p className="text-sm">Only pack admins and moderators can add places.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {packs.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => handleAddToPack(pack.id)}
                      disabled={adding === pack.id}
                      className="w-full text-left p-4 ghost-border rounded-lg hover:border-primary hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-on-surface mb-1">{pack.title}</h3>
                          {pack.description && (
                            <p className="text-sm text-on-surface-variant line-clamp-2">
                              {pack.description}
                            </p>
                          )}
                        </div>
                        {adding === pack.id ? (
                          <div className="flex-shrink-0 ml-3">
                            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <Check className="flex-shrink-0 ml-3 h-5 w-5 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
