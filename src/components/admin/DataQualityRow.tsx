'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, RotateCcw, Loader2, MapPin, Search, ExternalLink, Trash2, XOctagon } from 'lucide-react'
import { VEGAN_LEVEL_LABEL } from '@/lib/vegan-level'

export interface DataQualityRowProps {
  place: {
    id: string
    slug: string | null
    name: string
    city: string | null
    country: string
    address: string | null
    description: string | null
    main_image_url: string | null
    images: string[] | null
    opening_hours: any
    review_count: number | null
    average_rating: number | null
    latitude: number | null
    longitude: number | null
    phone: string | null
    website: string | null
    vegan_level: string | null
    verification_level: number | null
    verification_method: string | null
    last_verified_at: string | null
    source: string | null
    admin_notes: string | null
  }
}

const VL_CLASS: Record<string, string> = {
  fully_vegan: 'bg-emerald-100 text-emerald-800',
  mostly_vegan: 'bg-teal-100 text-teal-800',
  vegan_friendly: 'bg-stone-100 text-stone-700',
  vegan_options: 'bg-stone-100 text-stone-600',
}

function YesNo({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span title={label} className={`inline-flex items-center text-[10px] font-medium ${ok ? 'text-emerald-700' : 'text-stone-400'}`}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span className="ml-0.5">{label}</span>
    </span>
  )
}

export default function DataQualityRow({ place }: DataQualityRowProps) {
  const [verified, setVerified] = useState((place.verification_level ?? 0) >= 3)
  const [notes, setNotes] = useState(place.admin_notes || '')
  const [savedNotes, setSavedNotes] = useState(place.admin_notes || '')
  const [veganLevel, setVeganLevel] = useState(place.vegan_level || '')
  const [busy, setBusy] = useState<string | null>(null)
  const [archived, setArchived] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const hasImage = !!(place.main_image_url || (place.images && place.images.length > 0))
  const hasHours = !!place.opening_hours && Object.keys(place.opening_hours || {}).length > 0
  const descLen = (place.description || '').length
  const hasDesc = descLen > 40
  const hasGoodDesc = descLen > 120

  const lat = place.latitude
  const lon = place.longitude
  const placeQuery = encodeURIComponent(`${place.name} ${place.city || ''} ${place.country}`)
  const mapsUrl = lat && lon
    ? `https://www.google.com/maps/?q=${lat},${lon}`
    : `https://www.google.com/maps/search/${placeQuery}`
  const googleSearchUrl = `https://www.google.com/search?q=${placeQuery}`
  const happycowUrl = `https://www.happycow.net/searchmap?s=${placeQuery}`
  const osmUrl = lat && lon ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=18` : null

  async function postJson(url: string, body: any) {
    setErr(null)
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.error || `${res.status}`)
    }
    return res.json()
  }

  const onConfirm = async () => {
    setBusy('verify')
    try {
      await postJson(`/api/admin/places/${place.id}/verify`, { unverify: false, admin_notes: notes !== savedNotes ? notes : undefined })
      setVerified(true); setSavedNotes(notes)
    } catch (e: any) { setErr(e?.message || 'failed') } finally { setBusy(null) }
  }
  const onUnverify = async () => {
    setBusy('verify')
    try { await postJson(`/api/admin/places/${place.id}/verify`, { unverify: true }); setVerified(false) }
    catch (e: any) { setErr(e?.message || 'failed') } finally { setBusy(null) }
  }
  const onSaveNotes = async () => {
    if (notes === savedNotes) return
    setBusy('notes')
    try { await postJson(`/api/admin/places/${place.id}/notes`, { admin_notes: notes }); setSavedNotes(notes) }
    catch (e: any) { setErr(e?.message || 'failed') } finally { setBusy(null) }
  }
  const onArchive = async () => {
    if (!confirm(`Archive "${place.name}" as permanently closed?`)) return
    const reason = prompt('Reason (e.g. "permanently closed per Google"):', 'permanently closed')
    if (!reason) return
    setBusy('archive')
    try { await postJson(`/api/admin/places/${place.id}/archive`, { reason }); setArchived(true) }
    catch (e: any) { setErr(e?.message || 'failed') } finally { setBusy(null) }
  }
  const onChangeLevel = async (newLevel: string) => {
    if (newLevel === veganLevel) return
    setBusy('level')
    try {
      // Send any unsaved notes alongside the level change so they're
      // persisted in the same call — avoids losing notes when the
      // dropdown change races the textarea blur handler.
      const payload: any = { vegan_level: newLevel }
      if (notes !== savedNotes) payload.admin_notes = notes
      await postJson(`/api/admin/places/${place.id}/level`, payload)
      setVeganLevel(newLevel)
      setVerified(true)  // setting level via admin counts as verified
      if (notes !== savedNotes) setSavedNotes(notes)
    } catch (e: any) { setErr(e?.message || 'failed') } finally { setBusy(null) }
  }
  const onDelete = async () => {
    // Hard-deletes are forbidden by project policy ("never delete data
    // silently"). This soft-archives with a distinct reason so the row
    // is removed from the public site but recoverable. The double prompt
    // mirrors the "Yes delete" confirmation rule.
    const ok1 = confirm(`Remove "${place.name}" from the platform? (Soft-archive — data is preserved.)`)
    if (!ok1) return
    const confirmText = prompt('To confirm, type DELETE:')
    if (confirmText !== 'DELETE') { setErr('Not confirmed — type DELETE in the prompt.'); return }
    const reason = prompt('Reason (e.g. "spam", "wrong country", "duplicate"):', 'admin_deleted')
    if (!reason) return
    setBusy('delete')
    try { await postJson(`/api/admin/places/${place.id}/archive`, { reason: `admin_deleted: ${reason}` }); setArchived(true) }
    catch (e: any) { setErr(e?.message || 'failed') } finally { setBusy(null) }
  }

  if (archived) {
    return (
      <tr className="border-t border-outline-variant/15 bg-red-50/50">
        <td colSpan={5} className="px-3 py-2 text-xs text-red-700 italic">
          Archived: {place.name} — refresh to remove from view.
        </td>
      </tr>
    )
  }

  const lastVerified = place.last_verified_at ? new Date(place.last_verified_at).toISOString().slice(0, 10) : null

  return (
    <tr className={`border-t border-outline-variant/15 ${verified ? 'bg-emerald-50/40' : ''}`}>
      <td className="px-3 py-2 align-top">
        <div className="flex items-start gap-2">
          {hasImage ? (
            <img src={place.main_image_url || (place.images && place.images[0]) || ''} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-md bg-stone-100 flex items-center justify-center text-xs text-stone-400 flex-shrink-0">No img</div>
          )}
          <div className="min-w-0">
            <Link href={`/place/${place.slug || place.id}`} target="_blank" className="font-medium text-on-surface hover:text-primary text-sm">{place.name}</Link>
            {place.address && <div className="text-[11px] text-on-surface-variant truncate max-w-xs">{place.address}</div>}
            <div className="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant">
              {place.review_count != null && place.review_count > 0 && (
                <span title="reviews on PlantsPack">★ {(place.average_rating || 0).toFixed(1)} · {place.review_count}</span>
              )}
              {place.source && <span title="import source">{place.source}</span>}
              {lastVerified && <span title="last verified">verif {lastVerified}</span>}
            </div>
          </div>
        </div>
      </td>

      <td className="px-3 py-2 whitespace-nowrap align-top">
        <div className="flex flex-col gap-1">
          {/* Inline level selector — changes count as admin-review (level 3). */}
          <select
            value={veganLevel}
            disabled={busy === 'level'}
            onChange={e => onChangeLevel(e.target.value)}
            className={`text-xs px-1.5 py-0.5 rounded border-0 cursor-pointer font-medium ${VL_CLASS[veganLevel] || 'bg-stone-100'}`}
            title="Change vegan level (counts as admin verification)"
          >
            <option value="fully_vegan">100% Vegan</option>
            <option value="mostly_vegan">Mostly Vegan</option>
            <option value="vegan_friendly">Vegan-Friendly</option>
            <option value="vegan_options">Has Vegan Options</option>
          </select>
          {busy === 'level' && <span className="text-[10px] text-stone-500">saving…</span>}
          <div className="flex flex-col gap-0.5 text-[10px] mt-1">
            <YesNo ok={!!place.website} label="web" />
            <YesNo ok={!!place.phone} label="phone" />
            <YesNo ok={hasHours} label="hours" />
            <YesNo ok={hasImage} label="img" />
            <YesNo ok={hasGoodDesc} label={hasDesc ? `desc ${descLen}` : 'desc'} />
          </div>
        </div>
      </td>

      <td className="px-3 py-2 align-top">
        <div className="flex flex-col gap-1.5">
          {/* External verification quick-links */}
          <div className="flex items-center gap-1.5">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Google Maps" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-medium">
              <MapPin className="h-3 w-3" /> Maps
            </a>
            <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer" title="Google Search" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-100 text-stone-700 hover:bg-stone-200 text-[11px] font-medium">
              <Search className="h-3 w-3" /> Google
            </a>
            <a href={happycowUrl} target="_blank" rel="noopener noreferrer" title="HappyCow search" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 text-[11px] font-medium">
              <ExternalLink className="h-3 w-3" /> HC
            </a>
          </div>
          {place.website && (
            <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[11px] truncate max-w-[14rem]">{place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
          )}
          {place.phone && (
            <a href={`tel:${place.phone}`} className="text-primary hover:underline text-[11px]">{place.phone}</a>
          )}
        </div>
      </td>

      <td className="px-3 py-2 align-top min-w-[14rem]">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={onSaveNotes}
          placeholder="Verification notes…"
          rows={2}
          className="w-full text-xs px-2 py-1 rounded border border-outline-variant/40 bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:border-primary placeholder-stone-400 resize-y min-h-[2.5rem]"
        />
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] text-stone-500">{notes !== savedNotes ? 'unsaved' : ''}{busy === 'notes' ? ' · saving…' : ''}</span>
          {notes !== savedNotes && (
            <button onClick={onSaveNotes} disabled={busy === 'notes'} className="text-[10px] text-primary hover:underline">save</button>
          )}
        </div>
      </td>

      <td className="px-3 py-2 align-top whitespace-nowrap">
        {err && <div className="text-[10px] text-red-600 mb-1">{err}</div>}
        <div className="flex flex-col gap-1.5">
          {verified ? (
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-[11px] font-medium">
                <Check className="h-3 w-3" /> Verified
              </span>
              <button onClick={onUnverify} disabled={busy === 'verify'} title="Revert" className="text-stone-500 hover:text-red-600 px-1">
                {busy === 'verify' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              </button>
            </div>
          ) : (
            <button onClick={onConfirm} disabled={busy === 'verify'} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary text-on-primary-btn text-[11px] font-medium hover:opacity-90 disabled:opacity-50">
              {busy === 'verify' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Confirm
            </button>
          )}
          <button onClick={onArchive} disabled={busy === 'archive'} title="Mark as permanently closed" className="inline-flex items-center gap-1 px-2 py-1 rounded text-red-700 hover:bg-red-50 text-[11px]">
            {busy === 'archive' ? <Loader2 className="h-3 w-3 animate-spin" /> : <XOctagon className="h-3 w-3" />} Closed
          </button>
          <button onClick={onDelete} disabled={busy === 'delete'} title="Remove from platform (soft-archive with admin_deleted reason)" className="inline-flex items-center gap-1 px-2 py-1 rounded text-red-800 bg-red-50 hover:bg-red-100 text-[11px]">
            {busy === 'delete' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete
          </button>
        </div>
      </td>
    </tr>
  )
}
