'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'

interface Correction {
  id: string
  place_id: string
  corrections: Record<string, any>
  note: string | null
  status: string
  created_at: string
  places: { id: string; name: string; slug: string; address: string; city: string; country: string }
  users: { id: string; username: string; first_name: string | null; last_name: string | null; avatar_url: string | null }
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name', address: 'Address', description: 'Description', category: 'Category',
  website: 'Website', phone: 'Phone', opening_hours: 'Opening Hours', vegan_level: 'Vegan Level',
}

export default function AdminCorrectionsPage() {
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')

  const fetchCorrections = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/corrections?status=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setCorrections(data.corrections || [])
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchCorrections() }, [filter])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id)
    try {
      const res = await fetch('/api/admin/corrections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (res.ok) {
        setCorrections(prev => prev.filter(c => c.id !== id))
      }
    } catch {}
    setProcessing(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Place Corrections</h1>
          <p className="text-gray-400 text-sm mt-1">Review user-submitted corrections to places</p>
        </div>
        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === s ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : corrections.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">No {filter} corrections</p>
        </div>
      ) : (
        <div className="space-y-4">
          {corrections.map(c => (
            <div key={c.id} className="bg-gray-800 rounded-xl p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link
                    href={`/place/${c.places?.slug || c.place_id}`}
                    target="_blank"
                    className="text-lg font-bold text-white hover:text-emerald-400 inline-flex items-center gap-1.5"
                  >
                    {c.places?.name || 'Unknown Place'}
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <p className="text-sm text-gray-400">
                    {c.places?.city}, {c.places?.country}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-300">
                    by <span className="font-medium text-white">{c.users?.username || 'Unknown'}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Corrections diff */}
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <div className="space-y-2">
                  {Object.entries(c.corrections).map(([field, newValue]) => (
                    <div key={field} className="flex items-start gap-3">
                      <span className="text-xs font-medium text-gray-400 w-28 flex-shrink-0 pt-0.5">
                        {FIELD_LABELS[field] || field}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-emerald-400 break-words">
                          {String(newValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note */}
              {c.note && (
                <p className="text-sm text-gray-300 mb-4 italic">
                  Note: {c.note}
                </p>
              )}

              {/* Actions */}
              {filter === 'pending' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAction(c.id, 'approve')}
                    disabled={processing === c.id}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {processing === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Approve & Apply
                  </button>
                  <button
                    onClick={() => handleAction(c.id, 'reject')}
                    disabled={processing === c.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
