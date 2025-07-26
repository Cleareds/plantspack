'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'
import { Users, UserMinus } from 'lucide-react'

type UserProfile = Tables<'users'>

interface FollowingResponse {
  following: UserProfile | null
}

interface FollowersResponse {
  follower: UserProfile | null
}

interface ProfileFollowersProps {
  userId: string
}

export default function ProfileFollowers({ userId }: ProfileFollowersProps) {
  const [following, setFollowing] = useState<UserProfile[]>([])
  const [followers, setFollowers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'following' | 'followers'>('following')
  const { user } = useAuth()

  const isOwnProfile = user?.id === userId

  useEffect(() => {
    if (!userId) return
    fetchFollowData()
  }, [userId])

  const fetchFollowData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch following
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select(`
          following:following_id (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('follower_id', userId) as { data: FollowingResponse[] | null, error: any }

      if (followingError) throw followingError

      // Fetch followers
      const { data: followersData, error: followersError } = await supabase
        .from('follows')
        .select(`
          follower:follower_id (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('following_id', userId) as { data: FollowersResponse[] | null, error: any }

      if (followersError) throw followersError

      const followingList = followingData?.map(item => item.following).filter((user): user is UserProfile => user !== null) || []
      const followersList = followersData?.map(item => item.follower).filter((user): user is UserProfile => user !== null) || []
      
      setFollowing(followingList)
      setFollowers(followersList)
    } catch (err) {
      console.error('Error fetching follow data:', err)
      setError('Failed to load follow data')
    } finally {
      setLoading(false)
    }
  }

  const handleUnfollow = async (userToUnfollow: UserProfile) => {
    if (!user || !isOwnProfile) return

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userToUnfollow.id)

      if (error) throw error

      setFollowing(prev => prev.filter(u => u.id !== userToUnfollow.id))
    } catch (err) {
      console.error('Error unfollowing user:', err)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  const activeList = activeTab === 'following' ? following : followers
  const activeCount = activeTab === 'following' ? following.length : followers.length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Social</h3>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'following'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Following ({following.length})
          </button>
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'followers'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Followers ({followers.length})
          </button>
        </div>
      </div>

      {activeCount === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          {activeTab === 'following' ? 'Not following anyone yet.' : 'No followers yet.'}
        </div>
      ) : (
        <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
          {activeList.map((person) => (
            <div key={person.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 avatar-container">
                  {person.avatar_url ? (
                    <img
                      src={person.avatar_url}
                      alt={`${person.first_name} ${person.last_name}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {person.first_name && person.last_name
                      ? `${person.first_name} ${person.last_name}`
                      : person.username}
                  </p>
                  <p className="text-sm text-gray-500 truncate">@{person.username}</p>
                </div>
              </div>
              
              {isOwnProfile && activeTab === 'following' && (
                <button
                  onClick={() => handleUnfollow(person)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Unfollow"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}