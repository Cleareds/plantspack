'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Users } from 'lucide-react'
import FollowButton from '@/components/social/FollowButton'
import TierBadge from '@/components/ui/TierBadge'

interface FollowListProps {
  username: string
  direction: 'followers' | 'following'
}

interface Row {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
  subscription_tier?: 'free' | 'medium' | 'premium'
}

export default function FollowList({ username, direction }: FollowListProps) {
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [displayUser, setDisplayUser] = useState<{ id: string; display: string } | null>(null)
  const [users, setUsers] = useState<Row[]>([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id, username, first_name, last_name')
        .eq('username', username)
        .maybeSingle()

      if (cancelled) return
      if (!userData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const display = userData.first_name
        ? `${userData.first_name} ${userData.last_name || ''}`.trim()
        : `@${userData.username}`
      setDisplayUser({ id: userData.id, display })

      const column = direction === 'followers' ? 'following_id' : 'follower_id'
      const joinCol = direction === 'followers' ? 'follower_id' : 'following_id'
      const fk = direction === 'followers' ? 'follows_follower_id_fkey' : 'follows_following_id_fkey'

      const { data } = await supabase
        .from('follows')
        .select(`${joinCol}, user:users!${fk} (id, username, first_name, last_name, avatar_url, bio, subscription_tier)`)
        .eq(column, userData.id)
        .order('created_at', { ascending: false })

      if (cancelled) return
      const mapped = (data || [])
        .map((r: any) => r.user)
        .filter(Boolean) as Row[]
      setUsers(mapped)
      setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [username, direction])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-semibold text-on-surface">User not found</h1>
        <p className="text-on-surface-variant mt-2">@{username} doesn&apos;t exist.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
        <Link href={`/profile/${username}`} className="hover:text-primary">← {displayUser?.display}</Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-on-surface flex items-center gap-2">
          <Users className="w-5 h-5" />
          {direction === 'followers' ? 'Followers' : 'Following'}
          <span className="text-on-surface-variant text-base font-normal">({users.length})</span>
        </h1>
      </header>

      {users.length === 0 ? (
        <p className="text-on-surface-variant py-8 text-center">
          {direction === 'followers'
            ? `${displayUser?.display} doesn't have any followers yet.`
            : `${displayUser?.display} isn't following anyone yet.`}
        </p>
      ) : (
        <ul className="divide-y divide-surface-container-high bg-white rounded-lg border border-surface-container-high">
          {users.map((u) => {
            const name = u.first_name
              ? `${u.first_name} ${u.last_name || ''}`.trim()
              : `@${u.username}`
            return (
              <li key={u.id} className="flex items-center gap-3 p-4">
                <Link href={`/profile/${u.username}`} className="flex-shrink-0">
                  {u.avatar_url ? (
                    <Image
                      src={u.avatar_url}
                      alt={name}
                      width={44}
                      height={44}
                      className="rounded-full w-11 h-11 object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-medium">
                      {(u.first_name?.[0] || u.username[0]).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${u.username}`} className="block hover:text-primary">
                    <p className="font-medium text-on-surface truncate flex items-center gap-1.5">
                      {name}
                      {u.subscription_tier && u.subscription_tier !== 'free' && (
                        <TierBadge tier={u.subscription_tier} size="sm" />
                      )}
                    </p>
                    <p className="text-sm text-on-surface-variant truncate">@{u.username}</p>
                  </Link>
                  {u.bio && <p className="text-sm text-on-surface-variant truncate mt-0.5">{u.bio}</p>}
                </div>
                <div className="flex-shrink-0">
                  <FollowButton userId={u.id} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
