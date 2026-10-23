'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgePercent, Loader2, Pause, Pencil, Play, Plus } from 'lucide-react'
import { track } from '@/lib/analytics'
import { useToolPlace } from './useToolPlace'

interface Deal {
  id: string
  title: string
  details: string | null
  audience: 'everyone' | 'supporters'
  starts_on: string
  ends_on: string | null
  status: 'active' | 'paused'
}

interface Draft { id?: string; title: string; details: string; audience: 'everyone' | 'supporters'; starts_on: string; ends_on: string }

const today = () => new Date().toISOString().slice(0, 10)
const empty = (): Draft => ({ title: '', details: '', audience: 'everyone', starts_on: today(), ends_on: '' })

function dealState(d: Deal): string {
  if (d.status === 'paused') return 'Paused'
  if (d.starts_on > today()) return `Starts ${new Date(d.starts_on + 'T00:00:00Z').toLocaleDateString()}`
  if (d.ends_on && d.ends_on < today()) return 'Ended'
  return 'Live on your page'
}

export default function DealsManager({ placeId }: { placeId: string }) {
  const { place, plan, isAdmin, error } = useToolPlace(placeId)
  const [deals, setDeals] = useState<Deal[] | null>(null)
  const [max, setMax] = useState(3)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [locked, setLocked] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/business/places/${placeId}/deals`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (r.status === 402) { setLocked(true); setDeals([]); return }
        if (!r.ok) { setMsg({ kind: 'error', text: d.error || 'Deals could not be loaded.' }); setDeals([]); return }
        setDeals(d.deals)
        setMax(d.max ?? 3)
      })
      .catch(() => setDeals([]))
  }, [placeId])
  useEffect(() => { load() }, [load])

  if (error) return <p className="text-on-surface">{error}</p>
  if (!place || deals === null) return <div className="flex items-center gap-2 text-on-surface-variant py-16"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>
  if (locked) {
    return (
      <div className="rounded-2xl ghost-border bg-surface-container-lowest p-8">
        <h1 className="font-headline font-extrabold text-2xl text-on-surface mb-2">Deals are part of the Partner plan</h1>
        <p className="text-on-surface-variant mb-4">Show up to 3 deals on your page and in the PlantsPack app.</p>
        <Link href={`/business/places/${placeId}/plan`} className="inline-flex px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium">See the Partner plan</Link>
      </div>
    )
  }

  // Ended deals no longer count towards the limit.
  const activeCount = deals.filter((d) => d.status === 'active' && (!d.ends_on || d.ends_on >= today())).length

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setMsg(null)
    const r = await fetch(`/api/business/places/${placeId}/deals`, {
      method: draft.id ? 'PATCH' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, ends_on: draft.ends_on || null }),
    }).catch(() => null)
    const d = r ? await r.json().catch(() => ({})) : {}
    setSaving(false)
    if (!r?.ok) { setMsg({ kind: 'error', text: d.error || 'Saving failed.' }); return }
    track('owner_tool_used', { tool: 'deals', action: draft.id ? 'edit' : 'create' })
    setMsg({ kind: 'ok', text: draft.id ? 'Deal updated.' : 'Deal saved. It shows on your page within a minute.' })
    setDraft(null)
    load()
  }

  const setStatus = async (deal: Deal, status: 'active' | 'paused') => {
    setMsg(null)
    const r = await fetch(`/api/business/places/${placeId}/deals`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deal.id, status }),
    }).catch(() => null)
    const d = r ? await r.json().catch(() => ({})) : {}
    if (!r?.ok) { setMsg({ kind: 'error', text: d.error || 'Saving failed.' }); return }
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">Deals</h1>
        <p className="text-on-surface-variant mt-1">
          Deals show on your PlantsPack page and in the app, marked as a deal from you. Up to {max} can be live at once. Deals never change your position in lists.
        </p>
        {isAdmin && plan?.plan !== 'partner' && (
          <p className="mt-2 text-sm text-on-surface-variant">Admin: this place has no Partner plan, so its deals are saved but not shown publicly.</p>
        )}
      </div>

      {draft ? (
        <section className="rounded-2xl ghost-border bg-surface-container-lowest p-5 space-y-3">
          <h2 className="font-semibold text-on-surface">{draft.id ? 'Edit deal' : 'New deal'}</h2>
          <label className="block text-sm text-on-surface">
            Title
            <input value={draft.title} maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="10% off every lunch on weekdays" className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-container-low ghost-border" />
          </label>
          <label className="block text-sm text-on-surface">
            Details (optional)
            <textarea value={draft.details} maxLength={400} rows={3} onChange={(e) => setDraft({ ...draft, details: e.target.value })} placeholder="How it works, what is included, any limits." className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-container-low ghost-border" />
          </label>
          <fieldset className="text-sm text-on-surface">
            <legend className="mb-1">Who can use it</legend>
            <label className="mr-4 inline-flex items-center gap-2"><input type="radio" checked={draft.audience === 'everyone'} onChange={() => setDraft({ ...draft, audience: 'everyone' })} className="accent-primary" /> Everyone</label>
            <label className="inline-flex items-center gap-2"><input type="radio" checked={draft.audience === 'supporters'} onChange={() => setDraft({ ...draft, audience: 'supporters' })} className="accent-primary" /> PlantsPack supporters only</label>
          </fieldset>
          <div className="flex flex-wrap gap-4">
            <label className="text-sm text-on-surface">Starts<input type="date" value={draft.starts_on} onChange={(e) => setDraft({ ...draft, starts_on: e.target.value })} className="mt-1 block px-3 py-2 rounded-lg bg-surface-container-low ghost-border" /></label>
            <label className="text-sm text-on-surface">Ends (optional)<input type="date" value={draft.ends_on} min={draft.starts_on} onChange={(e) => setDraft({ ...draft, ends_on: e.target.value })} className="mt-1 block px-3 py-2 rounded-lg bg-surface-container-low ghost-border" /></label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={save} disabled={saving || draft.title.trim().length < 3} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {draft.id ? 'Save changes' : 'Publish deal'}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:underline">Cancel</button>
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => setDraft(empty())} disabled={activeCount >= max} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium disabled:opacity-50">
          <Plus className="h-4 w-4" /> New deal
        </button>
      )}
      {activeCount >= max && !draft && <p className="text-sm text-on-surface-variant">You have {max} live deals. Pause one to add another.</p>}

      {msg && <div className={`p-3 rounded-xl text-sm ${msg.kind === 'ok' ? 'bg-primary/10 text-on-surface' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}

      <section className="space-y-3">
        {deals.length === 0 && <p className="text-on-surface-variant">No deals yet. A simple, clear offer works best, for example a free drink with a lunch menu.</p>}
        {deals.map((d) => (
          <div key={d.id} className="rounded-2xl ghost-border bg-surface-container-lowest p-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-semibold text-on-surface"><BadgePercent className="h-4 w-4 text-primary" /> {d.title}</div>
              {d.details && <p className="text-sm text-on-surface-variant mt-1">{d.details}</p>}
              <p className="text-xs text-on-surface-variant mt-1">
                {dealState(d)} · {d.audience === 'supporters' ? 'Supporters only' : 'Everyone'}{d.ends_on ? ` · until ${new Date(d.ends_on + 'T00:00:00Z').toLocaleDateString()}` : ''}
              </p>
            </div>
            <div className="flex gap-1">
              <button type="button" aria-label="Edit deal" onClick={() => setDraft({ id: d.id, title: d.title, details: d.details || '', audience: d.audience, starts_on: d.starts_on, ends_on: d.ends_on || '' })} className="p-2 rounded-lg ghost-border text-on-surface hover:bg-surface-container-low"><Pencil className="h-4 w-4" /></button>
              {d.status === 'active'
                ? <button type="button" aria-label="Pause deal" onClick={() => setStatus(d, 'paused')} className="p-2 rounded-lg ghost-border text-on-surface hover:bg-surface-container-low"><Pause className="h-4 w-4" /></button>
                : <button type="button" aria-label="Resume deal" onClick={() => setStatus(d, 'active')} className="p-2 rounded-lg ghost-border text-on-surface hover:bg-surface-container-low"><Play className="h-4 w-4" /></button>}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
