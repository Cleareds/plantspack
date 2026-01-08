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

interface ReactionButtonsProps {
  postId: string
  onReactionChange?: () => void
  showSignUpModal?: (action: string) => void
  className?: string
  initialReactions?: any[]  // Bulk-loaded reactions for performance
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

export default function ReactionButtons({
  postId,
  onReactionChange,
  showSignUpModal,
  className = '',
  initialReactions
}: ReactionButtonsProps) {
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

  // Initialize from bulk-loaded reactions if provided, otherwise fetch
  useEffect(() => {
    if (initialReactions) {
      // Use provided reactions (bulk-loaded for performance)
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

      initialReactions.forEach(reaction => {
        const type = reaction.reaction_type as ReactionType
        newCounts[type]++
        if (user && reaction.user_id === user.id) {
          newUserReactions[type] = true
        }
      })

      setCounts(newCounts)
      setUserReactions(newUserReactions)
    } else {
      // Fallback: fetch reactions if not provided
      fetchReactions()
    }
  }, [postId, user, initialReactions])

  const fetchReactions = async () => {
    try {
      // Fetch all reactions for this post
      const { data: reactions, error } = await supabase
        .from('post_reactions')
        .select('reaction_type, user_id')
        .eq('post_id', postId)

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
      console.error('Error fetching reactions:', error)
    }
  }

  const handleReaction = async (reactionType: ReactionType) => {
    if (!user) {
      showSignUpModal?.(reactionType)
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
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('reaction_type', reactionType)

        if (error) throw error
      } else {
        // Add reaction
        const { error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType
          })

        if (error) throw error

        // Create notification for post author (only for new reactions)
        try {
          const { data: post } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', postId)
            .single()

          if (post && post.user_id !== user.id) {
            // Map reaction types to custom messages
            const reactionMessages: Record<ReactionType, string> = {
              like: 'liked your post',
              helpful: 'found your post helpful',
              inspiring: 'found your post inspiring',
              thoughtful: 'found your post thoughtful'
            }

            console.log('[ReactionButtons] Creating notification:', {
              postAuthor: post.user_id,
              reactionType,
              postId
            })

            const response = await fetch('/api/notifications/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: post.user_id,
                type: 'like', // All reactions use 'like' type for now
                entityType: 'post',
                entityId: postId,
                message: reactionMessages[reactionType]
              }),
            })

            if (!response.ok) {
              const errorText = await response.text()
              console.error('[Notification] Failed to create notification:', errorText)
            } else {
              const result = await response.json()
              console.log('[ReactionButtons] Notification result:', result)
            }
          }
        } catch (notifError) {
          console.error('[Notification] Error creating notification:', notifError)
          // Don't fail the reaction - notification is not critical
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

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
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
            className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${
              isActive
                ? `${config.color} ${config.bgColor}`
                : `text-gray-500 hover:${config.color} ${config.hoverBg}`
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={config.label}
          >
            <Icon
              className={`h-5 w-5 ${isActive ? 'fill-current' : ''}`}
            />
            {count > 0 && (
              <span className="text-sm font-medium">{count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
