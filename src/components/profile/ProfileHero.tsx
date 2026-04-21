'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Ban, MapPin, Star, MessageSquare, Package, Users, UserPlus } from 'lucide-react'
import TierBadge from '@/components/ui/TierBadge'
import ProfileBadges from './ProfileBadges'
import { supabase } from '@/lib/supabase'

interface ProfileUser {
  id: string
  username: string
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  subscription_tier?: 'free' | 'medium' | 'premium' | null
  is_banned?: boolean | null
}

interface ContribSummary {
  places_added: number
  reviews_written: number
  recipe_reviews_written: number
  posts_published: number
  packs_created: number
  corrections_submitted: number
  badge_codes: string[]
}

interface FollowStats {
  followers_count: number
  following_count: number
}

interface ProfileHeroProps {
  user: ProfileUser
  mode: 'public' | 'owner'
  /** Slot for Follow/Mute/Block/Report or Edit/Manage action buttons */
  actions?: ReactNode
  /** Optional callout rendered below the action row, e.g. "This is your public profile →" */
  callout?: ReactNode
  /** Click handlers on the stats strip, e.g. switch to tab */
  onStatClick?: (stat: 'places' | 'reviews' | 'posts' | 'packs' | 'followers' | 'following') => void
}

export default function ProfileHero({ user, mode, actions, callout, onStatClick }: ProfileHeroProps) {
  const [contrib, setContrib] = useState<ContribSummary | null>(null)
  const [follows, setFollows] = useState<FollowStats | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const [c, f] = await Promise.all([
        supabase.rpc('get_user_contributions_summary', { user_uuid: user.id }).single(),
        supabase.rpc('get_user_follow_stats', { user_uuid: user.id }).single(),
      ])
      if (cancelled) return
      if (c.data) setContrib(c.data as ContribSummary)
      if (f.data) setFollows(f.data as FollowStats)
    }
    run()
    return () => { cancelled = true }
  }, [user.id])

  const displayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.first_name || user.username

  const totalReviews = (contrib?.reviews_written ?? 0) + (contrib?.recipe_reviews_written ?? 0)

  const stats: Array<{ key: 'places' | 'reviews' | 'posts' | 'packs' | 'followers' | 'following', count: number, label: string, icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'places',    count: contrib?.places_added ?? 0,   label: 'Places',   icon: MapPin },
    { key: 'reviews',   count: totalReviews,                 label: 'Reviews',  icon: Star },
    { key: 'posts',     count: contrib?.posts_published ?? 0, label: 'Posts',   icon: MessageSquare },
    { key: 'packs',     count: contrib?.packs_created ?? 0,  label: 'Packs',    icon: Package },
    { key: 'followers', count: follows?.followers_count ?? 0, label: 'Followers', icon: Users },
    { key: 'following', count: follows?.following_count ?? 0, label: 'Following', icon: UserPlus },
  ]

  return (
    <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-3 sm:p-6 mb-6">
      {/* Identity row: avatar + name + actions */}
      <div className="flex items-start justify-between mb-4 flex-wrap sm:flex-nowrap gap-3">
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <div className="flex-shrink-0">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={`${user.username}'s avatar`}
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-surface-container-low flex items-center justify-center">
                <span className="text-primary font-medium text-2xl">
                  {user.first_name?.[0] || user.username[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-on-surface truncate">{displayName}</h1>
              {user.subscription_tier && user.subscription_tier !== 'free' && (
                <TierBadge tier={user.subscription_tier as 'medium' | 'premium'} size="md" />
              )}
              {user.is_banned && (
                <div className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <Ban className="h-4 w-4" />
                  <span>Banned</span>
                </div>
              )}
            </div>
            <p className="text-outline">@{user.username}</p>
            {user.bio && <p className="text-on-surface-variant mt-2">{user.bio}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center flex-wrap gap-2 mt-1 sm:mt-0">{actions}</div>}
      </div>

      {/* Contributor badges */}
      <ProfileBadges userId={user.id} size="sm" className="mt-1" />

      {/* Owner callout (e.g. link to private profile) */}
      {callout && <div className="mt-3">{callout}</div>}

      {/* Stats strip */}
      <div className="mt-4 pt-4 border-t border-outline-variant/15">
        <div className="flex flex-wrap gap-2">
          {stats.map(({ key, count, label, icon: Icon }) => {
            const isFollowLink = (key === 'followers' || key === 'following') && count > 0
            const inner = (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-low/60 hover:bg-surface-container-low transition-colors text-sm">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-on-surface">{count.toLocaleString()}</span>
                <span className="text-on-surface-variant">{label}</span>
              </span>
            )
            if (isFollowLink) {
              return (
                <Link
                  key={key}
                  href={`/user/${user.username}/${key}`}
                  className="block"
                >
                  {inner}
                </Link>
              )
            }
            if (onStatClick && count > 0) {
              return (
                <button key={key} onClick={() => onStatClick(key)} className="text-left">
                  {inner}
                </button>
              )
            }
            return <div key={key}>{inner}</div>
          })}
        </div>
      </div>
    </div>
  )
}
