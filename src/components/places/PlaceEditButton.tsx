'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import EditPlace from './EditPlace'

interface PlaceEditButtonProps {
  place: {
    id: string
    name: string
    description: string | null
    category: string
    address: string
    website: string | null
    phone: string | null
    is_pet_friendly: boolean
    images: string[]
    main_image_url?: string | null
    tags?: string[]
    created_by: string
    owner?: { user_id: string } | null
  }
}

export default function PlaceEditButton({ place }: PlaceEditButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)

  if (!user) return null

  const canEdit = user.id === place.created_by || user.id === place.owner?.user_id
  if (!canEdit) return null

  return (
    <>
      <button
        onClick={() => setShowEdit(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-surface-variant ghost-border hover:bg-surface-container-low rounded-xl transition-colors"
      >
        <Pencil className="h-4 w-4" />
        <span>Edit</span>
      </button>

      <EditPlace
        place={place}
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => router.refresh()}
      />
    </>
  )
}
