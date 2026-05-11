'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'
import Link from 'next/link'
import { User as UserIcon } from 'lucide-react'

interface Liker {
  user_id: string
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }[]
}

interface LikersPopoverProps {
  entityType: 'post' | 'review'
  entityId: string
  count: number
  // Optional analytics row data, shown to the entity author only.
  analytics?: {
    likes: number
    comments: number | null
    views: number | null
  }
  // Whether to actually show the analytics row (i.e. viewer is the author).
  showAnalytics?: boolean
  children: ReactNode
}

// Facebook-style hover/tap popover that lists users who reacted with 'like'.
// On desktop: opens on mouseenter, closes on mouseleave. On mobile: opens on
// tap and stays until the user taps outside.
export default function LikersPopover({
  entityType,
  entityId,
  count,
  analytics,
  showAnalytics,
  children,
}: LikersPopoverProps) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<Liker[] | null>(null)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Lazy-fetch on first open per entity.
  useEffect(() => {
    if (!open || users !== null || count === 0) return
    setLoading(true)
    const url = entityType === 'post'
      ? `/api/posts/${entityId}/reactions/users?type=like&limit=50`
      : `/api/reviews/${entityId}/reactions/users?type=like&limit=50`
    fetch(url)
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [open, users, entityType, entityId, count])

  // Close on outside-click for the mobile (tap-to-open) flow.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  if (count === 0 && !showAnalytics) {
    return <>{children}</>
  }

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        cancelClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <div onClick={() => setOpen((v) => !v)}>{children}</div>
      {open && (
        <div
          className="absolute z-50 top-full left-0 mt-1 bg-white border border-outline-variant rounded-lg shadow-lg p-2 min-w-[220px] max-w-[280px]"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {loading && (
            <p className="px-2 py-1 text-xs text-outline">Loading…</p>
          )}
          {!loading && users && users.length === 0 && (
            <p className="px-2 py-1 text-xs text-outline">No likes yet</p>
          )}
          {!loading && users && users.length > 0 && (
            <>
              <div className="max-h-[200px] overflow-y-auto">
                {users.map((row) => {
                  const u = Array.isArray(row.users) ? row.users[0] : row.users
                  if (!u) return null
                  const displayName = u.first_name && u.last_name
                    ? `${u.first_name} ${u.last_name}`
                    : (u.first_name || u.username)
                  return (
                    <Link
                      key={u.id}
                      href={`/profile/${u.username}`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-container-low transition-colors"
                    >
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.avatar_url}
                          alt={u.username}
                          className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-primary-container/30 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-on-surface truncate">{displayName}</p>
                        <p className="text-[10px] text-outline truncate">@{u.username}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
              {count > users.length && (
                <p className="px-2 pt-1 text-[10px] text-outline">and {count - users.length} more</p>
              )}
            </>
          )}
          {showAnalytics && analytics && (
            <div className="mt-2 pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[10px] text-outline px-1">
              <span>Likes: {analytics.likes}</span>
              {analytics.comments !== null && <span>Comments: {analytics.comments}</span>}
              <span>Views: {analytics.views ?? '—'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
