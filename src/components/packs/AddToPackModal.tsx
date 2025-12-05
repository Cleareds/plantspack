'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { PackWithStats } from '@/types/packs'
import { X, Package, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface AddToPackModalProps {
  postId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AddToPackModal({ postId, isOpen, onClose, onSuccess }: AddToPackModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [packs, setPacks] = useState<PackWithStats[]>([])
  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(new Set())
  const [existingPacks, setExistingPacks] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isOpen && user) {
      fetchPacks()
    }
  }, [isOpen, user])

  const fetchPacks = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch packs where user is admin or moderator
      const response = await fetch(`/api/packs?creator=${user?.id}&limit=100`)
      const data = await response.json()

      if (response.ok) {
        // Filter to only include packs where user is admin or moderator
        const manageablePacks = data.packs.filter(
          (pack: PackWithStats) => pack.user_role === 'admin' || pack.user_role === 'moderator'
        )
        setPacks(manageablePacks)

        // Check which packs already contain this post
        const existingPackIds = new Set<string>()
        await Promise.all(
          manageablePacks.map(async (pack: PackWithStats) => {
            try {
              const postsResponse = await fetch(`/api/packs/${pack.id}/posts?limit=1000`)
              const postsData = await postsResponse.json()

              if (postsResponse.ok && postsData.posts) {
                const hasPost = postsData.posts.some((pp: any) => pp.post_id === postId)
                if (hasPost) {
                  existingPackIds.add(pack.id)
                }
              }
            } catch (err) {
              console.error(`Error checking pack ${pack.id}:`, err)
            }
          })
        )
        setExistingPacks(existingPackIds)
      } else {
        setError(data.error || 'Failed to load packs')
      }
    } catch (err) {
      console.error('Error fetching packs:', err)
      setError('An error occurred while loading packs')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePack = (packId: string) => {
    const newSelected = new Set(selectedPacks)
    if (newSelected.has(packId)) {
      newSelected.delete(packId)
    } else {
      newSelected.add(packId)
    }
    setSelectedPacks(newSelected)
  }

  const handleSubmit = async () => {
    if (selectedPacks.size === 0) {
      setError('Please select at least one pack')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      const results = await Promise.allSettled(
        Array.from(selectedPacks).map(async (packId) => {
          const response = await fetch(`/api/packs/${packId}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId })
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to add post')
          }

          return packId
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (successful > 0) {
        setSuccess(`Added to ${successful} pack${successful > 1 ? 's' : ''}`)
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 1500)
      }

      if (failed > 0) {
        setError(`Failed to add to ${failed} pack${failed > 1 ? 's' : ''}`)
      }
    } catch (err) {
      console.error('Error adding to packs:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Add to Pack</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading your packs...</p>
            </div>
          )}

          {!loading && packs.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">You don&apos;t manage any packs yet</p>
              <p className="text-sm text-gray-500">
                Create a pack to start curating content
              </p>
            </div>
          )}

          {!loading && packs.length > 0 && (
            <div className="space-y-2">
              {packs.map((pack) => {
                const isInPack = existingPacks.has(pack.id)
                const isSelected = selectedPacks.has(pack.id)

                return (
                  <button
                    key={pack.id}
                    onClick={() => !isInPack && handleTogglePack(pack.id)}
                    disabled={isInPack}
                    className={`w-full p-3 border-2 rounded-lg text-left transition-colors ${
                      isInPack
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {isInPack ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <div
                            className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-green-600 bg-green-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {pack.title}
                          </h3>
                          {pack.user_role === 'admin' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                        </div>

                        {pack.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {pack.description}
                          </p>
                        )}

                        {isInPack && (
                          <p className="text-xs text-green-600 mt-1">
                            Already in this pack
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && packs.length > 0 && (
          <div className="p-4 border-t border-gray-200 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedPacks.size === 0}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {submitting
                  ? 'Adding...'
                  : selectedPacks.size > 0
                  ? `Add to ${selectedPacks.size} pack${selectedPacks.size > 1 ? 's' : ''}`
                  : 'Select packs'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
