'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'

type TargetType = 'place' | 'place_review' | 'post' | 'comment' | 'user'

interface ReportButtonProps {
  targetType: TargetType
  targetId: string
  className?: string
  // For places, allow caller to pass extra reasons relevant to listings
  extraReasons?: { value: string; label: string }[]
}

const REASONS: Record<TargetType, { value: string; label: string }[]> = {
  place: [
    { value: 'closed', label: 'Permanently closed' },
    { value: 'wrong_info', label: 'Wrong info (hours, address, etc)' },
    { value: 'not_vegan', label: 'Not actually vegan' },
    { value: 'duplicate', label: 'Duplicate of another listing' },
    { value: 'spam', label: 'Spam or fake' },
    { value: 'other', label: 'Other' },
  ],
  place_review: [
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate', label: 'Inappropriate / abusive' },
    { value: 'wrong_info', label: 'Misleading information' },
    { value: 'other', label: 'Other' },
  ],
  post: [
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate', label: 'Inappropriate' },
    { value: 'other', label: 'Other' },
  ],
  comment: [
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate', label: 'Inappropriate' },
    { value: 'other', label: 'Other' },
  ],
  user: [
    { value: 'spam', label: 'Spam account' },
    { value: 'inappropriate', label: 'Abusive behavior' },
    { value: 'other', label: 'Other' },
  ],
}

export default function ReportButton({ targetType, targetId, className = '', extraReasons = [] }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reasons = [...REASONS[targetType], ...extraReasons]

  async function submit() {
    if (!reason) { setError('Please select a reason'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reported_type: targetType, reported_id: targetId, reason, description: detail.trim() || undefined }),
      })
      if (res.status === 401) { setError('Please sign in to report.'); setSubmitting(false); return }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Failed to submit'); setSubmitting(false); return
      }
      setDone(true)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-error transition-colors ${className}`}
        aria-label="Report"
      >
        <Flag className="h-3.5 w-3.5" />
        <span>Report</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => !submitting && setOpen(false)}>
      <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="space-y-3 text-center">
            <div className="text-emerald-600 font-medium">Thanks — report received.</div>
            <div className="text-sm text-on-surface-variant">An admin will review it shortly.</div>
            <button onClick={() => { setOpen(false); setDone(false); setReason(''); setDetail('') }} className="px-4 py-2 bg-primary text-white rounded-lg">Close</button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-3">Report this {targetType}</h3>
            <div className="space-y-2 mb-4">
              {reasons.map(r => (
                <label key={r.value} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-surface-container">
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={(e) => setReason(e.target.value)} className="mt-1" />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Additional detail (optional)"
              maxLength={500}
              className="w-full text-sm border border-outline rounded-lg p-2 mb-3 resize-none"
              rows={3}
            />
            {error && <div className="text-sm text-error mb-2">{error}</div>}
            <div className="flex gap-2 justify-end">
              <button type="button" disabled={submitting} onClick={() => setOpen(false)} className="px-4 py-2 text-on-surface-variant rounded-lg hover:bg-surface-container">Cancel</button>
              <button type="button" disabled={submitting || !reason} onClick={submit} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
