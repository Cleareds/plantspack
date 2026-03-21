'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Hash, Loader2 } from 'lucide-react'
import { getTrendingHashtags } from '@/lib/hashtags'

interface TrendingHashtag {
  tag: string
  usageCount: number
  recentUsageCount: number
}

interface TrendingHashtagsProps {
  limit?: number
  daysBack?: number
  className?: string
}

export default function TrendingHashtags({
  limit = 10,
  daysBack = 7,
  className = ''
}: TrendingHashtagsProps) {
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true)
        const trending = await getTrendingHashtags(limit, daysBack)
        setHashtags(trending)
      } catch (error) {
        console.error('Error fetching trending hashtags:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrending()
  }, [limit, daysBack])

  if (loading) {
    return (
      <div className={`bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-on-surface">Trending Hashtags</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (hashtags.length === 0) {
    return null
  }

  return (
    <div className={`bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-on-surface">Trending Hashtags</h2>
      </div>

      <div className="space-y-3">
        {hashtags.map((hashtag, index) => (
          <Link
            key={hashtag.tag}
            href={`/hashtag/${hashtag.tag.toLowerCase()}`}
            className="block group"
          >
            <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-container-low transition-colors">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className="text-outline font-medium text-sm w-6 flex-shrink-0">
                  {index + 1}
                </span>
                <Hash className="h-4 w-4 text-outline flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-medium group-hover:text-primary transition-colors truncate">
                    {hashtag.tag}
                  </p>
                  <p className="text-xs text-outline">
                    {hashtag.usageCount} {hashtag.usageCount === 1 ? 'post' : 'posts'}
                  </p>
                </div>
              </div>

              {hashtag.recentUsageCount > 0 && (
                <div className="flex items-center space-x-1 text-primary flex-shrink-0">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {hashtag.recentUsageCount}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-outline-variant/15">
        <p className="text-xs text-outline text-center">
          Based on activity from the last {daysBack} days
        </p>
      </div>
    </div>
  )
}
