'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MapPin, Search, Trash2, Check } from 'lucide-react'
import { VEGAN_LEVEL_LABEL } from '@/lib/vegan-level'

export interface DraftRow {
  id: string
  name: string
  city: string | null
  country: string | null
  address: string | null
  website: string | null
  latitude: number
  longitude: number
  vegan_level: string | null
  vegan_evidence: Array<{ rule: string; match?: string }> | null
  decision_reason: string | null
  raw: {
    name_local?: string | null
    category?: string | null
    subcategory?: string | null
    status?: string | null
    status_evidence?: string | null
    instagram?: string | null
    facebook?: string | null
    sources?: string[]
    geo_precision?: string | null
    notes?: string | null
  }
}

const LEVELS = ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options']
const CATEGORIES = ['eat', 'store', 'hotel', 'organisation', 'other']
const STATUS_CLASS: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800',
  likely_open: 'bg-teal-100 text-teal-800',
  unknown: 'bg-stone-100 text-stone-600',
}

export default function DraftPlaceRow({ draft }: { draft: DraftRow }) {
  const r = draft.raw || {}
  const approx = r.geo_precision === 'city'
  const [level, setLevel] = useState(LEVELS.includes(draft.vegan_level || '') ? draft.vegan_level! : '')
  const [category, setCategory] = useState(r.category || 'eat')
  const [address, setAddress] = useState(draft.address || '')
  const [coords, setCoords] = useState(approx ? '' : `${draft.latitude}, ${draft.longitude}`)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<{ kind: 'published' | 'deleted'; slug?: string } | null>(null)

  const query = encodeURIComponent(`${draft.name} ${draft.city || ''} ${draft.country || ''}`)
  const isOrg = category === 'organisation' || category === 'other'

  const publish = async () => {
    setErr(null)
    const m = coords.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
    if (approx && !m) { setErr('Location is only the city centre: paste "lat, lng" from Google Maps first'); return }
    if (!isOrg && !level) { setErr('Pick a vegan level'); return }
    setBusy('publish')
    try {
      const res = await fetch(`/api/admin/data-quality/drafts/${draft.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vegan_level: isOrg ? null : level, category, subcategory: r.subcategory, address: address || undefined, latitude: m ? +m[1] : undefined, longitude: m ? +m[2] : undefined }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `${res.status}`)
      setDone({ kind: 'published', slug: j.slug })
    } catch (e: any) { setErr(e?.message || 'failed') } finally { setBusy(null) }
  }

  const remove = async () => {
    if (!confirm(`Delete the draft "${draft.name}" for good? This cannot be undone.`)) return
    setBusy('delete'); setErr(null)
    try {
      const res = await fetch(`/api/admin/data-quality/drafts/${draft.id}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `${res.status}`)
      setDone({ kind: 'deleted' })
    } catch (e: any) { setErr(e?.message || 'failed') } finally { setBusy(null) }
  }

  if (done) {
    return (
      <tr className="border-t border-outline-variant/20">
        <td colSpan={4} className="px-3 py-2 text-xs italic text-on-surface-variant">
          {draft.name}: {done.kind === 'published'
            ? <>published{done.slug && <> · <Link href={`/place/${done.slug}`} target="_blank" className="text-primary hover:underline">open place</Link></>}</>
            : 'deleted'}
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t border-outline-variant/20 align-top">
      <td className="px-3 py-2 max-w-xs">
        <div className="font-medium">{draft.name}</div>
        {r.name_local && <div className="text-xs text-on-surface-variant">{r.name_local}</div>}
        <div className="text-xs text-on-surface-variant">{draft.city}</div>
        <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
          {draft.vegan_level && <span className="px-1.5 rounded bg-surface-container">research: {VEGAN_LEVEL_LABEL[draft.vegan_level] || draft.vegan_level}</span>}
          {r.status && <span className={`px-1.5 rounded ${STATUS_CLASS[r.status] || 'bg-stone-100'}`}>{r.status.replace('_', ' ')}</span>}
          {approx && <span className="px-1.5 rounded bg-amber-100 text-amber-900">pin = city centre</span>}
        </div>
      </td>
      <td className="px-3 py-2 text-xs max-w-md space-y-1">
        {draft.vegan_evidence?.[0]?.match && <p><span className="font-medium">Vegan:</span> {draft.vegan_evidence[0].match}</p>}
        {r.status_evidence && <p><span className="font-medium">Open:</span> {r.status_evidence}</p>}
        {draft.decision_reason && <p className="text-on-surface-variant">{draft.decision_reason}</p>}
      </td>
      <td className="px-3 py-2 text-[11px]">
        <div className="flex flex-wrap gap-1 max-w-[14rem]">
          <a href={`https://www.google.com/maps/search/${query}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"><MapPin className="h-3 w-3" />Maps</a>
          <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-100 text-stone-700 hover:bg-stone-200 font-medium"><Search className="h-3 w-3" />Google</a>
          {r.instagram && <a href={r.instagram} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-pink-50 text-pink-700 hover:bg-pink-100 font-medium">Instagram</a>}
          {draft.website && <a href={draft.website} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-stone-100 text-stone-700 hover:bg-stone-200 font-medium">Website</a>}
          {(r.sources || []).filter(s => s.startsWith('http')).slice(0, 4).map((s, i) => (
            <a key={s} href={s} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high">src {i + 1}</a>
          ))}
        </div>
      </td>
      <td className="px-3 py-2 text-xs w-64">
        <div className="flex gap-1 mb-1">
          <select value={category} onChange={e => setCategory(e.target.value)} className="px-1 py-0.5 rounded border border-outline-variant/40 bg-surface-container-lowest">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {!isOrg && (
            <select value={level} onChange={e => setLevel(e.target.value)} className="px-1 py-0.5 rounded border border-outline-variant/40 bg-surface-container-lowest">
              <option value="">vegan level…</option>
              {LEVELS.map(l => <option key={l} value={l}>{VEGAN_LEVEL_LABEL[l]}</option>)}
            </select>
          )}
        </div>
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="address" className="w-full mb-1 px-1 py-0.5 rounded border border-outline-variant/40 bg-surface-container-lowest" />
        <input value={coords} onChange={e => setCoords(e.target.value)} placeholder="lat, lng (paste from Google Maps)" className={`w-full mb-1 px-1 py-0.5 rounded border bg-surface-container-lowest ${approx && !coords ? 'border-amber-500' : 'border-outline-variant/40'}`} />
        <div className="flex gap-1">
          <button onClick={publish} disabled={!!busy} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 font-medium">
            {busy === 'publish' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Publish
          </button>
          <button onClick={remove} disabled={!!busy} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 font-medium">
            {busy === 'delete' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}Delete
          </button>
        </div>
        {err && <p className="mt-1 text-red-700">{err}</p>}
      </td>
    </tr>
  )
}
