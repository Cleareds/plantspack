'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-simple'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'
import { Users, UserMinus } from 'lucide-react'

type UserProfile = Tables<'users'>

interface FollowingListProps {
  className?: string
}

export default function FollowingList({ className = '' }: FollowingListProps) {
  const [following, setFollowing] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchFollowing = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('follows')
        .select(`
          following_id,
          users!follows_following_id_fkey (
            id,
            username,
            first_name,
            last_name,
            avatar_url,
            bio
          )
        `)
        .eq('follower_id', user.id)

      if (fetchError) throw fetchError

      const followingUsers = data?.map(item => item.users).filter(Boolean) as unknown as UserProfile[]
      setFollowing(followingUsers || [])
    } catch (err) {
      console.error('Error fetching following:', err)
      setError('Failed to load following list')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchFollowing()
    }
  }, [user, fetchFollowing])

  const handleUnfollow = async (userToUnfollow: UserProfile) => {
    if (!user) return

    try {
      const { error: unfollowError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userToUnfollow.id)

      if (unfollowError) throw unfollowError

      // Update local state
      setFollowing(prev => prev.filter(u => u.id !== userToUnfollow.id))
    } catch (err) {
      console.error('Error unfollowing user:', err)
    }
  }

  if (!user) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500">Please log in to see who you&apos;re following.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-4 bg-white rounded-lg border animate-pulse">
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchFollowing}
          className="mt-2 text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (following.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No one yet</h3>
        <p className="text-gray-500">
          When you follow other users, they&apos;ll appear here.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Following ({following.length})
      </h3>
      
      {following.map((user) => (
        <div key={user.id} className="flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors">
          <div className="flex items-center space-x-3">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            )}
            
            <div>
              <h4 className="font-medium text-gray-900">
                {user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : user.username
                }
              </h4>
              <p className="text-sm text-gray-500">@{user.username}</p>
              {user.bio && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
              )}
            </div>
          </div>

          <button
            onClick={() => handleUnfollow(user)}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Unfollow"
          >
            <UserMinus className="w-4 h-4" />
            <span>Unfollow</span>
          </button>
        </div>
      ))}
    </div>
  )
}