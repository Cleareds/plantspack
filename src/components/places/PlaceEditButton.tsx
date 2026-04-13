'use client'

import { useState } from 'react'
import { Pencil, Trash2, MessageSquarePlus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import EditPlace from './EditPlace'
import SuggestCorrectionModal from './SuggestCorrectionModal'

interface PlaceEditButtonProps {
  place: {
    id: string
    name: string
    description: string | null
    category: string
    address: string
    website: string | null
    phone: string | null
    opening_hours?: string | Record<string, string> | null
    is_pet_friendly: boolean
    images: string[]
    main_image_url?: string | null
    tags?: string[]
    created_by: string
    owner?: { user_id: string } | null
    vegan_level?: string
  }
}

export default function PlaceEditButton({ place }: PlaceEditButtonProps) {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!user) return null

  const isAdmin = (profile as any)?.role === 'admin'
  const isCreator = user.id === place.created_by
  const isOwner = user.id === place.owner?.user_id
  const isSupporter = (profile as any)?.subscription_tier === 'medium'

  // Direct edit: admin, creator, owner, or supporter
  const canDirectEdit = isAdmin || isCreator || isOwner || isSupporter
  // Delete: only admin, creator, or owner
  const canDelete = isAdmin || isCreator || isOwner

  const handleDelete = async () => {
    if (!confirm(`Delete "${place.name}"? This will also remove any linked posts. This cannot be undone.`)) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/places/${place.id}`, { method: 'DELETE' })
      if (response.ok) {
        router.push('/vegan-places')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete place')
      }
    } catch {
      alert('Failed to delete place. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {canDirectEdit ? (
        <button
          onClick={() => setShowEdit(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-surface-variant ghost-border hover:bg-surface-container-low rounded-xl transition-colors"
        >
          <Pencil className="h-4 w-4" />
          <span>Edit</span>
        </button>
      ) : (
        <button
          onClick={() => setShowSuggest(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary ghost-border hover:bg-primary/5 rounded-xl transition-colors"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>Suggest Correction</span>
        </button>
      )}

      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 ghost-border hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          <span>{deleting ? 'Deleting...' : 'Delete'}</span>
        </button>
      )}

      <EditPlace
        place={place}
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => router.refresh()}
      />

      <SuggestCorrectionModal
        place={place}
        isOpen={showSuggest}
        onClose={() => setShowSuggest(false)}
      />
    </>
  )
}
