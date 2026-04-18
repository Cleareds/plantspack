'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Loader2, ExternalLink, CheckCircle, XCircle, AlertTriangle,
  ShieldCheck, ChevronLeft, ChevronRight, Filter, BarChart3,
} from 'lucide-react'

interface StagingRow {
  id: string
  source: string
  source_id: string
  name: string
  latitude: number
  longitude: number
  city: string | null
  country: string | null
  address: string | null
  website: string | null
  phone: string | null
  categories: string[] | null
  date_refreshed: string | null
  required_fields_ok: boolean | null
  freshness_ok: boolean | null
  website_ok: boolean | null
  website_signal: any
  vegan_level: string | null
  vegan_confidence: number | null
  vegan_evidence: Array<{ rule: string; match?: string }> | null
  quality_score: number | null
  decision: 'pending' | 'auto_import' | 'needs_review' | 'reject'
  decision_reason: string | null
  operator_action: string | null
}

interface Stats {
  pending: number
  auto_import: number
  needs_review: number
  reject: number
  imported: number
  vegan_levels: { fully_vegan: number; vegan_friendly: number; unknown: number }
}

const DECISION_TABS: Array<{ id: StagingRow['decision']; label: string; color: string }> = [
  { id: 'needs_review', label: 'Needs Review', color: 'text-amber-400' },
  { id: 'auto_import', label: 'Auto-Import Ready', color: 'text-emerald-400' },
  { id: 'pending', label: 'Pending Tier-2', color: 'text-blue-400' },
  { id: 'reject', label: 'Rejected', color: 'text-red-400' },
]

export default function StagingPage() {
  const [decision, setDecision] = useState<StagingRow['decision']>('needs_review')
  const [rows, setRows] = useState<StagingRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [cursor, setCursor] = useState(0)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [source, setSource] = useState('')
  const [country, setCountry] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [batchThreshold, setBatchThreshold] = useState(80)

  const [refreshTick, setRefreshTick] = useState(0)

  // Fetch stats — refresh after each admin action so counts stay live.
  useEffect(() => {
    fetch('/api/admin/staging?tab=stats', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setStats(d.stats))
      .catch(() => {})
  }, [refreshTick])

  // Fetch rows when tab / page / filters change. NOTE we deliberately do NOT
  // re-fetch on every `processing` toggle — the local `setRows` filter in
  // act() already removes the acted row; a server refetch mid-triage would
  // reset the cursor and briefly flash stale data.
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      decision,
      page: String(page),
    })
    if (source) params.set('source', source)
    if (country) params.set('country', country)
    if (minScore > 0) params.set('minScore', String(minScore))
    fetch(`/api/admin/staging?${params}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setRows(d.rows ?? [])
        setTotal(d.total ?? 0)
        setCursor(0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [decision, page, source, country, minScore])

  const current = rows[cursor]

  const act = useCallback(async (action: 'approve' | 'reject' | 'escalate') => {
    if (!current) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/staging/${current.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(`${action} · ${current.name}${data.slug ? ` → /place/${data.slug}` : ''}`)
        // Remove the acted row from the local list so cursor advances naturally.
        setRows(prev => {
          const idx = prev.findIndex(r => r.id === current.id)
          const next = prev.filter(r => r.id !== current.id)
          // Keep cursor pointing at the next row (same index) — if we just
          // removed the last row, step back one.
          if (idx >= 0 && idx >= next.length) setCursor(Math.max(0, next.length - 1))
          return next
        })
        setTotal(t => Math.max(0, t - 1))
        setRefreshTick(t => t + 1)   // trigger stats refresh
      } else {
        setMessage(`err: ${data.error}`)
      }
    } catch (e: any) {
      setMessage(`err: ${e.message}`)
    }
    setProcessing(false)
    setTimeout(() => setMessage(null), 3000)
  }, [current])

  const batchApprove = useCallback(async () => {
    if (!confirm(`Approve ALL ${decision} rows with score ≥ ${batchThreshold}? This imports into places.`)) return
    setProcessing(true)
    try {
      const res = await fetch('/api/admin/staging/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_all_above_score',
          decision,
          threshold: batchThreshold,
          source: source || undefined,
          country: country || undefined,
          limit: 2000,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(`Batch approved ${data.inserted}, failed ${data.failed}`)
        setRefreshTick(t => t + 1)
        // Force a full list refetch since many rows were modified server-side.
        setLoading(true)
        const params = new URLSearchParams({ decision, page: String(page) })
        if (source) params.set('source', source)
        if (country) params.set('country', country)
        if (minScore > 0) params.set('minScore', String(minScore))
        const r = await fetch(`/api/admin/staging?${params}`, { cache: 'no-store' })
        const d = await r.json()
        setRows(d.rows ?? [])
        setTotal(d.total ?? 0)
        setCursor(0)
        setLoading(false)
      } else setMessage(`err: ${data.error}`)
    } catch (e: any) { setMessage(`err: ${e.message}`) }
    setProcessing(false)
  }, [decision, batchThreshold, source, country, page, minScore])

  // Keyboard shortcuts — Gmail-style triage.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (processing) return
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return
      if (e.key === 'a' || e.key === 'A' || e.key === 'Enter') { e.preventDefault(); act('approve') }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); act('reject') }
      else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); act('escalate') }
      else if (e.key === 'ArrowRight' || e.key === 'j' || e.key === 'J') { setCursor(c => Math.min(c + 1, rows.length - 1)) }
      else if (e.key === 'ArrowLeft' || e.key === 'k' || e.key === 'K') { setCursor(c => Math.max(0, c - 1)) }
      else if (e.key === 'o' || e.key === 'O') { if (current?.website) window.open(current.website, '_blank') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [act, processing, rows.length, current])

  const vegColor = (level: string | null) => level === 'fully_vegan' ? 'text-emerald-400' : level === 'vegan_friendly' ? 'text-lime-400' : level === 'vegetarian_reject' ? 'text-red-400' : 'text-gray-500'

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="h-6 w-6 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Pre-Import Staging</h1>
        </div>
        <p className="text-gray-400 text-sm">
          {stats ? `${stats.needs_review.toLocaleString()} need review · ${stats.auto_import.toLocaleString()} ready to import · ${stats.imported.toLocaleString()} imported` : 'Loading…'}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <StatBox label="Pending Tier-2" n={stats.pending} color="text-blue-400" />
          <StatBox label="Auto-Import" n={stats.auto_import} color="text-emerald-400" />
          <StatBox label="Needs Review" n={stats.needs_review} color="text-amber-400" />
          <StatBox label="Rejected" n={stats.reject} color="text-red-400" />
          <StatBox label="Imported" n={stats.imported} color="text-white" />
        </div>
      )}

      {/* Decision tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {DECISION_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setDecision(t.id); setPage(1) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              decision === t.id ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className={decision === t.id ? 'text-white' : t.color}>{t.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${decision === t.id ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-400'}`}>
              {stats ? (stats[t.id] as number) : '…'}
            </span>
          </button>
        ))}
      </div>

      {/* Filters + batch actions */}
      <div className="flex flex-wrap gap-2 mb-4 items-center bg-gray-900 rounded-lg p-3">
        <Filter className="h-4 w-4 text-gray-400" />
        <input value={source} onChange={e => { setSource(e.target.value); setPage(1) }} placeholder="source tag…" className="bg-gray-800 text-white text-sm px-2 py-1 rounded w-56" />
        <input value={country} onChange={e => { setCountry(e.target.value); setPage(1) }} placeholder="country…" className="bg-gray-800 text-white text-sm px-2 py-1 rounded w-40" />
        <input type="number" value={minScore} onChange={e => { setMinScore(Number(e.target.value) || 0); setPage(1) }} placeholder="min score" className="bg-gray-800 text-white text-sm px-2 py-1 rounded w-24" />
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">batch threshold:</span>
          <input type="number" value={batchThreshold} onChange={e => setBatchThreshold(Number(e.target.value))} className="bg-gray-800 text-white text-sm px-2 py-1 rounded w-20" />
          <button onClick={batchApprove} disabled={processing}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium disabled:opacity-50">
            <CheckCircle className="h-3.5 w-3.5" /> Batch approve
          </button>
        </div>
      </div>

      {/* Triage card */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-400">No rows in this bucket. Try another tab or adjust filters.</p>
        </div>
      ) : current && (
        <div className="bg-gray-800 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono">{cursor + 1} / {rows.length}</span>
              <div className={`text-xs px-2 py-1 rounded-full ${current.quality_score != null && current.quality_score >= 80 ? 'bg-emerald-900/50 text-emerald-300' : current.quality_score != null && current.quality_score >= 55 ? 'bg-amber-900/50 text-amber-300' : 'bg-red-900/50 text-red-300'}`}>
                score {current.quality_score ?? '—'}
              </div>
              <div className={`text-xs px-2 py-1 rounded-full bg-gray-900 ${vegColor(current.vegan_level)}`}>
                {current.vegan_level ?? 'not_checked'}{current.vegan_confidence != null ? ` · ${current.vegan_confidence.toFixed(2)}` : ''}
              </div>
              {current.decision_reason && (
                <span className="text-xs text-gray-500 font-mono">{current.decision_reason}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCursor(c => Math.max(0, c - 1))} disabled={cursor === 0}
                className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded disabled:opacity-50" title="Previous (←)"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setCursor(c => Math.min(c + 1, rows.length - 1))} disabled={cursor >= rows.length - 1}
                className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded disabled:opacity-50" title="Next (→)"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: place data */}
            <div>
              <h2 className="text-xl font-bold text-white mb-2">{current.name}</h2>
              <p className="text-sm text-gray-300">{current.address ?? '—'}</p>
              <p className="text-sm text-gray-400">{current.city}, {current.country}</p>
              {current.phone && <p className="text-sm text-gray-400 mt-1">📞 {current.phone}</p>}
              {current.website && (
                <a href={current.website} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline inline-flex items-center gap-1 mt-1">
                  {current.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <div className="mt-3 text-xs text-gray-500">
                <div><span className="text-gray-400">categories:</span> {(current.categories ?? []).join(', ') || '—'}</div>
                <div><span className="text-gray-400">source:</span> <span className="font-mono">{current.source}</span></div>
                <div><span className="text-gray-400">fresh:</span> {current.date_refreshed ?? '—'}</div>
                <div><span className="text-gray-400">coords:</span> {current.latitude.toFixed(4)}, {current.longitude.toFixed(4)}</div>
              </div>

              {/* Evidence */}
              {current.vegan_evidence && current.vegan_evidence.length > 0 && (
                <div className="mt-4 bg-gray-900 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-300 mb-1">Vegan signal evidence</p>
                  {current.vegan_evidence.map((e, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-emerald-400 font-mono">{e.rule}</span>
                      {e.match && <span className="text-gray-400"> — {e.match.slice(0, 150)}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Website signals */}
              {current.website_signal && (
                <div className="mt-3 bg-gray-900 rounded-lg p-3 text-xs">
                  <p className="font-medium text-gray-300 mb-1">Website snapshot</p>
                  <div><span className="text-gray-400">status:</span> {current.website_signal.status} {current.website_signal.reason ? `(${current.website_signal.reason})` : ''}</div>
                  {current.website_signal.title && <div><span className="text-gray-400">title:</span> <span className="text-white">{current.website_signal.title.slice(0, 150)}</span></div>}
                  {current.website_signal.description && <div><span className="text-gray-400">desc:</span> <span className="text-gray-300">{current.website_signal.description.slice(0, 200)}</span></div>}
                  <div><span className="text-gray-400">lang:</span> {current.website_signal.lang ?? '—'} · ld_json: {current.website_signal.ld_json?.length ?? 0} · menu_links: {current.website_signal.menu_links?.length ?? 0}</div>
                  {current.website_signal.closure_hint && <div className="text-red-300 mt-1">⚠ closure hint: "{current.website_signal.closure_hint}"</div>}
                </div>
              )}
            </div>

            {/* Right: website iframe preview (sandbox) */}
            <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ height: 520 }}>
              {current.website ? (
                <iframe
                  src={current.website}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  className="w-full h-full"
                  title="preview"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">No website</div>
              )}
            </div>
          </div>

          {/* Action bar */}
          <div className="mt-4 flex gap-2 items-center">
            <button onClick={() => act('approve')} disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              <CheckCircle className="h-4 w-4" /> Approve <kbd className="ml-1 text-[10px] bg-emerald-900 px-1 rounded">A</kbd>
            </button>
            <button onClick={() => act('reject')} disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium disabled:opacity-50">
              <XCircle className="h-4 w-4" /> Reject <kbd className="ml-1 text-[10px] bg-red-900 px-1 rounded">R</kbd>
            </button>
            <button onClick={() => act('escalate')} disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-sm font-medium disabled:opacity-50">
              <AlertTriangle className="h-4 w-4" /> Escalate <kbd className="ml-1 text-[10px] bg-amber-900 px-1 rounded">E</kbd>
            </button>
            {current.website && (
              <a href={current.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium">
                <ExternalLink className="h-4 w-4" /> Open site <kbd className="ml-1 text-[10px] bg-gray-900 px-1 rounded">O</kbd>
              </a>
            )}
            {message && <span className="ml-auto text-sm text-gray-400">{message}</span>}
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded disabled:opacity-50">Prev</button>
          <span className="text-sm text-gray-400">page {page} of {Math.max(1, Math.ceil(total / 30))} · {total} total</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 30 >= total}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, n, color }: { label: string; n: number; color: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{n.toLocaleString()}</p>
    </div>
  )
}
