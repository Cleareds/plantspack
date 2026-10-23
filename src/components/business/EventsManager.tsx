'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarPlus, Loader2, Sparkles, XCircle } from 'lucide-react'
import { track } from '@/lib/analytics'

interface Ev {
  id: string
  slug: string | null
  title: string | null
  content: string
  privacy: string
  event_data: { start_time?: string; end_time?: string; ticket_url?: string; cancelled?: boolean } | null
}

interface Info { events: Ev[]; featuredThisMonth: string | null; canFeature: boolean; isPartner: boolean; preview: boolean }

interface Draft { postId?: string; title: string; description: string; start: string; end: string; ticket: string }

const toLocalInput = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

export default function EventsManager({ placeId }: { placeId: string }) {
  const [info, setInfo] = useState<Info | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const load = useCallback(() => {
    fetch(`/api/business/places/${placeId}/events`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) { setError(d.error || 'Events could not be loaded.'); return }
        setInfo(d)
      })
      .catch(() => setError('Events could not be loaded.'))
  }, [placeId])
  useEffect(() => { load() }, [load])

  const call = async (method: 'POST' | 'PATCH', body: Record<string, unknown>, okText: string) => {
    setBusy(true)
    setMsg(null)
    const r = await fetch(`/api/business/places/${placeId}/events`, {
      method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).catch(() => null)
    const d = r ? await r.json().catch(() => ({})) : {}
    setBusy(false)
    if (!r?.ok) { setMsg({ kind: 'error', text: d.error || 'Saving failed.' }); return false }
    setMsg({ kind: 'ok', text: okText })
    load()
    return true
  }

  const save = async () => {
    if (!draft) return
    const start = draft.start ? new Date(draft.start).toISOString() : ''
    const end = draft.end ? new Date(draft.end).toISOString() : ''
    const ok = draft.postId
      ? await call('PATCH', { postId: draft.postId, action: 'edit', description: draft.description, start_time: start, end_time: end, ticket_url: draft.ticket }, 'Event updated.')
      : await call('POST', { title: draft.title, description: draft.description, start_time: start, end_time: end, ticket_url: draft.ticket }, info?.preview ? 'Event saved as a draft (owner tools are in preview).' : 'Event published in the events calendar and on your page.')
    if (ok) {
      track('owner_tool_used', { tool: 'events', action: draft.postId ? 'edit' : 'create' })
      setDraft(null)
    }
  }

  if (error) return <p className="text-on-surface">{error}</p>
  if (!info) return <div className="flex items-center gap-2 text-on-surface-variant py-16"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>

  const now = Date.now()
  const upcoming = info.events.filter((e) => e.event_data?.start_time && Date.parse(e.event_data.start_time) >= now && !e.event_data?.cancelled)
  const past = info.events.filter((e) => !upcoming.includes(e))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">Events</h1>
        <p className="text-on-surface-variant mt-1">
          Add tastings, workshops, live music or anything else at your place. Events appear in the PlantsPack events calendar and on your page, free.
          With the Partner plan you can feature one event a month at the top of the calendar, marked as sponsored.
        </p>
        {info.preview && <p className="mt-2 text-sm text-on-surface-variant">Owner tools are in preview: new events are saved as drafts and are not public yet.</p>}
      </div>

      {draft ? (
        <section className="rounded-2xl ghost-border bg-surface-container-lowest p-5 space-y-3">
          <h2 className="font-semibold text-on-surface">{draft.postId ? 'Edit event' : 'New event'}</h2>
          <label className="block text-sm text-on-surface">
            Title{draft.postId ? ' (fixed after publishing)' : ''}
            <input value={draft.title} disabled={!!draft.postId} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Vegan wine and cheese evening" className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-container-low ghost-border disabled:opacity-60" />
          </label>
          <label className="block text-sm text-on-surface">
            Description
            <textarea value={draft.description} maxLength={2000} rows={4} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What happens, what it costs, whether people need to book." className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-container-low ghost-border" />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="text-sm text-on-surface">Starts<input type="datetime-local" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className="mt-1 block px-3 py-2 rounded-lg bg-surface-container-low ghost-border" /></label>
            <label className="text-sm text-on-surface">Ends (optional)<input type="datetime-local" value={draft.end} min={draft.start} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className="mt-1 block px-3 py-2 rounded-lg bg-surface-container-low ghost-border" /></label>
          </div>
          <label className="block text-sm text-on-surface">
            Ticket or booking link (optional)
            <input value={draft.ticket} onChange={(e) => setDraft({ ...draft, ticket: e.target.value })} placeholder="https://" className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-container-low ghost-border" />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={busy || (!draft.postId && draft.title.trim().length < 3) || !draft.start} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {draft.postId ? 'Save changes' : 'Publish event'}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:underline">Cancel</button>
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => setDraft({ title: '', description: '', start: '', end: '', ticket: '' })} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium">
          <CalendarPlus className="h-4 w-4" /> New event
        </button>
      )}

      {msg && <div className={`p-3 rounded-xl text-sm ${msg.kind === 'ok' ? 'bg-primary/10 text-on-surface' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}

      <section className="space-y-3">
        <h2 className="font-semibold text-on-surface">Upcoming</h2>
        {upcoming.length === 0 && <p className="text-sm text-on-surface-variant">No upcoming events.</p>}
        {upcoming.map((e) => {
          const featured = info.featuredThisMonth === e.id
          return (
            <div key={e.id} className={`rounded-2xl p-4 flex flex-wrap items-start justify-between gap-3 ${featured ? 'border-2 border-primary/50 bg-primary/5' : 'ghost-border bg-surface-container-lowest'}`}>
              <div className="min-w-0">
                <div className="font-semibold text-on-surface">{e.title || e.content.slice(0, 80)}</div>
                <div className="text-sm text-on-surface-variant">{fmt(e.event_data?.start_time)}{e.privacy !== 'public' ? ' · draft' : ''}{featured ? ' · featured this month' : ''}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setDraft({ postId: e.id, title: e.title || '', description: e.content, start: toLocalInput(e.event_data?.start_time), end: toLocalInput(e.event_data?.end_time), ticket: e.event_data?.ticket_url || '' })} className="px-3 py-1.5 rounded-lg ghost-border text-sm font-medium text-on-surface hover:bg-surface-container-low">Edit</button>
                {!featured && (
                  info.canFeature
                    ? <button type="button" disabled={busy} onClick={() => call('PATCH', { postId: e.id, action: 'feature' }, 'Featured at the top of the events calendar this month, marked as sponsored.')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary-btn text-sm font-medium"><Sparkles className="h-3.5 w-3.5" /> Feature this month</button>
                    : <Link href={`/business/places/${placeId}/plan`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ghost-border text-sm font-medium text-on-surface-variant"><Sparkles className="h-3.5 w-3.5" /> Feature (Partner)</Link>
                )}
                <button type="button" disabled={busy} onClick={() => confirm('Cancel this event? It stays listed as cancelled.') && call('PATCH', { postId: e.id, action: 'cancel' }, 'Event marked as cancelled.')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ghost-border text-sm font-medium text-on-surface-variant hover:text-red-700"><XCircle className="h-3.5 w-3.5" /> Cancel</button>
              </div>
            </div>
          )
        })}
        {info.featuredThisMonth && info.isPartner === false && info.canFeature && (
          <p className="text-xs text-on-surface-variant">Admin: this place has no Partner plan, so the feature is saved but not shown publicly.</p>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-on-surface">Past and cancelled</h2>
          {past.map((e) => (
            <div key={e.id} className="text-sm text-on-surface-variant">{e.title || e.content.slice(0, 80)} · {fmt(e.event_data?.start_time)}{e.event_data?.cancelled ? ' · cancelled' : ''}</div>
          ))}
        </section>
      )}
    </div>
  )
}
