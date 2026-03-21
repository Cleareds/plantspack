'use client'

import { useState, useEffect } from 'react'
import { Heart, Lightbulb, Sparkles, Brain, Users, UserPlus, FileText, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UserStatsProps {
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

export default function UserStats({ userId, className = '' }: UserStatsProps) {
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

  if (loading) {
    return (
      <div className={`bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surface-container rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-surface-container rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const reactionStats = [
    {
      icon: Heart,
      label: 'Likes',
      count: stats.total_likes,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      icon: Lightbulb,
      label: 'Helpful',
      count: stats.total_helpful,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      icon: Sparkles,
      label: 'Inspiring',
      count: stats.total_inspiring,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Brain,
      label: 'Thoughtful',
      count: stats.total_thoughtful,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ]

  const communityStats = [
    {
      icon: Users,
      label: 'Followers',
      count: stats.followers_count,
      color: 'text-primary',
      bgColor: 'bg-primary-container/20'
    },
    {
      icon: UserPlus,
      label: 'Following',
      count: stats.following_count,
      color: 'text-primary',
      bgColor: 'bg-primary-container/20'
    }
  ]

  const contentStats = [
    {
      icon: FileText,
      label: 'Posts',
      count: stats.posts_count,
      color: 'text-on-surface-variant',
      bgColor: 'bg-surface-container-low'
    },
    {
      icon: MessageSquare,
      label: 'Comments',
      count: stats.comments_count,
      color: 'text-on-surface-variant',
      bgColor: 'bg-surface-container-low'
    }
  ]

  return (
    <div className={`bg-surface-container-lowest rounded-lg editorial-shadow ghost-border ${className}`}>
      {/* Reactions Received */}
      <div className="p-6 border-b border-outline-variant/15">
        <h3 className="text-sm font-semibold text-on-surface mb-4">Reactions Received</h3>
        <div className="grid grid-cols-2 gap-3">
          {reactionStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className={`flex items-center space-x-3 p-3 rounded-lg ${stat.bgColor}`}
              >
                <div className={`${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-lg font-bold ${stat.color}`}>
                    {stat.count.toLocaleString()}
                  </p>
                  <p className="text-xs text-on-surface-variant">{stat.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Community Stats */}
      <div className="p-6 border-b border-outline-variant/15">
        <h3 className="text-sm font-semibold text-on-surface mb-4">Community</h3>
        <div className="grid grid-cols-2 gap-3">
          {communityStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className={`flex items-center space-x-3 p-3 rounded-lg ${stat.bgColor}`}
              >
                <div className={`${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-lg font-bold ${stat.color}`}>
                    {stat.count.toLocaleString()}
                  </p>
                  <p className="text-xs text-on-surface-variant">{stat.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Content Stats */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-on-surface mb-4">Content</h3>
        <div className="grid grid-cols-2 gap-3">
          {contentStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className={`flex items-center space-x-3 p-3 rounded-lg ${stat.bgColor}`}
              >
                <div className={`${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-lg font-bold ${stat.color}`}>
                    {stat.count.toLocaleString()}
                  </p>
                  <p className="text-xs text-on-surface-variant">{stat.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
