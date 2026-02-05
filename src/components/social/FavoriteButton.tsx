'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

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
  const [favorites, setFavorites] = useState(initialFavorites)
  const [loading, setLoading] = useState(false)

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

    try {
      const tableName = entityType === 'place' ? 'favorite_places' : 'favorite_posts'
      const columnName = entityType === 'place' ? 'place_id' : 'post_id'

      if (isFavorited) {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq(columnName, entityId)
          .eq('user_id', user.id)

        if (error) throw error

        setFavorites(prev => prev.filter(fav => fav.user_id !== user.id))
      } else {
        const { data, error } = await supabase
          .from(tableName)
          .insert({ [columnName]: entityId, user_id: user.id })
          .select()
          .single()

        if (error) throw error

        setFavorites(prev => [...prev, data])
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Failed to update favorite. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`
        inline-flex items-center gap-2 transition-colors
        ${isFavorited
          ? 'text-red-600 hover:text-red-700'
          : 'text-gray-400 hover:text-red-600'
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
