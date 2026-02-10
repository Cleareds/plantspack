'use client'

import { useState, useEffect } from 'react'
import { Heart, Lightbulb, Sparkles, Brain } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export type ReactionType = 'like' | 'helpful' | 'inspiring' | 'thoughtful'

interface ReactionCounts {
  like: number
  helpful: number
  inspiring: number
  thoughtful: number
}

interface UserReactions {
  like: boolean
  helpful: boolean
  inspiring: boolean
  thoughtful: boolean
}

interface ReviewReactionsProps {
  reviewId: string
  onReactionChange?: () => void
  className?: string
}

const reactionConfig = {
  like: {
    icon: Heart,
    label: 'Like',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    hoverBg: 'hover:bg-red-100'
  },
  helpful: {
    icon: Lightbulb,
    label: 'Helpful',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    hoverBg: 'hover:bg-yellow-100'
  },
  inspiring: {
    icon: Sparkles,
    label: 'Inspiring',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hoverBg: 'hover:bg-purple-100'
  },
  thoughtful: {
    icon: Brain,
    label: 'Thoughtful',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hoverBg: 'hover:bg-blue-100'
  }
}

export default function ReviewReactions({
  reviewId,
  onReactionChange,
  className = ''
}: ReviewReactionsProps) {
  const { user } = useAuth()
  const [counts, setCounts] = useState<ReactionCounts>({
    like: 0,
    helpful: 0,
    inspiring: 0,
    thoughtful: 0
  })
  const [userReactions, setUserReactions] = useState<UserReactions>({
    like: false,
    helpful: false,
    inspiring: false,
    thoughtful: false
  })
  const [loading, setLoading] = useState<ReactionType | null>(null)

  useEffect(() => {
    fetchReactions()
  }, [reviewId, user])

  const fetchReactions = async () => {
    try {
      // Fetch all reactions for this review from place_review_reactions table
      const { data: reactions, error } = await supabase
        .from('place_review_reactions')
        .select('reaction_type, user_id')
        .eq('review_id', reviewId)

      if (error) throw error

      // Count reactions by type
      const newCounts: ReactionCounts = {
        like: 0,
        helpful: 0,
        inspiring: 0,
        thoughtful: 0
      }

      const newUserReactions: UserReactions = {
        like: false,
        helpful: false,
        inspiring: false,
        thoughtful: false
      }

      reactions?.forEach(reaction => {
        const type = reaction.reaction_type as ReactionType
        newCounts[type]++
        if (user && reaction.user_id === user.id) {
          newUserReactions[type] = true
        }
      })

      setCounts(newCounts)
      setUserReactions(newUserReactions)
    } catch (error) {
      console.error('Error fetching review reactions:', error)
    }
  }

  const handleReaction = async (reactionType: ReactionType) => {
    if (!user) {
      // User needs to log in
      return
    }

    if (loading) return

    // Optimistic update
    const wasActive = userReactions[reactionType]
    const previousCounts = { ...counts }
    const previousReactions = { ...userReactions }

    setUserReactions(prev => ({
      ...prev,
      [reactionType]: !prev[reactionType]
    }))

    setCounts(prev => ({
      ...prev,
      [reactionType]: wasActive ? prev[reactionType] - 1 : prev[reactionType] + 1
    }))

    setLoading(reactionType)

    try {
      if (wasActive) {
        // Remove reaction
        const { error } = await supabase
          .from('place_review_reactions')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id)
          .eq('reaction_type', reactionType)

        if (error) throw error
      } else {
        // Add reaction
        const { error } = await supabase
          .from('place_review_reactions')
          .insert({
            review_id: reviewId,
            user_id: user.id,
            reaction_type: reactionType
          })

        if (error) throw error

        // Create notification for review author (only for new reactions)
        try {
          const { data: review } = await supabase
            .from('place_reviews')
            .select('user_id')
            .eq('id', reviewId)
            .single()

          if (review && review.user_id !== user.id) {
            await fetch('/api/notifications/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: review.user_id,
                type: reactionType, // Use reaction type as notification type
                entityType: 'review',
                entityId: reviewId,
              }),
            })
          }
        } catch (notifError) {
          console.error('Failed to create notification:', notifError)
        }
      }

      onReactionChange?.()
    } catch (error) {
      // Rollback on error
      setCounts(previousCounts)
      setUserReactions(previousReactions)
      console.error('Error toggling reaction:', error)
    } finally {
      setLoading(null)
    }
  }

  // Don't show if user is not logged in
  if (!user) return null

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {(Object.keys(reactionConfig) as ReactionType[]).map(reactionType => {
        const config = reactionConfig[reactionType]
        const Icon = config.icon
        const count = counts[reactionType]
        const isActive = userReactions[reactionType]
        const isLoading = loading === reactionType

        return (
          <button
            key={reactionType}
            onClick={() => handleReaction(reactionType)}
            disabled={isLoading}
            className={`flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-xs transition-colors ${
              isActive
                ? `${config.color} ${config.bgColor}`
                : `text-gray-400 hover:${config.color} ${config.hoverBg}`
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={config.label}
          >
            <Icon
              className={`h-3.5 w-3.5 ${isActive ? 'fill-current' : ''}`}
            />
            {count > 0 && (
              <span className="font-medium">{count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
