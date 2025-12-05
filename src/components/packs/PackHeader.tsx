'use client'

import { useState } from 'react'
import { PackWithStats } from '@/types/packs'
import Image from 'next/image'
import Link from 'next/link'
import { Users, FileText, Crown, Settings, Globe, Facebook, Twitter, Instagram, Music2, Heart, Check } from 'lucide-react'

interface PackHeaderProps {
  pack: PackWithStats
  onJoin?: () => void
  onLeave?: () => void
  onFollow?: () => void
  onUnfollow?: () => void
}

export default function PackHeader({ pack, onJoin, onLeave, onFollow, onUnfollow }: PackHeaderProps) {
  const [isJoining, setIsJoining] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  const handleJoin = async () => {
    setIsJoining(true)
    try {
      await onJoin?.()
    } finally {
      setIsJoining(false)
    }
  }

  const handleFollow = async () => {
    setIsFollowing(true)
    try {
      if (pack.is_following) {
        await onUnfollow?.()
      } else {
        await onFollow?.()
      }
    } finally {
      setIsFollowing(false)
    }
  }

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case 'recipes': return '🍽️'
      case 'places': return '📍'
      case 'products': return '🛍️'
      case 'resources': return '📚'
      case 'lifestyle': return '🌱'
      default: return '📦'
    }
  }

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Banner */}
      <div className="relative w-full h-48 md:h-64 bg-gradient-to-br from-green-100 to-green-200">
        {pack.banner_url ? (
          <Image
            src={pack.banner_url}
            alt={pack.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-8xl">
            {getCategoryIcon(pack.category)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            {/* Category */}
            {pack.category && (
              <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium mb-3">
                <span>{getCategoryIcon(pack.category)}</span>
                <span>{pack.category.charAt(0).toUpperCase() + pack.category.slice(1)}</span>
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {pack.title}
            </h1>

            {/* Description */}
            {pack.description && (
              <p className="text-gray-600 mb-4 max-w-3xl">
                {pack.description}
              </p>
            )}

            {/* Creator */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <span>Created by</span>
              <Link
                href={`/profile/${pack.users.username}`}
                className="font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                @{pack.users.username}
                {pack.users.subscription_tier === 'premium' && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-5 w-5" />
                <span className="font-medium text-gray-900">{pack.member_count}</span>
                <span>members</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-5 w-5" />
                <span className="font-medium text-gray-900">{pack.post_count}</span>
                <span>posts</span>
              </div>
            </div>

            {/* Social Links */}
            {(pack.website_url || pack.facebook_url || pack.twitter_url || pack.instagram_url || pack.tiktok_url) && (
              <div className="flex items-center gap-3 mt-4">
                {pack.website_url && (
                  <a
                    href={pack.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-green-600"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                )}
                {pack.facebook_url && (
                  <a
                    href={pack.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {pack.twitter_url && (
                  <a
                    href={pack.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-400"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {pack.instagram_url && (
                  <a
                    href={pack.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-pink-600"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {pack.tiktok_url && (
                  <a
                    href={pack.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-black"
                  >
                    <Music2 className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 md:min-w-[200px]">
            {pack.user_role === 'admin' && (
              <Link
                href={`/packs/${pack.id}/edit`}
                className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Edit Pack</span>
              </Link>
            )}

            {!pack.is_member && pack.user_role !== 'admin' && (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isJoining ? 'Joining...' : 'Join Pack'}</span>
              </button>
            )}

            {pack.is_member && pack.user_role === 'member' && (
              <button
                onClick={onLeave}
                className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors"
              >
                <span>Leave Pack</span>
              </button>
            )}

            <button
              onClick={handleFollow}
              disabled={isFollowing}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                pack.is_following
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'border-2 border-green-600 text-green-600 hover:bg-green-50'
              }`}
            >
              <Heart className={`h-4 w-4 ${pack.is_following ? 'fill-current' : ''}`} />
              <span>{pack.is_following ? 'Following' : 'Follow'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
