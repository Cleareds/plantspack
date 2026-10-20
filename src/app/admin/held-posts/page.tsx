'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Loader2, ShieldBan, Trash2, Inbox } from 'lucide-react'

interface HeldPost {
  id: string
  slug: string | null
  title: string | null
  content: string
  category: string
  created_at: string
  user_id: string
  users: { username: string; first_name: string | null; last_name: string | null; created_at: string; is_banned: boolean } | null
}

const minutesBetween = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000))
const links = (text: string) => Array.from(new Set(text.match(/https?:\/\/[^\s)]+|www\.[^\s)]+/gi) || []))

export default function HeldPostsPage() {
  const [posts, setPosts] = useState<HeldPost[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/held-posts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load the queue')
      setPosts(data.posts || [])
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const act = async (id: string, action: 'publish' | 'reject' | 'ban') => {
    if (action === 'ban' && !confirm('Ban this account? Everything it posted is hidden.')) return
    setBusy(id)
    try {
      const res = await fetch('/api/admin/held-posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      setPosts(prev => prev.filter(p => !(p.id === id || (action === 'ban' && p.user_id === prev.find(x => x.id === id)?.user_id))))
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(null)
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Held posts</h1>
      <p className="text-sm text-gray-400 mt-1 max-w-[70ch]">
        Posts from accounts younger than 24 hours that contain an outbound link. They are visible to their author only
        until you publish them. Reject hides the post; ban hides everything the account posted and blocks it.
      </p>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {loading ? (
        <div className="mt-8 text-gray-400 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading</div>
      ) : posts.length === 0 ? (
        <div className="mt-8 bg-gray-800 rounded-xl p-10 text-center">
          <Inbox className="h-8 w-8 text-emerald-500/70 mx-auto mb-2" />
          <p className="text-gray-300 font-medium">Nothing held</p>
          <p className="text-gray-500 text-sm mt-0.5">New-account posts with links land here automatically.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {posts.map(p => {
            const age = p.users ? minutesBetween(p.users.created_at, p.created_at) : null
            const urls = links(`${p.title || ''} ${p.content || ''}`)
            return (
              <li key={p.id} className="bg-gray-800 rounded-xl p-4 border-l-4 border-amber-500/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white break-words">{p.title || p.content.slice(0, 80)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.users ? (
                        <>
                          <Link href={`/profile/${p.users.username}`} target="_blank" className="hover:text-white">@{p.users.username}</Link>
                          {age != null && <>, account was {age < 60 ? `${age} min` : `${Math.round(age / 60)} h`} old when posting</>}
                        </>
                      ) : 'unknown account'}
                      {' '}· {new Date(p.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-300 flex-shrink-0">{p.category}</span>
                </div>
                <p className="mt-3 text-sm text-gray-300 whitespace-pre-wrap break-words line-clamp-6">{p.content}</p>
                {urls.length > 0 && (
                  <ul className="mt-2 text-xs text-gray-400 space-y-0.5">
                    {urls.map(u => <li key={u} className="truncate">link: {u}</li>)}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => act(p.id, 'publish')} disabled={busy === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-sm font-medium disabled:opacity-50">
                    {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Publish
                  </button>
                  <button onClick={() => act(p.id, 'reject')} disabled={busy === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" /> Reject
                  </button>
                  <button onClick={() => act(p.id, 'ban')} disabled={busy === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-sm font-medium disabled:opacity-50">
                    <ShieldBan className="h-3.5 w-3.5" /> Ban account
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
