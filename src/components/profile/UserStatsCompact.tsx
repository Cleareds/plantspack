'use client'

import { useState, useEffect } from 'react'
import { Heart, Lightbulb, Sparkles, Brain, Users, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UserStatsCompactProps {
  userId: string
  className?: string
}

interface Stats {
  total_likes: number
  total_helpful: number
  total_inspiring: number
  total_thoughtful: number
  total_reactions: number
  followers_count: number
  following_count: number
  posts_count: number
  comments_count: number
}

export default function UserStatsCompact({ userId, className = '' }: UserStatsCompactProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [userId])

  const fetchStats = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .rpc('get_user_complete_stats', { user_uuid: userId })
        .single()

      if (error) throw error

      setStats(data as Stats)
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) return null

  const reactions = [
    { icon: Heart, count: stats.total_likes, color: 'text-red-500', bgColor: 'bg-red-50' },
    { icon: Lightbulb, count: stats.total_helpful, color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
    { icon: Sparkles, count: stats.total_inspiring, color: 'text-purple-500', bgColor: 'bg-purple-50' },
    { icon: Brain, count: stats.total_thoughtful, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  ].filter(r => r.count > 0)

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Reactions */}
      {reactions.length > 0 && (
        <div className="flex items-center gap-2">
          {reactions.map((reaction, index) => {
            const Icon = reaction.icon
            return (
              <div
                key={index}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md ${reaction.bgColor}`}
              >
                <Icon className={`h-4 w-4 ${reaction.color}`} />
                <span className={`text-sm font-semibold ${reaction.color}`}>
                  {reaction.count.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Followers/Following */}
      <div className="flex items-center gap-2">
        <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-green-50">
          <Users className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-green-600">
            {stats.followers_count.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500">followers</span>
        </div>
        <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-green-50">
          <UserPlus className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-green-600">
            {stats.following_count.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500">following</span>
        </div>
      </div>
    </div>
  )
}
