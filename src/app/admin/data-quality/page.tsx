'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Loader2, ExternalLink, Trash2, XCircle, AlertTriangle,
  Clock, Globe, WifiOff, Users, CheckCircle, BarChart3, Leaf
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
}

const TABS = [
  { id: 'closed', label: 'Google Closed', icon: XCircle, color: 'text-red-400' },
  { id: 'temp_closed', label: 'Temp Closed', icon: Clock, color: 'text-amber-400' },
  { id: 'reported_closed', label: 'Reported Closed', icon: Users, color: 'text-orange-400' },
  { id: 'reported_hours', label: 'Wrong Hours', icon: AlertTriangle, color: 'text-yellow-400' },
  { id: 'not_vegan', label: 'Vegan Status', icon: Leaf, color: 'text-orange-400' },
  { id: 'unreachable', label: 'Website Down', icon: WifiOff, color: 'text-gray-400' },
  { id: 'corrections', label: 'Corrections', icon: CheckCircle, color: 'text-emerald-400' },
] as const

type TabId = typeof TABS[number]['id']

const FIELD_LABELS: Record<string, string> = {
  name: 'Name', address: 'Address', description: 'Description', category: 'Category',
  website: 'Website', phone: 'Phone', opening_hours: 'Opening Hours', vegan_level: 'Vegan Level',
}

export default function DataQualityPage() {
  const [tab, setTab] = useState<TabId>('closed')
  const [places, setPlaces] = useState<FlaggedPlace[]>([])
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetch('/api/admin/data-quality?tab=stats')
      .then(r => r.json())
      .then(d => setStats(d.stats))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setPage(1)
  }, [tab])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/data-quality?tab=${tab}&page=${page}`)
        const data = await res.json()
        if (tab === 'corrections') {
          setCorrections(data.corrections || [])
        } else {
          setPlaces(data.places || [])
        }
        setTotal(data.total || 0)
      } catch {}
      setLoading(false)
    }
    fetchData()
  }, [tab, page])

  const handleDelete = async (placeId: string) => {
    if (!confirm('Delete this place permanently?')) return
    setProcessing(placeId)
    try {
      const res = await fetch('/api/admin/data-quality', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId }),
      })
      if (res.ok) {
        setPlaces(prev => prev.filter(p => p.id !== placeId))
        setTotal(prev => prev - 1)
        if (stats) {
          const statsKey = tab === 'closed' ? 'googleClosed' :
            tab === 'temp_closed' ? 'googleTempClosed' :
            tab === 'reported_closed' ? 'reportedClosed' :
            tab === 'reported_hours' ? 'reportedHours' :
            tab === 'not_vegan' ? 'reportedNotVegan' : 'unreachable'
          setStats({ ...stats, [statsKey]: (stats[statsKey as keyof Stats] as number) - 1 })
        }
      }
    } catch {}
    setProcessing(null)
  }

  const handleDismiss = async (placeId: string, tag: string) => {
    setProcessing(placeId)
    try {
      // For not_vegan tab, clear all possible vegan-report tags on the place
      if (tab === 'not_vegan') {
        for (const t of ['community_report:not_fully_vegan', 'community_report:not_vegan_friendly', 'community_report:non_vegan_chain', 'community_report:vegan_friendly_chain', 'community_report:few_vegan_options']) {
          await fetch('/api/admin/data-quality', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId, removeTag: t }),
          })
        }
      } else {
        await fetch('/api/admin/data-quality', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId, removeTag: tag }),
        })
      }
      setPlaces(prev => prev.filter(p => p.id !== placeId))
      setTotal(prev => prev - 1)
    } catch {}
    setProcessing(null)
  }

  const handleCorrection = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id)
    try {
      const res = await fetch('/api/admin/corrections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (res.ok) {
        setCorrections(prev => prev.filter(c => c.id !== id))
        setTotal(prev => prev - 1)
        if (stats) setStats({ ...stats, pendingCorrections: stats.pendingCorrections - 1 })
      }
    } catch {}
    setProcessing(null)
  }

  const getTagForTab = (): string => {
    switch (tab) {
      case 'closed': return 'google_confirmed_closed'
      case 'temp_closed': return 'google_temporarily_closed'
      case 'reported_closed': return 'community_report:permanently_closed'
      case 'reported_hours': return 'community_report:hours_wrong'
      case 'not_vegan': return '' // handled per-place since it could be either tag
      case 'unreachable': return 'website_unreachable'
      default: return ''
    }
  }

  const getStatForTab = (tabId: TabId): number => {
    if (!stats) return 0
    switch (tabId) {
      case 'closed': return stats.googleClosed
      case 'temp_closed': return stats.googleTempClosed
      case 'reported_closed': return stats.reportedClosed
      case 'reported_hours': return stats.reportedHours
      case 'unreachable': return stats.unreachable
      case 'not_vegan': return stats.reportedNotVegan
      case 'corrections': return stats.pendingCorrections
      default: return 0
    }
  }

  const totalIssues = stats
    ? stats.googleClosed + stats.googleTempClosed + stats.reportedClosed +
      stats.reportedHours + stats.unreachable + stats.pendingCorrections +
      stats.reportedNotVegan
    : 0

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 className="h-6 w-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Data Quality</h1>
        </div>
        <p className="text-gray-400 text-sm">
          {stats ? `${totalIssues} issues across ${stats.totalPlaces.toLocaleString()} places` : 'Loading...'}
        </p>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Google Closed</p>
            <p className="text-xl font-bold text-red-400">{stats.googleClosed}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Temp Closed</p>
            <p className="text-xl font-bold text-amber-400">{stats.googleTempClosed}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Community Reports</p>
            <p className="text-xl font-bold text-orange-400">{stats.reportedClosed + stats.reportedHours}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Pending Corrections</p>
            <p className="text-xl font-bold text-emerald-400">{stats.pendingCorrections}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => {
          const Icon = t.icon
          const count = getStatForTab(t.id)
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Icon className={`h-4 w-4 ${tab === t.id ? 'text-white' : t.color}`} />
              {t.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {count}
                </span>
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
        // Corrections view
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
                    <Link
                      href={`/place/${c.places?.slug || c.place_id}`}
                      target="_blank"
                      className="font-bold text-white hover:text-emerald-400 inline-flex items-center gap-1"
                    >
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
                  <button
                    onClick={() => handleCorrection(c.id, 'approve')}
                    disabled={processing === c.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {processing === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleCorrection(c.id, 'reject')}
                    disabled={processing === c.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Places view
        places.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400">No places with this flag</p>
          </div>
        ) : (
          <div className="space-y-2">
            {places.map(p => {
              const googleCheckDate = (p.tags || []).find(t => t.startsWith('google_checked:'))?.split(':')[1]
              return (
                <div key={p.id} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/place/${p.slug || p.id}`}
                        target="_blank"
                        className="font-medium text-white hover:text-emerald-400 inline-flex items-center gap-1 truncate"
                      >
                        {p.name}
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-gray-400">{p.city}, {p.country}</p>
                      {p.vegan_level && tab === 'not_vegan' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          p.vegan_level === 'fully_vegan' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-amber-900/50 text-amber-300'
                        }`}>
                          {p.vegan_level.replace('_', ' ')}
                        </span>
                      )}
                      {tab === 'not_vegan' && (p.tags || []).filter(t => t.startsWith('community_report:not') || t.startsWith('community_report:non_') || t.startsWith('community_report:vegan_') || t.startsWith('community_report:few_')).map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-900/50 text-orange-300 font-medium">
                          {t.replace('community_report:', '').replace(/_/g, ' ')}
                        </span>
                      ))}
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate max-w-48">
                          {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      )}
                      {googleCheckDate && (
                        <span className="text-xs text-gray-500">Checked: {googleCheckDate}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDismiss(p.id, getTagForTab())}
                      disabled={processing === p.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium disabled:opacity-50"
                      title="Dismiss flag (place is fine)"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={processing === p.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs font-medium disabled:opacity-50"
                      title="Delete place permanently"
                    >
                      {processing === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {Math.ceil(total / 30)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 30)}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
