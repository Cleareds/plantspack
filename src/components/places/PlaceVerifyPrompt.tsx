'use client'

import { useState } from 'react'
import { CheckCircle, AlertTriangle, Clock, X, Leaf, ShieldAlert } from 'lucide-react'

interface PlaceVerifyPromptProps {
  placeId: string
  placeName: string
  /** When true, show the stronger amber banner — place was imported from a
   *  community source and has not been verified yet. Derived server-side from
   *  verification_status + source. */
  needsCommunityVerification?: boolean
  /** Human-friendly source descriptor, e.g. "imported from VegGuide.org (2015)". */
  sourceLabel?: string
}

export default function PlaceVerifyPrompt({ placeId, placeName, needsCommunityVerification, sourceLabel }: PlaceVerifyPromptProps) {
  const [dismissed, setDismissed] = useState(false)
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (dismissed) return null

  // Only show if user hasn't verified this place in this session
  const key = `verified_${placeId}`
  if (typeof window !== 'undefined' && sessionStorage.getItem(key)) return null

  const handleConfirm = async () => {
    setSubmitting(true)
    sessionStorage.setItem(key, '1')
    // Confirm via API (uses admin client to bypass RLS)
    await fetch(`/api/places/${placeId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'confirmed' }),
    }).catch(() => {})
    setSubmitted('confirmed')
  }

  const handleReport = async (type: string) => {
    setSubmitting(true)
    sessionStorage.setItem(key, '1')
    const res = await fetch(`/api/places/${placeId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    if (!res.ok) {
      console.error('Failed to submit report')
    }
    setSubmitted(type)
  }

  if (submitted) {
    return (
      <div className={`rounded-lg p-3 text-xs flex items-center gap-2 ${
        submitted === 'confirmed'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-700'
      }`}>
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        <span>
          {submitted === 'confirmed' && 'Thanks for confirming this place is still open!'}
          {submitted === 'hours_wrong' && 'Thanks! We\'ve flagged the opening hours for review.'}
          {submitted === 'permanently_closed' && 'Thanks for reporting. We\'ll review and remove it if confirmed.'}
          {submitted === 'not_fully_vegan' && 'Thanks! We\'ll review the vegan status of this place.'}
          {submitted === 'not_vegan_friendly' && 'Thanks! We\'ll review whether this place still has vegan options.'}
        </span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg p-3 ${needsCommunityVerification ? 'bg-amber-50 border border-amber-200' : 'bg-surface-container-lowest ghost-border'}`}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {needsCommunityVerification && <ShieldAlert className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <p className={`text-xs font-medium ${needsCommunityVerification ? 'text-amber-900' : 'text-on-surface'}`}>
              {needsCommunityVerification ? 'Help us verify this listing' : 'Is this info still correct?'}
            </p>
            {needsCommunityVerification && (
              <p className="text-[11px] text-amber-800/80 mt-0.5 leading-snug">
                This listing is {sourceLabel ?? 'community-sourced'} and hasn’t been verified yet. Please confirm it’s still open and actually vegan / vegan-friendly.
              </p>
            )}
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-on-surface-variant/40 hover:text-on-surface-variant flex-shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleConfirm} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors disabled:opacity-50">
          <CheckCircle className="h-3 w-3" /> Yes, looks correct
        </button>
        <button onClick={() => handleReport('hours_wrong')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors disabled:opacity-50">
          <Clock className="h-3 w-3" /> Hours changed
        </button>
        <button onClick={() => handleReport('permanently_closed')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50">
          <AlertTriangle className="h-3 w-3" /> Closed
        </button>
        <button onClick={() => handleReport('not_fully_vegan')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors disabled:opacity-50">
          <Leaf className="h-3 w-3" /> Not 100% vegan
        </button>
        <button onClick={() => handleReport('not_vegan_friendly')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors disabled:opacity-50">
          <Leaf className="h-3 w-3" /> Not vegan-friendly
        </button>
      </div>
      <p className="text-[10px] text-on-surface-variant/50 mt-2">Your feedback helps keep our data accurate</p>
    </div>
  )
}
