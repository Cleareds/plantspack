'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Loader2, ExternalLink, Trash2, XCircle, AlertTriangle,
  Clock, Globe, WifiOff, Users, CheckCircle, BarChart3, Leaf,
  ArrowUpCircle, ArrowDownCircle, Store, RefreshCw, Square, CheckSquare
} from 'lucide-react'

interface FlaggedPlace {
  id: string
  name: string
  slug: string | null
  city: string | null
  country: string | null
  tags: string[] | null
  website: string | null
  vegan_level?: string | null
  opening_hours?: Record<string, string> | null
  updated_at: string
}

interface Correction {
  id: string
  place_id: string
  corrections: Record<string, any>
  note: string | null
  status: string
  created_at: string
  places: { id: string; name: string; slug: string; city: string; country: string }
  users: { id: string; username: string }
}

interface Stats {
  totalPlaces: number
  googleClosed: number
  googleTempClosed: number
  unreachable: number
  possiblyClosed: number
  reportedClosed: number
  reportedHours: number
  pendingCorrections: number
  googleNotFound: number
  reportedNotVegan: number
  unverifiedFullyVegan: number
}

const TABS = [
  { id: 'closed', label: 'Google Closed', icon: XCircle, color: 'text-red-400', statKey: 'googleClosed' },
  { id: 'temp_closed', label: 'Temp Closed', icon: Clock, color: 'text-amber-400', statKey: 'googleTempClosed' },
  { id: 'reported_closed', label: 'Reported Closed', icon: Users, color: 'text-orange-400', statKey: 'reportedClosed' },
  { id: 'reported_hours', label: 'Wrong Hours', icon: AlertTriangle, color: 'text-yellow-400', statKey: 'reportedHours' },
  { id: 'not_vegan', label: 'Vegan Status', icon: Leaf, color: 'text-teal-400', statKey: 'reportedNotVegan' },
  { id: 'unverified_fv', label: 'Unverified 100% Vegan', icon: Leaf, color: 'text-teal-400', statKey: 'unverifiedFullyVegan' },
  { id: 'unreachable', label: 'Website Down', icon: WifiOff, color: 'text-gray-400', statKey: 'unreachable' },
  { id: 'corrections', label: 'Corrections', icon: CheckCircle, color: 'text-emerald-400', statKey: 'pendingCorrections' },
] as const

type TabId = typeof TABS[number]['id']

const FIELD_LABELS: Record<string, string> = {
  name: 'Name', address: 'Address', description: 'Description', category: 'Category',
  website: 'Website', phone: 'Phone', opening_hours: 'Opening Hours', vegan_level: 'Vegan Level',
}

const VEGAN_LEVEL_LABEL: Record<string, string> = {
  fully_vegan: '100% Vegan', mostly_vegan: 'Mostly Vegan',
  vegan_friendly: 'Vegan-Friendly', vegan_options: 'Has Vegan Options',
}

const VEGAN_LEVEL_COLOR: Record<string, string> = {
  fully_vegan: 'bg-emerald-900/50 text-emerald-300',
  mostly_vegan: 'bg-teal-900/50 text-teal-300',
  vegan_friendly: 'bg-amber-900/50 text-amber-300',
  vegan_options: 'bg-stone-700/50 text-stone-300',
}

/** Returns the primary confirm action for a vegan-report place, or null. */
function getVeganAction(p: FlaggedPlace): {
  label: string; icon: React.ReactNode; color: string
  action: 'upgrade_fully_vegan' | 'downgrade_mostly_vegan' | 'downgrade_vegan_options' | 'archive_chain' | 'set_vegan_options'
} | null {
  const tags = p.tags || []
  if (tags.includes('community_report:actually_fully_vegan'))
    return { label: 'Upgrade to 100% Vegan', icon: <ArrowUpCircle className="h-3.5 w-3.5" />, color: 'bg-emerald-600 hover:bg-emerald-700 text-white', action: 'upgrade_fully_vegan' }
  if (tags.includes('community_report:non_vegan_chain'))
    return { label: 'Archive Chain', icon: <Trash2 className="h-3.5 w-3.5" />, color: 'bg-red-600/30 hover:bg-red-600/50 text-red-300', action: 'archive_chain' }
  if (tags.includes('community_report:few_vegan_options') || tags.includes('community_report:not_vegan_friendly'))
    return { label: 'Set: Has Vegan Options', icon: <ArrowDownCircle className="h-3.5 w-3.5" />, color: 'bg-stone-700 hover:bg-stone-600 text-stone-200', action: 'set_vegan_options' }
  if (tags.includes('community_report:not_fully_vegan')) {
    if (p.vegan_level === 'fully_vegan')
      return { label: 'Downgrade to Mostly Vegan', icon: <ArrowDownCircle className="h-3.5 w-3.5" />, color: 'bg-amber-700/50 hover:bg-amber-700/80 text-amber-200', action: 'downgrade_mostly_vegan' }
    return { label: 'Downgrade to Has Options', icon: <ArrowDownCircle className="h-3.5 w-3.5" />, color: 'bg-amber-700/50 hover:bg-amber-700/80 text-amber-200', action: 'downgrade_vegan_options' }
  }
  if (tags.includes('google_review_flag')) {
    if (p.vegan_level === 'fully_vegan')
      return { label: 'Downgrade to Mostly Vegan', icon: <ArrowDownCircle className="h-3.5 w-3.5" />, color: 'bg-amber-700/50 hover:bg-amber-700/80 text-amber-200', action: 'downgrade_mostly_vegan' }
    return { label: 'Downgrade to Vegan-Friendly', icon: <ArrowDownCircle className="h-3.5 w-3.5" />, color: 'bg-amber-700/50 hover:bg-amber-700/80 text-amber-200', action: 'downgrade_vegan_options' }
  }
  return null
}

export default function DataQualityPage() {
  const [tab, setTab] = useState<TabId>('closed')
  const [places, setPlaces] = useState<FlaggedPlace[]>([])
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const r = await fetch('/api/admin/data-quality?tab=stats')
      const d = await r.json()
      setStats(d.stats)
    } catch {}
    setStatsLoading(false)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => { setPage(1); setSelectedIds(new Set()) }, [tab])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/data-quality?tab=${tab}&page=${page}`)
        const data = await res.json()
        if (tab === 'corrections') setCorrections(data.corrections || [])
        else setPlaces(data.places || [])
        setTotal(data.total || 0)
      } catch {}
      setLoading(false)
    }
    fetchData()
  }, [tab, page])

  // Remove a place from the local list and refresh stats
  const removePlace = useCallback((placeId: string) => {
    setPlaces(prev => prev.filter(p => p.id !== placeId))
    setTotal(prev => Math.max(0, prev - 1))
    setSelectedIds(prev => { const n = new Set(prev); n.delete(placeId); return n })
    fetchStats()
  }, [fetchStats])

  // Archive (soft-delete) a place
  const handleArchive = useCallback(async (placeId: string, reason?: string) => {
    if (!confirm('Archive this place? It will be hidden from the public.')) return
    setProcessing(placeId)
    const res = await fetch('/api/admin/data-quality', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId, reason }),
    })
    if (res.ok) removePlace(placeId)
    setProcessing(null)
  }, [removePlace])

  // Run AI verifier on a single place. Tier 1 (description) first, escalates
  // to Tier 2 (web-search) if uncertain. Updates tags + verification_status
  // server-side, then removes from this list since the place will no longer
  // be untagged.
  const handleVerifyVegan = useCallback(async (placeId: string) => {
    setProcessing(placeId)
    try {
      const res = await fetch('/api/admin/data-quality', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeIds: [placeId], action: 'verify_vegan' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data?.error || 'Verification failed')
      } else {
        const r = data?.results?.[0]
        if (r?.verdict === 'uncertain') {
          // Stays on the list - no tag was applied. Surface a small toast.
          setActionError(`Verifier returned uncertain (tier=${r.tier}). Try Chrome DevTools or skip for now.`)
        } else {
          removePlace(placeId)
        }
      }
    } catch (e: any) {
      setActionError(e?.message || 'Verification failed')
    } finally {
      setProcessing(null)
    }
  }, [removePlace])

  // Dismiss a flag — removes the tag(s) without changing the place data
  const handleDismiss = useCallback(async (placeId: string, tag: string) => {
    setProcessing(placeId)
    if (tab === 'not_vegan') {
      // Clear all vegan-report tags at once
      await fetch('/api/admin/data-quality', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, clearVeganReportTags: true }),
      })
    } else {
      await fetch('/api/admin/data-quality', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, removeTag: tag }),
      })
    }
    removePlace(placeId)
    setProcessing(null)
  }, [tab, removePlace])

  // Confirm a vegan-status action — optimistic: remove from list immediately, fire request in background
  const handleVeganConfirm = useCallback(async (
    placeId: string,
    action: ReturnType<typeof getVeganAction>
  ) => {
    if (!action) return
    setActionError(null)
    setProcessing(placeId)

    // Optimistically remove from list right away
    removePlace(placeId)

    try {
      if (action.action === 'archive_chain') {
        const res = await fetch('/api/admin/data-quality', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId, reason: 'non_vegan_chain' }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          console.error('Archive chain failed:', res.status, body)
          setActionError(`Archive failed (${res.status})`)
        }
      } else {
        const levelMap: Record<string, string> = {
          upgrade_fully_vegan: 'fully_vegan',
          downgrade_mostly_vegan: 'mostly_vegan',
          downgrade_vegan_options: 'vegan_options',
          set_vegan_options: 'vegan_options',
        }
        const setVeganLevel = levelMap[action.action]
        const res = await fetch('/api/admin/data-quality', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId, setVeganLevel, clearVeganReportTags: true }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          console.error('Vegan confirm PATCH failed:', res.status, body)
          setActionError(`Update failed (${res.status}): ${body?.error ?? 'unknown'}`)
        }
      }
    } catch (err) {
      console.error('Vegan confirm network error:', err)
      setActionError('Network error — change may not have saved')
    }

    setProcessing(null)
  }, [removePlace])

  const getTagForTab = (): string => {
    switch (tab) {
      case 'closed': return 'google_confirmed_closed'
      case 'temp_closed': return 'google_temporarily_closed'
      case 'reported_closed': return 'community_report:permanently_closed'
      case 'reported_hours': return 'community_report:hours_wrong'
      case 'unreachable': return 'website_unreachable'
      default: return ''
    }
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === places.length ? new Set() : new Set(places.map(p => p.id)))
  }, [places])

  const handleBulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return
    const isClosedTab = tab === 'closed' || tab === 'temp_closed' || tab === 'reported_closed'
    const label = isClosedTab ? 'Confirm all selected as closed?' : `Archive ${selectedIds.size} places?`
    if (!confirm(label)) return
    setBulkProcessing(true)
    const res = await fetch('/api/admin/data-quality', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeIds: [...selectedIds],
        action: 'archive',
        reason: isClosedTab ? 'confirmed_closed' : 'admin_removed',
      }),
    })
    if (res.ok) {
      setPlaces(prev => prev.filter(p => !selectedIds.has(p.id)))
      setTotal(prev => Math.max(0, prev - selectedIds.size))
      setSelectedIds(new Set())
      fetchStats()
    }
    setBulkProcessing(false)
  }, [selectedIds, tab, fetchStats])

  const handleBulkDismiss = useCallback(async () => {
    if (selectedIds.size === 0) return
    const removeTag = getTagForTab()
    setBulkProcessing(true)
    const res = await fetch('/api/admin/data-quality', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeIds: [...selectedIds], action: 'dismiss', removeTag }),
    })
    if (res.ok) {
      setPlaces(prev => prev.filter(p => !selectedIds.has(p.id)))
      setTotal(prev => Math.max(0, prev - selectedIds.size))
      setSelectedIds(new Set())
      fetchStats()
    }
    setBulkProcessing(false)
  }, [selectedIds, tab, fetchStats])

  const handleCorrection = useCallback(async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id)
    const res = await fetch('/api/admin/corrections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    if (res.ok) {
      setCorrections(prev => prev.filter(c => c.id !== id))
      setTotal(prev => Math.max(0, prev - 1))
      fetchStats()
    }
    setProcessing(null)
  }, [fetchStats])

  const getStatForTab = (tabId: TabId): number => {
    if (!stats) return 0
    const t = TABS.find(t => t.id === tabId)
    if (!t) return 0
    return (stats[t.statKey as keyof Stats] as number) || 0
  }

  const totalIssues = stats
    ? stats.googleClosed + stats.googleTempClosed + stats.reportedClosed +
      stats.reportedHours + stats.unreachable + stats.pendingCorrections + stats.reportedNotVegan
    : 0

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart3 className="h-6 w-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white">Data Quality</h1>
          </div>
          <p className="text-gray-400 text-sm">
            {stats ? `${totalIssues} issues across ${stats.totalPlaces.toLocaleString()} places` : 'Loading...'}
          </p>
        </div>
        <button onClick={fetchStats} disabled={statsLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">Google Closed</p>
            <p className="text-xl font-bold text-red-400">{stats.googleClosed}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">Temp Closed</p>
            <p className="text-xl font-bold text-amber-400">{stats.googleTempClosed}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">Reported Closed</p>
            <p className="text-xl font-bold text-orange-400">{stats.reportedClosed}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">Vegan Reports</p>
            <p className="text-xl font-bold text-teal-400">{stats.reportedNotVegan}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">Corrections</p>
            <p className="text-xl font-bold text-emerald-400">{stats.pendingCorrections}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-[11px] text-gray-400">Website Down</p>
            <p className="text-xl font-bold text-gray-400">{stats.unreachable}</p>
          </div>
        </div>
      )}

      {/* Action error banner */}
      {actionError && (
        <div className="mb-4 flex items-center justify-between bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-2.5 text-sm text-red-300">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-3 text-red-400 hover:text-red-200">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => {
          const Icon = t.icon
          const count = getStatForTab(t.id)
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}>
              <Icon className={`h-4 w-4 ${tab === t.id ? 'text-white' : t.color}`} />
              {t.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-400'
                }`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : tab === 'corrections' ? (
        corrections.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400">No pending corrections</p>
          </div>
        ) : (
          <div className="space-y-3">
            {corrections.map(c => (
              <div key={c.id} className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link href={`/place/${c.places?.slug || c.place_id}`} target="_blank"
                      className="font-bold text-white hover:text-emerald-400 inline-flex items-center gap-1">
                      {c.places?.name || 'Unknown'}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <p className="text-xs text-gray-400">{c.places?.city}, {c.places?.country}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">by {c.users?.username}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 mb-3 space-y-1.5">
                  {Object.entries(c.corrections).map(([field, val]) => (
                    <div key={field} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-500 w-24 flex-shrink-0">{FIELD_LABELS[field] || field}</span>
                      <span className="text-emerald-400 break-words">{String(val)}</span>
                    </div>
                  ))}
                </div>
                {c.note && <p className="text-xs text-gray-400 italic mb-3">Note: {c.note}</p>}
                <div className="flex gap-2">
                  <button onClick={() => handleCorrection(c.id, 'approve')} disabled={processing === c.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    {processing === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Approve &amp; Apply
                  </button>
                  <button onClick={() => handleCorrection(c.id, 'reject')} disabled={processing === c.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium disabled:opacity-50">
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        places.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400">No places with this flag</p>
          </div>
        ) : (
          <>
            {/* Select-all control */}
            <div className="flex items-center gap-3 mb-2 px-1">
              <button onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                {selectedIds.size === places.length
                  ? <CheckSquare className="h-4 w-4 text-emerald-400" />
                  : <Square className="h-4 w-4" />}
                {selectedIds.size === places.length ? 'Deselect all' : `Select all (${places.length})`}
              </button>
              {selectedIds.size > 0 && (
                <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
              )}
            </div>
          <div className="space-y-2">
            {places.map(p => {
              const googleCheckDate = (p.tags || []).find(t => t.startsWith('google_checked:'))?.split(':')[1]
              const veganAction = tab === 'not_vegan' ? getVeganAction(p) : null

              // Labels/colors for context-appropriate primary actions
              const isClosedTab = tab === 'closed' || tab === 'temp_closed' || tab === 'reported_closed'
              const archiveLabel = isClosedTab ? 'Confirm Closed' : 'Archive'
              const archiveReason = isClosedTab ? 'confirmed_closed' : 'admin_removed'
              const dismissLabel = isClosedTab ? 'Still Open' : tab === 'reported_hours' ? 'Acknowledged' : 'Dismiss'

              return (
                <div key={p.id} className={`bg-gray-800 rounded-xl p-4 ${selectedIds.has(p.id) ? 'ring-1 ring-emerald-600/50' : ''}`}>
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button onClick={() => toggleSelect(p.id)} className="mt-0.5 flex-shrink-0 text-gray-500 hover:text-emerald-400 transition-colors">
                      {selectedIds.has(p.id)
                        ? <CheckSquare className="h-4 w-4 text-emerald-400" />
                        : <Square className="h-4 w-4" />}
                    </button>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/place/${p.slug || p.id}`} target="_blank"
                          className="font-medium text-white hover:text-emerald-400 inline-flex items-center gap-1">
                          {p.name}
                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                        </Link>
                        {p.vegan_level && tab === 'not_vegan' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${VEGAN_LEVEL_COLOR[p.vegan_level] ?? 'bg-gray-700 text-gray-300'}`}>
                            {VEGAN_LEVEL_LABEL[p.vegan_level] ?? p.vegan_level}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-400">{p.city}, {p.country}</p>
                        {p.website && (
                          <a href={p.website} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline truncate max-w-48">
                            <Globe className="h-3 w-3 inline mr-0.5" />
                            {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </a>
                        )}
                        {googleCheckDate && (
                          <span className="text-xs text-gray-500">Checked: {googleCheckDate}</span>
                        )}
                      </div>
                      {/* Vegan report tags */}
                      {tab === 'not_vegan' && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(p.tags || []).filter(t => t.startsWith('community_report:')).map(t => (
                            <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              t === 'community_report:actually_fully_vegan'
                                ? 'bg-emerald-900/60 text-emerald-300'
                                : 'bg-orange-900/40 text-orange-300'
                            }`}>
                              {t.replace('community_report:', '').replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Hours preview for wrong-hours tab */}
                      {tab === 'reported_hours' && p.opening_hours && (
                        <div className="mt-1.5 text-[11px] text-gray-500 font-mono">
                          {Object.entries(p.opening_hours).slice(0, 3).map(([d, h]) => (
                            <span key={d} className="mr-2">{d}: {h}</span>
                          ))}
                          {Object.keys(p.opening_hours).length > 3 && <span className="text-gray-600">+more</span>}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                      {/* Confirm action (vegan tab) */}
                      {veganAction && (
                        <button onClick={() => handleVeganConfirm(p.id, veganAction)}
                          disabled={processing === p.id}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 ${veganAction.color}`}>
                          {processing === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : veganAction.icon}
                          {veganAction.label}
                        </button>
                      )}
                      {/* Verify Now (auto-classify via AI) - only on the unverified-100%-vegan tab */}
                      {tab === 'unverified_fv' && (
                        <button onClick={() => handleVerifyVegan(p.id)}
                          disabled={processing === p.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 rounded-lg text-xs font-medium disabled:opacity-50">
                          {processing === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Leaf className="h-3.5 w-3.5" />}
                          Verify now
                        </button>
                      )}
                      {/* Confirm Closed / Archive */}
                      {tab !== 'not_vegan' && (
                        <button onClick={() => handleArchive(p.id, archiveReason)}
                          disabled={processing === p.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs font-medium disabled:opacity-50">
                          {processing === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          {archiveLabel}
                        </button>
                      )}
                      {/* Dismiss / Still Open / Acknowledged */}
                      <button onClick={() => handleDismiss(p.id, getTagForTab())}
                        disabled={processing === p.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium disabled:opacity-50">
                        {dismissLabel}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </>
        )
      )}

      {/* Sticky bulk action bar */}
      {selectedIds.size > 0 && tab !== 'corrections' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-2xl px-5 py-3 shadow-2xl">
          <span className="text-sm text-gray-300 font-medium">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-gray-700" />
          {tab !== 'not_vegan' && (
            <button onClick={handleBulkArchive} disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {bulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {tab === 'closed' || tab === 'temp_closed' || tab === 'reported_closed'
                ? `Confirm Closed (${selectedIds.size})`
                : `Archive (${selectedIds.size})`}
            </button>
          )}
          {tab !== 'not_vegan' && (
            <button onClick={handleBulkDismiss} disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium disabled:opacity-50">
              {tab === 'reported_hours' ? 'Acknowledged' : tab === 'closed' || tab === 'temp_closed' || tab === 'reported_closed' ? 'Still Open' : 'Dismiss'} ({selectedIds.size})
            </button>
          )}
          <button onClick={() => setSelectedIds(new Set())} disabled={bulkProcessing}
            className="text-gray-500 hover:text-gray-300 text-xs">
            Cancel
          </button>
        </div>
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-gray-400">Page {page} of {Math.ceil(total / 30)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 30)}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  )
}
