'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle, ExternalLink, Loader2, Search, SkipForward, XOctagon, Leaf, FlaskConical, Flag, Globe, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import { VEGAN_LEVEL_LABEL } from '@/lib/vegan-level'

/**
 * /admin/verify - "Fast verify". One place at a time, the evidence on the
 * screen, one key per decision:
 *   1  Confirm 100% vegan   (verification_level 3, admin_review, is_verified)
 *   2  Mostly vegan         3  Vegan-friendly        (vegan_level changes)
 *   4  Closed               (archive, reason confirmed_closed)
 *   S  Skip                 N  Fetch the website evidence again
 * Any decision resolves the place's open research rows. is_verified is set
 * only here, by a human click: nothing in this page runs unattended.
 */

interface ResearchRow { id: string; note: string | null; corrections: Record<string, unknown> | null; created_at: string }
interface ReportRow { id: string; type: string; note: string | null; created_at: string }
interface QueuePlace {
  id: string; slug: string | null; name: string; city: string | null; country: string; address: string | null
  website: string | null; phone: string | null; opening_hours: unknown; description: string | null
  vegan_level: string | null; verification_level: number | null; verification_method: string | null
  is_verified: boolean | null; last_verified_at: string | null; source: string | null; tags: string[] | null
  main_image_url: string | null; review_count: number | null; average_rating: number | null
  research: ResearchRow[]; reports: ReportRow[]
}
interface Evidence {
  website: string | null
  signal: { ok: boolean; status: number | null; reason: string | null; final_url: string | null; title: string | null; description: string | null; closure_hint: string | null; parking: boolean; menu_links: string[]; lang: string | null } | null
  vegan: { level: string; confidence: number; evidence: Array<{ rule: string; match?: string }> } | null
  quotes?: string[]
  error?: string
}

type Mode = 'fv' | 'research'
type Decision = 'confirm' | 'mostly_vegan' | 'vegan_friendly' | 'closed' | 'skip'

const LEVEL_CLASS: Record<string, string> = {
  fully_vegan: 'bg-emerald-900/50 text-emerald-300',
  mostly_vegan: 'bg-teal-900/50 text-teal-300',
  vegan_friendly: 'bg-stone-700 text-stone-200',
  vegan_options: 'bg-stone-700 text-stone-300',
}

function hoursText(h: unknown): string | null {
  if (!h) return null
  if (typeof h === 'string') return h
  if (typeof h === 'object') return Object.entries(h as Record<string, string>).map(([d, v]) => `${d} ${v}`).join('; ')
  return null
}

function VerifyPageInner() {
  const sp = useSearchParams()
  const router = useRouter()
  const mode: Mode = sp.get('mode') === 'research' ? 'research' : 'fv'
  const country = sp.get('country') || ''

  const [queue, setQueue] = useState<QueuePlace[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<Record<string, Evidence | 'loading'>>({})
  const [done, setDone] = useState<Array<{ name: string; decision: Decision }>>([])
  const skipped = useRef<string[]>([])
  const [countryInput, setCountryInput] = useState(country)

  const current = queue[0] ?? null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({ mode })
      if (country) q.set('country', country)
      if (skipped.current.length) q.set('skip', skipped.current.join(','))
      const res = await fetch(`/api/admin/verify-queue?${q}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `${res.status}`)
      setQueue(j.places || [])
      setTotal(j.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [mode, country])

  useEffect(() => { skipped.current = []; load() }, [load])

  // Evidence for the current card and the next one (prefetch), one website each.
  const fetchEvidence = useCallback(async (id: string, force = false) => {
    setEvidence(prev => {
      if (!force && prev[id]) return prev
      return { ...prev, [id]: 'loading' }
    })
    try {
      const res = await fetch(`/api/admin/places/${id}/evidence`)
      const j = await res.json()
      setEvidence(prev => ({ ...prev, [id]: j }))
    } catch (e) {
      setEvidence(prev => ({ ...prev, [id]: { website: null, signal: null, vegan: null, error: e instanceof Error ? e.message : 'failed' } }))
    }
  }, [])
  useEffect(() => {
    for (const p of queue.slice(0, 2)) {
      if (p.website && !evidence[p.id]) fetchEvidence(p.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue])

  const resolveResearch = async (p: QueuePlace) => {
    await Promise.all(p.research.map(r => fetch('/api/admin/corrections', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, action: 'reject' }),
    }).catch(() => {})))
  }

  const decide = useCallback(async (decision: Decision) => {
    if (!current || busy) return
    setBusy(true)
    setError(null)
    const p = current
    try {
      if (decision === 'confirm') {
        const res = await fetch(`/api/admin/places/${p.id}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `verify ${res.status}`)
      } else if (decision === 'mostly_vegan' || decision === 'vegan_friendly') {
        const res = await fetch(`/api/places/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vegan_level: decision }) })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `update ${res.status}`)
      } else if (decision === 'closed') {
        const res = await fetch('/api/admin/data-quality', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId: p.id, reason: 'confirmed_closed' }) })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `archive ${res.status}`)
      }
      if (decision !== 'skip' && p.research.length) await resolveResearch(p)
      if (decision === 'skip') skipped.current.push(p.id)
      setDone(prev => [{ name: p.name, decision }, ...prev].slice(0, 30))
      setQueue(prev => prev.slice(1))
      if (decision !== 'skip') setTotal(t => Math.max(0, t - 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'action failed')
    } finally {
      setBusy(false)
    }
  }, [current, busy])

  // Keyboard: digits decide, S skips, N refetches evidence. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === '1') decide('confirm')
      else if (k === '2') decide('mostly_vegan')
      else if (k === '3') decide('vegan_friendly')
      else if (k === '4') decide('closed')
      else if (k === 's') decide('skip')
      else if (k === 'n' && current) fetchEvidence(current.id, true)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [decide, current, fetchEvidence])

  useEffect(() => { if (!loading && queue.length === 0 && total > 0) load() }, [queue.length, loading, total, load])

  const setParams = (next: { mode?: Mode; country?: string }) => {
    const q = new URLSearchParams(sp.toString())
    if (next.mode) q.set('mode', next.mode)
    if (next.country !== undefined) { if (next.country) q.set('country', next.country); else q.delete('country') }
    router.replace(`/admin/verify?${q.toString()}`)
  }

  const ev = current ? evidence[current.id] : undefined
  const searchUrl = current ? `https://www.google.com/search?q=${encodeURIComponent(`is ${current.name} ${current.city || ''} 100% vegan?`)}` : '#'
  const hcUrl = current ? `https://www.happycow.net/searchmap?s=3&location=${encodeURIComponent(`${current.name} ${current.city || ''}`)}` : '#'
  const hours = useMemo(() => hoursText(current?.opening_hours), [current])

  return (
    <div className="p-6 max-w-5xl mx-auto text-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Leaf className="h-6 w-6 text-emerald-400" /> Fast verify</h1>
          <p className="text-sm text-gray-400">
            {mode === 'fv' ? 'Fully vegan places nobody has confirmed through the UI yet.' : 'Places with an open research row from our own audits.'}
            {' '}<span className="text-gray-300 font-medium">{total.toLocaleString()} left</span>
            {done.length > 0 && <span> · {done.length} decided this session</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button onClick={() => setParams({ mode: 'fv' })} className={`px-3 py-1.5 text-sm ${mode === 'fv' ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Unverified 100% vegan</button>
            <button onClick={() => setParams({ mode: 'research' })} className={`px-3 py-1.5 text-sm ${mode === 'research' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Research rows</button>
          </div>
          <form onSubmit={e => { e.preventDefault(); setParams({ country: countryInput.trim() }) }} className="flex items-center gap-1">
            <input value={countryInput} onChange={e => setCountryInput(e.target.value)} placeholder="Country (exact)" className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm w-40" />
            <button type="submit" className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm hover:bg-gray-700">Go</button>
          </form>
        </div>
      </div>

      <div className="text-xs text-gray-400 mb-4 flex flex-wrap gap-x-4 gap-y-1">
        <span><kbd className="px-1 bg-gray-800 rounded">1</kbd> confirm 100% vegan</span>
        <span><kbd className="px-1 bg-gray-800 rounded">2</kbd> mostly vegan</span>
        <span><kbd className="px-1 bg-gray-800 rounded">3</kbd> vegan-friendly</span>
        <span><kbd className="px-1 bg-gray-800 rounded">4</kbd> closed</span>
        <span><kbd className="px-1 bg-gray-800 rounded">S</kbd> skip</span>
        <span><kbd className="px-1 bg-gray-800 rounded">N</kbd> refetch website</span>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-900/40 text-red-200 text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error}</div>}

      {loading && !current ? (
        <div className="py-20 text-center text-gray-400"><Loader2 className="h-6 w-6 animate-spin inline" /></div>
      ) : !current ? (
        <div className="py-20 text-center text-gray-400">Nothing left in this queue{country ? ` for ${country}` : ''}.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Place */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl p-4 space-y-3">
            {current.main_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.main_image_url} alt="" className="w-full h-40 object-cover rounded-lg" />
            )}
            <div>
              <Link href={`/place/${current.slug || current.id}`} target="_blank" className="text-lg font-bold text-white hover:text-emerald-300 inline-flex items-center gap-1">
                {current.name} <ExternalLink className="h-4 w-4" />
              </Link>
              <p className="text-sm text-gray-400">{current.address || ''}{current.address ? ' · ' : ''}{current.city}, {current.country}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className={`px-2 py-0.5 rounded-full font-medium ${LEVEL_CLASS[current.vegan_level || ''] || 'bg-gray-700'}`}>{VEGAN_LEVEL_LABEL[current.vegan_level || ''] || current.vegan_level || 'no level'}</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-200">L{current.verification_level ?? 0} · {current.verification_method || 'none'}</span>
              {current.source && <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{current.source}</span>}
              {(current.review_count ?? 0) > 0 && <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{current.review_count} reviews · {current.average_rating?.toFixed(1)}</span>}
            </div>
            {current.description && <p className="text-sm text-gray-300 line-clamp-4">{current.description}</p>}
            {hours && <p className="text-xs text-gray-400 flex items-start gap-1"><Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> {hours}</p>}
            <div className="flex flex-wrap gap-2 text-sm">
              {current.website && <a href={current.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600"><Globe className="h-3.5 w-3.5" /> Website</a>}
              <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600"><Search className="h-3.5 w-3.5" /> &ldquo;is it 100% vegan?&rdquo;</a>
              <a href={hcUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600">HappyCow</a>
            </div>
            {current.tags && current.tags.length > 0 && <p className="text-[11px] text-gray-500 break-words">{current.tags.join(' · ')}</p>}
          </div>

          {/* Evidence */}
          <div className="lg:col-span-3 space-y-3">
            {current.research.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 border-l-4 border-purple-600/60">
                <p className="text-xs font-medium text-purple-300 flex items-center gap-1 mb-2"><FlaskConical className="h-3.5 w-3.5" /> Our research ({current.research.length})</p>
                {current.research.map(r => (
                  <div key={r.id} className="text-sm text-gray-200 mb-2">
                    <span className="text-purple-300 font-medium">{String(r.corrections?.proposed_action || 'review').replace(/_/g, ' ')}</span>
                    {r.corrections?.from != null && <span className="text-gray-400"> · {String(r.corrections.from)} → {String(r.corrections.to)}</span>}
                    {r.note && <p className="text-gray-300 text-xs mt-0.5">{r.note}</p>}
                  </div>
                ))}
              </div>
            )}
            {current.reports.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 border-l-4 border-amber-600/60">
                <p className="text-xs font-medium text-amber-300 flex items-center gap-1 mb-2"><Flag className="h-3.5 w-3.5" /> Pending reports ({current.reports.length})</p>
                {current.reports.map(r => <p key={r.id} className="text-sm text-gray-200">{r.type.replace(/_/g, ' ')}{r.note ? `: ${r.note}` : ''} <span className="text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString('en-GB')}</span></p>)}
              </div>
            )}

            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-300 flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> The venue&apos;s own website</p>
                {current.website && <button onClick={() => fetchEvidence(current.id, true)} className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" /> refetch</button>}
              </div>
              {!current.website ? (
                <p className="text-sm text-gray-400">No website on file. Use the search links, or confirm only with a vegan-first source.</p>
              ) : !ev || ev === 'loading' ? (
                <p className="text-sm text-gray-400 inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Fetching…</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {ev.error && <p className="text-red-300">{ev.error}</p>}
                  {ev.signal && (
                    <>
                      <p className="text-gray-400 text-xs">
                        {ev.signal.ok ? 'reachable' : `unreachable (${ev.signal.reason || ev.signal.status || '?'})`}
                        {ev.signal.final_url && ev.signal.final_url !== current.website ? ` · now ${ev.signal.final_url}` : ''}
                        {ev.signal.lang ? ` · ${ev.signal.lang}` : ''}
                      </p>
                      {ev.signal.parking && <p className="text-amber-300 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Looks like a parked or expired domain.</p>}
                      {ev.signal.closure_hint && <p className="text-red-300 flex items-center gap-1"><XOctagon className="h-4 w-4" /> Closure wording: “{ev.signal.closure_hint}”</p>}
                      {ev.signal.title && <p className="text-white font-medium">{ev.signal.title}</p>}
                      {ev.signal.description && <p className="text-gray-300">{ev.signal.description}</p>}
                      {ev.vegan && (
                        <p className={`text-xs ${ev.vegan.level === 'fully_vegan' ? 'text-emerald-300' : ev.vegan.level === 'vegetarian_reject' ? 'text-red-300' : 'text-gray-300'}`}>
                          Signal: {ev.vegan.level.replace(/_/g, ' ')} ({Math.round(ev.vegan.confidence * 100)}%)
                          {ev.vegan.evidence.length > 0 && <span className="text-gray-400"> · {ev.vegan.evidence.map(e => e.match ? `${e.rule}: “${e.match}”` : e.rule).join(' · ')}</span>}
                        </p>
                      )}
                      {ev.quotes && ev.quotes.length > 0 && (
                        <ul className="text-xs text-gray-300 space-y-1 border-t border-gray-700 pt-2">
                          {ev.quotes.map((q, i) => <li key={i}>…{q}…</li>)}
                        </ul>
                      )}
                      {ev.signal.menu_links.length > 0 && (
                        <p className="text-xs text-gray-400">Menu: {ev.signal.menu_links.slice(0, 3).map((u, i) => <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="underline hover:text-white mr-2">{u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)}</a>)}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Decisions */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => decide('confirm')} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} 1 · Confirm 100% vegan
              </button>
              <button onClick={() => decide('mostly_vegan')} disabled={busy} className="px-3 py-2 bg-teal-700/60 hover:bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">2 · Mostly vegan</button>
              <button onClick={() => decide('vegan_friendly')} disabled={busy} className="px-3 py-2 bg-stone-600 hover:bg-stone-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">3 · Vegan-friendly</button>
              <button onClick={() => decide('closed')} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-200 rounded-lg text-sm font-medium disabled:opacity-50"><XOctagon className="h-4 w-4" /> 4 · Closed</button>
              <button onClick={() => decide('skip')} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 ml-auto"><SkipForward className="h-4 w-4" /> S · Skip</button>
            </div>
            <p className="text-[11px] text-gray-500">Confirm = you checked the venue&apos;s own site or a vegan-first source. 2 and 3 change the public label at once. Closed archives the row (never deletes). Every decision closes the open research rows for this place.</p>
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-6 text-xs text-gray-500">
          Decided: {done.map((d, i) => <span key={i} className="mr-2">{d.name} <span className="text-gray-400">({d.decision.replace(/_/g, ' ')})</span></span>)}
        </div>
      )}
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading…</div>}>
      <VerifyPageInner />
    </Suspense>
  )
}
