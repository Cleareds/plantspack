'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { UserPlus, UserCheck } from 'lucide-react'

interface FollowButtonProps {
  userId: string
  className?: string
  showText?: boolean
}

function FollowButton({ userId, className = '', showText = true }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!user || user.id === userId) return

    const checkFollowStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        setIsFollowing(!!data)
      } catch (error) {
        console.error('Error checking follow status:', error)
        setIsFollowing(false)
      }
    }

    checkFollowStatus()
  }, [user, userId])

  const handleFollow = async () => {
    if (!user || user.id === userId || loading) return

    try {
      setLoading(true)
      
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId)

        if (error) throw error
        setIsFollowing(false)
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          })

        if (error) throw error
        setIsFollowing(true)

        // Create notification for the user being followed
        try {
          await fetch('/api/notifications/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              type: 'follow',
            }),
          })
        } catch (notifError) {
          // Don't fail the follow if notification fails
          console.error('Failed to create notification:', notifError)
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setLoading(false)
    }
  }

  // Don't show follow button for own profile or when not logged in
  if (!user || user.id === userId) {
    return null
  }

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`flex items-center space-x-1 px-3 py-1.5 rounded-md font-medium transition-colors ${
        isFollowing
          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          : 'bg-green-600 hover:bg-green-700 text-white'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {isFollowing ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {showText && (
        <span className="text-sm">
          {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
        </span>
      )}
    </button>
  )
}

export default React.memo(FollowButton)