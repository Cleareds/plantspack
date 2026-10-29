'use client'

import { useEffect, useState } from 'react'
import { Repeat2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { track } from '@/lib/analytics'

// Repost = share a post inside PlantsPack: it shows in the feed with
// "<name> reposted" (post_reposts, same as the apps). The author gets a bell
// notification from the DB trigger notify_post_repost. External sharing is
// the separate Share button.
export default function RepostButton({
  postId, isOwnPost, initial, onNeedSignIn,
}: {
  postId: string
  isOwnPost: boolean
  // From the feed query when it has it; otherwise loaded here.
  initial?: { user_id: string }[] | null
  onNeedSignIn: () => void
}) {
  const { user } = useAuth()
  // Shown value: the last toggle here, else the feed's rows, else a lookup.
  const [local, setLocal] = useState<{ count: number; mine: boolean } | null>(null)
  const [fetched, setFetched] = useState<{ count: number; mine: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (initial) return
    let cancelled = false
    ;(async () => {
      const [{ count: c }, me] = await Promise.all([
        supabase.from('post_reposts').select('post_id', { count: 'exact', head: true }).eq('post_id', postId),
        user
          ? supabase.from('post_reposts').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (!cancelled) setFetched({ count: c ?? 0, mine: !!me.data })
    })()
    return () => { cancelled = true }
  }, [postId, user, initial])

  const { count, mine } = local
    ?? (initial ? { count: initial.length, mine: !!user && initial.some((r) => r.user_id === user.id) } : null)
    ?? fetched
    ?? { count: 0, mine: false }

  const toggle = async () => {
    if (!user) { onNeedSignIn(); return }
    if (busy) return
    if (mine && !window.confirm('Undo repost? The post leaves your followers’ feeds.')) return
    const next = !mine
    const before = { count, mine }
    setBusy(true)
    setLocal({ count: Math.max(0, count + (next ? 1 : -1)), mine: next })
    try {
      const { error } = next
        ? await supabase.from('post_reposts').insert({ post_id: postId, user_id: user.id })
        : await supabase.from('post_reposts').delete().eq('post_id', postId).eq('user_id', user.id)
      if (error && error.code !== '23505') throw error
      track(next ? 'post_reposted' : 'post_unreposted')
    } catch (e) {
      setLocal(before)
      console.error('Repost failed:', e)
    } finally {
      setBusy(false)
    }
  }

  // Own posts: show the count only (no reposting yourself).
  if (isOwnPost) {
    return count > 0 ? (
      <span className="flex items-center space-x-1 px-2 py-1 text-outline" title={`${count} reposts`}>
        <Repeat2 className="h-5 w-5" />
        <span className="text-sm">{count}</span>
      </span>
    ) : null
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={mine}
      aria-label={mine ? 'Undo repost' : 'Repost'}
      className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${mine ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
    >
      <Repeat2 className="h-5 w-5" />
      <span className="text-sm">{count > 0 ? count : <span className="hidden sm:inline">Repost</span>}</span>
    </button>
  )
}
