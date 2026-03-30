'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, ShieldCheck, User, Crown, MoreVertical, UserMinus, ShieldPlus } from 'lucide-react'
import { useAuth } from '@/lib/auth'

interface Member {
  id: string
  user_id: string
  role: 'admin' | 'moderator' | 'member'
  joined_at: string
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: Crown, color: 'text-yellow-600 bg-yellow-50' },
  moderator: { label: 'Moderator', icon: ShieldCheck, color: 'text-blue-600 bg-blue-50' },
  member: { label: 'Member', icon: User, color: 'text-on-surface-variant bg-surface-container-low' },
}

export default function PackMembersTab({ packId, userRole }: { packId: string; userRole: string | null }) {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [actionMenu, setActionMenu] = useState<string | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [packId])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const resp = await fetch(`/api/packs/${packId}/members`)
      if (resp.ok) {
        const data = await resp.json()
        setMembers(data.members || [])
      }
    } catch {}
    setLoading(false)
  }

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const promoteMember = async (memberId: string, userId: string) => {
    setActionLoading(userId)
    try {
      const resp = await fetch(`/api/packs/${packId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: 'moderator' }),
      })
      if (resp.ok) {
        setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: 'moderator' } : m))
      } else {
        const data = await resp.json()
        alert(data.error || 'Failed to promote member')
      }
    } catch {
      alert('Failed to promote member. Please try again.')
    }
    setActionLoading(null)
    setActionMenu(null)
  }

  const demoteMember = async (userId: string) => {
    setActionLoading(userId)
    try {
      const resp = await fetch(`/api/packs/${packId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: 'member' }),
      })
      if (resp.ok) {
        setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: 'member' } : m))
      } else {
        const data = await resp.json()
        alert(data.error || 'Failed to demote member')
      }
    } catch {
      alert('Failed to demote member. Please try again.')
    }
    setActionLoading(null)
    setActionMenu(null)
  }

  const removeMember = async (userId: string) => {
    if (!confirm('Remove this member from the pack?')) return
    setActionLoading(userId)
    try {
      const resp = await fetch(`/api/packs/${packId}/members?userId=${userId}`, { method: 'DELETE' })
      if (resp.ok) {
        setMembers(prev => prev.filter(m => m.user_id !== userId))
      } else {
        const data = await resp.json()
        alert(data.error || 'Failed to remove member')
      }
    } catch {
      alert('Failed to remove member. Please try again.')
    }
    setActionLoading(null)
    setActionMenu(null)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-surface-container-lowest rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-high" />
              <div className="flex-1"><div className="h-4 bg-surface-container-high rounded w-24" /></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const isAdmin = userRole === 'admin'

  return (
    <div className="space-y-2">
      {members.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-8 text-center">
          <p className="text-on-surface-variant">No members yet. Share this pack to invite people!</p>
        </div>
      ) : (
        members.map(member => {
          const displayName = member.users.first_name
            ? `${member.users.first_name} ${member.users.last_name || ''}`.trim()
            : member.users.username
          const roleConfig = ROLE_CONFIG[member.role]
          const RoleIcon = roleConfig.icon

          return (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-lg ghost-border">
              {/* Avatar */}
              <Link href={`/user/${member.users.username}`}>
                {member.users.avatar_url ? (
                  <img src={member.users.avatar_url} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-on-primary font-semibold text-sm">{displayName[0]?.toUpperCase()}</span>
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/user/${member.users.username}`} className="font-medium text-sm text-on-surface hover:text-primary transition-colors">
                  {displayName}
                </Link>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-on-surface-variant">@{member.users.username}</span>
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${roleConfig.color}`}>
                    <RoleIcon className="h-2.5 w-2.5" />
                    {roleConfig.label}
                  </span>
                </div>
              </div>

              {/* Admin actions */}
              {isAdmin && member.role !== 'admin' && (
                <div className="relative">
                  <button
                    onClick={() => setActionMenu(actionMenu === member.id ? null : member.id)}
                    className="p-1.5 rounded hover:bg-surface-container-low text-on-surface-variant"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {actionMenu === member.id && (
                    <div className="absolute right-0 top-8 z-10 bg-surface-container-lowest rounded-lg editorial-shadow ghost-border py-1 w-44">
                      {actionLoading === member.user_id ? (
                        <div className="flex items-center justify-center py-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        </div>
                      ) : (
                        <>
                          {member.role === 'member' && (
                            <button
                              onClick={() => promoteMember(member.id, member.user_id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low"
                            >
                              <ShieldPlus className="h-4 w-4 text-blue-600" />
                              Make Moderator
                            </button>
                          )}
                          {member.role === 'moderator' && (
                            <button
                              onClick={() => demoteMember(member.user_id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low"
                            >
                              <Shield className="h-4 w-4 text-on-surface-variant" />
                              Demote to Member
                            </button>
                          )}
                          <button
                            onClick={() => removeMember(member.user_id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <UserMinus className="h-4 w-4" />
                            Remove Member
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
