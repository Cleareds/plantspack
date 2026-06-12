'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, ExternalLink, CheckCircle, XCircle, MapPin, Globe,
  Smartphone, User as UserIcon,
} from 'lucide-react'

interface Submission {
  id: string
  user_id: string
  name: string
  category: string
  vegan_level: string
  address: string | null
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  website: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  review_note: string | null
  imported_place_id: string | null
  created_at: string
  submitter: { username: string | null; email: string | null } | null
}

interface Stats { pending: number; approved: number; rejected: number }

const STATUS_TABS: Array<{ id: Submission['status']; label: string; color: string }> = [
  { id: 'pending', label: 'Pending', color: 'text-amber-600' },
  { id: 'approved', label: 'Approved', color: 'text-emerald-600' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-600' },
]

const VEGAN_LEVELS = [
  { value: 'fully_vegan', label: '100% Vegan' },
  { value: 'mostly_vegan', label: 'Mostly Vegan' },
  { value: 'vegan_friendly', label: 'Vegan-Friendly' },
  { value: 'vegan_options', label: 'Has Options' },
]

export default function SubmissionsPage() {
  const [status, setStatus] = useState<Submission['status']>('pending')
  const [rows, setRows] = useState<Submission[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [levels, setLevels] = useState<Record<string, string>>({})

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/submissions?status=${status}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setRows(d.rows ?? [])
        setStats(d.stats ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status])

  useEffect(() => { load() }, [load])

  const act = useCallback(async (row: Submission, action: 'approve' | 'reject') => {
    if (action === 'reject' && !confirm(`Reject "${row.name}"?`)) return
    setProcessingId(row.id)
    try {
      const res = await fetch(`/api/admin/submissions/${row.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, vegan_level: levels[row.id] ?? row.vegan_level }),
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok || res.status === 409) {
        setMessage(res.ok
          ? `${action === 'approve' ? 'Approved' : 'Rejected'}: ${row.name}${data.slug ? ` → /place/${data.slug}` : ''}`
          : `Already ${data.already ?? 'reviewed'}: ${row.name}`)
        setRows(prev => prev.filter(r => r.id !== row.id))
        setStats(s => s ? { ...s, pending: Math.max(0, s.pending - 1) } : s)
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    }
    setProcessingId(null)
    setTimeout(() => setMessage(null), 4000)
  }, [levels])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Smartphone className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-on-surface">Mobile place submissions</h1>
      </div>
      <p className="text-on-surface-variant mb-6 text-sm">
        Places suggested by users in the mobile app. Approving inserts an <strong>unverified</strong> place
        (tagged <code>mobile-suggest</code>) — it is <em>not</em> marked admin-reviewed. Run the full verify
        flow on the place page afterwards if you confirm it.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-outline-variant">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatus(tab.id)}
            className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm transition-colors ${
              status === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label}
            {stats && <span className={`ml-2 ${tab.color}`}>{stats[tab.id]}</span>}
          </button>
        ))}
      </div>

      {message && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm">{message}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          No {status} submissions.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(row => (
            <div key={row.id} className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-on-surface">{row.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
                    <span className="capitalize">{row.category}</span>
                    <span className="capitalize">{row.vegan_level?.replace(/_/g, ' ')}</span>
                    {(row.city || row.country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />{[row.city, row.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                  {row.address && <p className="mt-1 text-sm text-on-surface-variant">{row.address}</p>}
                  {row.website && (
                    <a href={row.website} target="_blank" rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <Globe className="h-3.5 w-3.5" />{row.website}<ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {row.notes && (
                    <p className="mt-2 text-sm text-on-surface bg-surface-container rounded-lg p-3">{row.notes}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {row.submitter?.username || row.submitter?.email || 'unknown'}
                    </span>
                    <span>{new Date(row.created_at).toLocaleDateString()}</span>
                    {row.latitude != null && row.longitude != null && (
                      <a href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                        target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        map ↗
                      </a>
                    )}
                  </div>
                  {row.status === 'rejected' && row.review_note && (
                    <p className="mt-2 text-xs text-red-600">Reason: {row.review_note}</p>
                  )}
                  {row.status === 'approved' && row.imported_place_id && (
                    <p className="mt-2 text-xs text-emerald-600">Imported as place {row.imported_place_id}</p>
                  )}
                </div>

                {row.status === 'pending' && (
                  <div className="flex flex-col gap-2 w-44">
                    <select
                      value={levels[row.id] ?? row.vegan_level}
                      onChange={e => setLevels(l => ({ ...l, [row.id]: e.target.value }))}
                      className="text-sm border border-outline-variant rounded-lg px-2 py-1.5 bg-white"
                    >
                      {VEGAN_LEVELS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                    <button
                      onClick={() => act(row, 'approve')}
                      disabled={processingId === row.id}
                      className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {processingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() => act(row, 'reject')}
                      disabled={processingId === row.id}
                      className="flex items-center justify-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
