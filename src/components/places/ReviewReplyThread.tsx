'use client'

/**
 * Render any owner/admin replies under a review, and (for authorised users)
 * surface a Reply / Edit-reply / Delete-reply inline form. Authorisation is
 * decided server-side by /api/places/[id]/reviews/[reviewId]/reply — the
 * `canReply` prop here just decides whether to show the button. A user who
 * shouldn't be able to reply still hits a 403 if they try via the API.
 */
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { BadgeCheck, ShieldCheck, MessageSquareReply, Pencil, Trash2, X } from 'lucide-react'
import LinkifiedText from '../ui/LinkifiedText'

export interface ReviewReply {
  id: string
  review_id: string
  user_id: string
  author_role: 'owner' | 'admin'
  content: string
  edited_at: string | null
  edit_count: number
  created_at: string
  updated_at: string
  users?: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
}

interface Props {
  placeId: string
  reviewId: string
  replies: ReviewReply[]
  currentUserId?: string | null
  /** True if the current user is either a verified owner of this place OR
   *  a site admin. Server independently checks before persisting. */
  canReply: boolean
  /** Optional callback so parent can keep its local reviews state in sync. */
  onChange?: (next: ReviewReply[]) => void
}

const MAX_LENGTH = 1000

export default function ReviewReplyThread({
  placeId,
  reviewId,
  replies,
  currentUserId,
  canReply,
  onChange,
}: Props) {
  const [items, setItems] = useState<ReviewReply[]>(replies)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const myReply = currentUserId
    ? items.find(r => r.user_id === currentUserId) ?? null
    : null

  function update(next: ReviewReply[]) {
    setItems(next)
    onChange?.(next)
  }

  function openForm(editing: ReviewReply | null) {
    setDraft(editing?.content ?? '')
    setShowForm(true)
    setErr(null)
  }

  async function submit() {
    const trimmed = draft.trim()
    if (!trimmed) { setErr('Reply cannot be empty'); return }
    if (trimmed.length > MAX_LENGTH) { setErr(`Max ${MAX_LENGTH} characters`); return }
    setBusy(true)
    setErr(null)
    try {
      const r = await fetch(`/api/places/${placeId}/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'Failed to post reply')
      const next = [
        ...items.filter(i => i.id !== data.reply.id),
        data.reply,
      ].sort((a, b) => a.created_at.localeCompare(b.created_at))
      update(next)
      setShowForm(false)
      setDraft('')
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to post reply')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!myReply) return
    if (!confirm('Delete your reply?')) return
    setBusy(true)
    try {
      const r = await fetch(`/api/places/${placeId}/reviews/${reviewId}/reply`, {
        method: 'DELETE',
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to delete reply')
      }
      update(items.filter(i => i.id !== myReply.id))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to delete reply')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 space-y-3 border-l-2 border-primary/15 pl-3">
      {items.map(reply => (
        <ReplyCard
          key={reply.id}
          reply={reply}
          isMine={!!currentUserId && reply.user_id === currentUserId}
          onEdit={() => openForm(reply)}
          onDelete={remove}
        />
      ))}

      {canReply && !showForm && (
        <button
          type="button"
          onClick={() => openForm(myReply)}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <MessageSquareReply className="h-4 w-4" />
          {myReply ? 'Edit your reply' : 'Reply as owner / admin'}
        </button>
      )}

      {showForm && (
        <div className="rounded-lg ghost-border bg-surface-container-lowest p-3">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Reply to this review..."
            maxLength={MAX_LENGTH}
            rows={3}
            className="w-full bg-transparent text-sm focus:outline-none resize-none"
            autoFocus
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-on-surface-variant">
              {draft.length} / {MAX_LENGTH}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setDraft(''); setErr(null) }}
                disabled={busy}
                className="px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || !draft.trim()}
                className="px-3 py-1.5 text-sm bg-primary text-on-primary rounded-md font-semibold disabled:opacity-50"
              >
                {busy ? 'Posting...' : myReply ? 'Save edit' : 'Post reply'}
              </button>
            </div>
          </div>
          {err && <p className="mt-2 text-xs text-error">{err}</p>}
        </div>
      )}
    </div>
  )
}

function ReplyCard({
  reply,
  isMine,
  onEdit,
  onDelete,
}: {
  reply: ReviewReply
  isMine: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const isOwner = reply.author_role === 'owner'
  const displayName = reply.users
    ? (reply.users.first_name
        ? `${reply.users.first_name} ${reply.users.last_name ?? ''}`.trim()
        : reply.users.username)
    : (isOwner ? 'Place owner' : 'Plants Pack Team')

  return (
    <div className="rounded-lg bg-surface-container-low/60 p-3">
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <span className="font-semibold text-sm text-on-surface">{displayName}</span>
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
          isOwner
            ? 'bg-emerald-500/15 text-emerald-700'
            : 'bg-primary/15 text-primary'
        }`}>
          {isOwner ? <BadgeCheck className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
          {isOwner ? 'Owner reply' : 'Plants Pack Team'}
        </span>
        <span className="text-xs text-on-surface-variant ml-auto">
          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
          {reply.edited_at && <span className="ml-1 italic">(edited)</span>}
        </span>
      </div>
      <LinkifiedText text={reply.content} className="text-sm text-on-surface leading-relaxed" />
      {isMine && (
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-error"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
