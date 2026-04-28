'use client'

import { useState } from 'react'
import { PackWithStats } from '@/types/packs'
import Link from 'next/link'
import { Users, FileText, Crown, Settings, Globe, Facebook, Twitter, Instagram, Music2, Check, BadgeCheck, MapPin } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const ADMIN_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

interface PackHeaderProps {
  pack: PackWithStats
  onJoin?: () => void
  onLeave?: () => void
}

export default function PackHeader({ pack, onJoin, onLeave }: PackHeaderProps) {
  const { user } = useAuth()
  const [isJoining, setIsJoining] = useState(false)
  // Verified badge: shown for admin-owned packs OR packs explicitly verified
  // by an admin (pack.is_verified). Allows community-curated packs to earn
  // the badge without transferring ownership.
  const isAdminPack = pack.creator_id === ADMIN_ID
  const isVerifiedPack = isAdminPack || (pack as any).is_verified === true

  const handleJoin = async () => {
    setIsJoining(true)
    try {
      await onJoin?.()
    } finally {
      setIsJoining(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase()
    if (c === 'recipes') return '🍽️'
    if (c === 'places') return '📍'
    if (c === 'travel guides' || c === 'traveling') return '✈️'
    if (c === 'products') return '🛍️'
    if (c === 'activism') return '✊'
    if (c === 'lifestyle') return '🌱'
    return '📦'
  }

  // Deduplicate categories (case-insensitive)
  const rawCats: string[] = (pack as any).categories?.length > 0
    ? (pack as any).categories
    : (pack.category ? [pack.category] : [])
  const seen = new Set<string>()
  const packCategories = rawCats.filter(c => {
    const key = c.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <div className="bg-surface-container-lowest border-b border-outline-variant/15">
      {/* Banner */}
      <div className="relative w-full h-48 md:h-64 bg-gradient-to-br from-surface-container-low to-surface-container">
        {pack.banner_url ? (
          <img
            src={pack.banner_url}
            alt={pack.title}
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-8xl">
            {packCategories.length > 0 ? getCategoryIcon(packCategories[0]) : '📦'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            {/* Categories */}
            {packCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {packCategories.map((cat) => (
                  <div key={cat} className="inline-flex items-center gap-1 bg-surface-container-low text-primary px-3 py-1 rounded-full text-sm font-medium">
                    <span>{getCategoryIcon(cat)}</span>
                    <span>{cat}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Title + Verified Badge */}
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-on-surface">
                {pack.title}
              </h1>
              {isVerifiedPack && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-600" title="Checked by PlantsPack founders">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>

            {/* Description */}
            {pack.description && (
              <p className="text-on-surface-variant mb-4 max-w-3xl">
                {pack.description}
              </p>
            )}

            {/* Creator */}
            <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
              <span>Created by</span>
              <Link
                href={`/profile/${pack.users.username}`}
                className="font-medium text-primary hover:text-primary flex items-center gap-1"
              >
                @{pack.users.username}
                {pack.users.subscription_tier === 'premium' && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
              </Link>
            </div>

            {/* Stats. Places lead because they're the bulk of pack content; posts
                are hidden when zero so the header doesn't show empty stats. */}
            <div className="flex items-center gap-6 text-sm text-on-surface-variant">
              {(pack.places_count ?? 0) > 0 && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-5 w-5" />
                  <span className="font-medium text-on-surface">{pack.places_count}</span>
                  <span>{pack.places_count === 1 ? 'place' : 'places'}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="h-5 w-5" />
                <span className="font-medium text-on-surface">{pack.member_count}</span>
                <span>{pack.member_count === 1 ? 'member' : 'members'}</span>
              </div>
              {(pack.post_count ?? 0) > 0 && (
                <div className="flex items-center gap-1">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium text-on-surface">{pack.post_count}</span>
                  <span>{pack.post_count === 1 ? 'post' : 'posts'}</span>
                </div>
              )}
            </div>

            {/* Social Links */}
            {(pack.website_url || pack.facebook_url || pack.twitter_url || pack.instagram_url || pack.tiktok_url) && (
              <div className="flex items-center gap-3 mt-4">
                {pack.website_url && (
                  <a
                    href={pack.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-on-surface-variant hover:text-primary"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                )}
                {pack.facebook_url && (
                  <a
                    href={pack.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-on-surface-variant hover:text-blue-600"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {pack.twitter_url && (
                  <a
                    href={pack.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-on-surface-variant hover:text-blue-400"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {pack.instagram_url && (
                  <a
                    href={pack.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-on-surface-variant hover:text-pink-600"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {pack.tiktok_url && (
                  <a
                    href={pack.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-on-surface-variant hover:text-black"
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
                href={`/packs/${pack.slug}/edit`}
                className="flex items-center justify-center gap-2 bg-surface-container-low hover:bg-surface-container text-on-surface-variant px-4 py-2 rounded-md font-medium transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Edit Pack</span>
              </Link>
            )}

            {!pack.is_member && pack.user_role !== 'admin' && (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="flex items-center justify-center gap-2 silk-gradient hover:opacity-90 text-on-primary px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isJoining ? 'Joining...' : 'Join Pack'}</span>
              </button>
            )}

            {pack.is_member && pack.user_role === 'member' && (
              <button
                onClick={onLeave}
                className="flex items-center justify-center gap-2 bg-surface-container-low hover:bg-surface-container text-on-surface-variant px-4 py-2 rounded-md font-medium transition-colors"
              >
                <span>Leave Pack</span>
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
