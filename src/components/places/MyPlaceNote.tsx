'use client'

import { useEffect, useState } from 'react'
import { StickyNote, Pencil } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// Private per-place note ("what I ordered, who I was with"). Owner-only RLS —
// no other user can ever read it. Renders nothing when signed out. Mirrors the
// mobile app's MyPlaceNote.
export default function MyPlaceNote({ placeId }: { placeId: string }) {
  const { user } = useAuth()
  const [note, setNote] = useState<string | null>(null) // null = not loaded
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('user_place_notes')
      .select('note')
      .eq('user_id', user.id)
      .eq('place_id', placeId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setNote(data?.note ?? '') })
    return () => { cancelled = true }
  }, [user, placeId])

  if (!user || note === null) return null

  const save = async () => {
    const trimmed = draft.trim().slice(0, 2000)
    setSaving(true)
    if (trimmed) {
      await supabase.from('user_place_notes').upsert(
        { user_id: user.id, place_id: placeId, note: trimmed, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,place_id' },
      )
    } else {
      await supabase.from('user_place_notes').delete().eq('user_id', user.id).eq('place_id', placeId)
    }
    setNote(trimmed)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
          <StickyNote className="h-4 w-4 text-primary" />
          My note
          <span className="ml-auto text-xs font-normal text-on-surface-variant">Only you can see this</span>
        </div>
        <textarea
          className="mt-2 w-full rounded-md border border-outline-variant/30 bg-surface p-2 text-sm text-on-surface"
          rows={3}
          maxLength={2000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What did you eat? Who were you with? What's worth ordering again?"
          autoFocus
        />
        <div className="mt-2 flex justify-end gap-3">
          <button className="text-sm text-on-surface-variant" onClick={() => { setEditing(false); setDraft(note) }}>
            Cancel
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>
    )
  }

  if (note) {
    return (
      <button
        className="mt-3 block w-full rounded-lg border border-primary/20 bg-primary/5 p-3 text-left"
        onClick={() => { setDraft(note); setEditing(true) }}
        aria-label="Edit my note"
      >
        <div className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
          <StickyNote className="h-4 w-4 text-primary" />
          My note
          <Pencil className="ml-auto h-3.5 w-3.5 text-on-surface-variant" />
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface">{note}</p>
      </button>
    )
  }

  return (
    <button
      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      onClick={() => { setDraft(''); setEditing(true) }}
    >
      <StickyNote className="h-4 w-4" />
      Add a private note
    </button>
  )
}
