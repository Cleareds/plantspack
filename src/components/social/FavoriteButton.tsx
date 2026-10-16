'use client'

import { useState, useEffect, useRef } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useAuthSheet } from '@/components/auth/AuthSheet'
import { clearPendingAction, peekPendingAction } from '@/lib/pending-action'
import { track } from '@/lib/analytics'

interface FavoriteButtonProps {
  entityType: 'place' | 'post'
  entityId: string
  initialFavorites: { id: string; user_id: string }[]
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  className?: string
}

export default function FavoriteButton({
  entityType,
  entityId,
  initialFavorites,
  size = 'md',
  showCount = false,
  className = ''
}: FavoriteButtonProps) {
  const { user } = useAuth()
  const { openAuthSheet } = useAuthSheet()
  const [favorites, setFavorites] = useState(initialFavorites)
  const [loading, setLoading] = useState(false)
  const ranPending = useRef(false)

  const isFavorited = favorites.some(fav => fav.user_id === user?.id)
  const favoriteCount = favorites.length

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const handleToggleFavorite = async () => {
    if (!user || loading) return

    setLoading(true)

    // Optimistic update
    const wasAlreadyFavorited = isFavorited
    if (wasAlreadyFavorited) {
      setFavorites(prev => prev.filter(fav => fav.user_id !== user.id))
    } else {
      setFavorites(prev => [...prev, { id: 'temp', user_id: user.id }])
    }

    try {
      const tableName = entityType === 'place' ? 'favorite_places' : 'favorite_posts'
      const columnName = entityType === 'place' ? 'place_id' : 'post_id'

      if (wasAlreadyFavorited) {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq(columnName, entityId)
          .eq('user_id', user.id)

        if (error) {
          // Revert optimistic update on error
          setFavorites(prev => [...prev, { id: 'temp', user_id: user.id }])
          throw error
        }
      } else {
        const { data, error } = await supabase
          .from(tableName)
          .insert({ [columnName]: entityId, user_id: user.id })
          .select()
          .single()

        if (error) {
          // Check if it's a duplicate key error (already favorited)
          if (error.code === '23505') {
            // Already favorited, just fetch the current state
            const { data: favorites } = await supabase
              .from(tableName)
              .select('id, user_id')
              .eq(columnName, entityId)

            setFavorites(favorites || [])
            return
          }

          // Revert optimistic update on other errors
          setFavorites(prev => prev.filter(fav => fav.user_id !== user.id))
          throw error
        }

        // Update with real data
        setFavorites(prev => prev.filter(fav => fav.id !== 'temp').concat(data))
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setLoading(false)
    }
  }

  // A guest who saved before signing in: complete it once, then forget it.
  useEffect(() => {
    if (!user || entityType !== 'place' || ranPending.current) return
    const p = peekPendingAction()
    if (p?.type === 'save' && p.placeId === entityId) {
      ranPending.current = true
      clearPendingAction()
      if (!favorites.some(fav => fav.user_id === user.id)) {
        track('place_saved', { from: 'place_save' })
        handleToggleFavorite()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, entityType, entityId])

  if (!user) {
    // Posts: the feed is dormant, keep the old behaviour. Places: ask to sign in.
    if (entityType !== 'place') return null
    return (
      <button
        type="button"
        onClick={() => openAuthSheet({ reason: 'Sign in to save this place', from: 'place_save', pending: { type: 'save', placeId: entityId } })}
        className={`inline-flex items-center gap-2 transition-colors text-outline hover:text-red-500 ${className}`}
        title="Save this place"
      >
        <Heart className={sizeClasses[size]} />
        {showCount && favoriteCount > 0 && <span className="text-sm font-medium">{favoriteCount}</span>}
      </button>
    )
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`
        inline-flex items-center gap-2 transition-colors
        ${isFavorited
          ? 'text-red-500 hover:text-red-600'
          : 'text-outline hover:text-red-500'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={`${sizeClasses[size]} ${isFavorited ? 'fill-current' : ''}`}
      />
      {showCount && favoriteCount > 0 && (
        <span className="text-sm font-medium">{favoriteCount}</span>
      )}
    </button>
  )
}
