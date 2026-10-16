'use client'

import { useEffect, useRef } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useSavedPlaces } from '@/lib/saved-places-context'
import { useAuthSheet } from '@/components/auth/AuthSheet'
import { clearPendingAction, peekPendingAction } from '@/lib/pending-action'

interface SavePlaceButtonProps {
  placeId: string
  placeName: string
  /** GA4 source for the sign-up prompt and the save event: card_save, dish_save. */
  from: string
  className?: string
  size?: 'sm' | 'md'
}

/**
 * Heart button for list and dish-page cards. Visible to guests: a click
 * opens the sign-in sheet with the save as the pending action, and this
 * button completes it after sign-in (the page reloads on the same URL for
 * OAuth, or stays mounted for email sign-in).
 */
export default function SavePlaceButton({ placeId, placeName, from, className = '', size = 'md' }: SavePlaceButtonProps) {
  const { user } = useAuth()
  const { ready, isSaved, toggle, save } = useSavedPlaces()
  const { openAuthSheet } = useAuthSheet()
  const saved = isSaved(placeId)
  const ranPending = useRef(false)

  useEffect(() => {
    if (!user || !ready || ranPending.current) return
    const p = peekPendingAction()
    if (p?.type === 'save' && p.placeId === placeId) {
      ranPending.current = true
      clearPendingAction()
      save(placeId, from)
    }
  }, [user, ready, placeId, save, from])

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      openAuthSheet({ reason: `Sign in to save ${placeName}`, from, pending: { type: 'save', placeId } })
      return
    }
    toggle(placeId, from)
  }

  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${placeName} from saved places` : `Save ${placeName}`}
      title={saved ? 'Saved' : 'Save'}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
        saved ? 'text-red-500 hover:text-red-600 bg-red-50' : 'text-on-surface-variant hover:text-red-500 hover:bg-primary/10'
      } ${className}`}
    >
      <Heart className={`${icon} ${saved ? 'fill-current' : ''}`} aria-hidden />
    </button>
  )
}
