'use client'
import { safeStorage } from "@/lib/safe-storage"

import { useState } from 'react'
import { CheckCircle, AlertTriangle, Clock, X, Leaf, ShieldAlert, Link2, Store } from 'lucide-react'

const REPORT_LABELS: Record<string, string> = {
  hours_wrong: 'Hours changed',
  permanently_closed: 'Closed',
  not_fully_vegan: 'Not 100% vegan',
  actually_fully_vegan: 'Actually 100% vegan',
  not_vegan_friendly: 'Not vegan-friendly',
  non_vegan_chain: 'Non-vegan friendly chain',
  vegan_friendly_chain: 'Vegan-friendly chain',
  few_vegan_options: 'Few vegan options only',
}

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
  // Read the prior-submission flag once on mount via lazy initializer. Reading
  // it inside render (as we used to) caused the thank-you panel below to be
  // hidden the moment we set sessionStorage on submit — the next render would
  // see the flag and return null before reaching the `submitted` branch.
  const key = `verified_${placeId}`
  const [previouslySubmitted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return !!safeStorage.session.get(key)
  })
  const [dismissed, setDismissed] = useState(false)
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // A report chip that's been picked but not yet submitted — reveals the
  // optional "how do you know?" note field. Kept collapsed until then so the
  // prompt stays compact.
  const [pendingType, setPendingType] = useState<string | null>(null)
  const [note, setNote] = useState('')

  if (dismissed) return null
  // Hide the form if a prior session already submitted, but only when there's
  // no live thank-you message to show this render.
  if (previouslySubmitted && !submitted) return null

  const handleConfirm = async () => {
    setSubmitting(true)
    safeStorage.session.set(key, '1')
    // Confirm via API (uses admin client to bypass RLS)
    await fetch(`/api/places/${placeId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'confirmed' }),
    }).catch(() => {})
    setSubmitted('confirmed')
  }

  const handleReport = async (type: string, noteText?: string) => {
    setSubmitting(true)
    safeStorage.session.set(key, '1')
    const res = await fetch(`/api/places/${placeId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, note: noteText?.trim() || undefined }),
    })
    if (!res.ok) {
      console.error('Failed to submit report')
    }
    setSubmitted(type)
  }

  if (submitted) {
    const isConfirm = submitted === 'confirmed'
    return (
      <div className={`rounded-lg p-3 text-xs flex items-center gap-2 ${
        isConfirm ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}>
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        <span>
          {isConfirm
            ? 'Thanks for your contribution! We\'ve recorded your confirmation.'
            : 'Thanks for your contribution! We\'ll review this and update the listing.'}
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
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          type="button"
          className="text-on-surface-variant/70 hover:text-on-surface-variant flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleConfirm} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors disabled:opacity-50">
          <CheckCircle className="h-3 w-3" /> Yes, looks correct
        </button>
        <button onClick={() => setPendingType('hours_wrong')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors disabled:opacity-50">
          <Clock className="h-3 w-3" /> Hours changed
        </button>
        <button onClick={() => setPendingType('permanently_closed')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50">
          <AlertTriangle className="h-3 w-3" /> Closed
        </button>
        <button onClick={() => setPendingType('not_fully_vegan')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors disabled:opacity-50">
          <Leaf className="h-3 w-3" /> Not 100% vegan
        </button>
        <button onClick={() => setPendingType('actually_fully_vegan')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors disabled:opacity-50">
          <CheckCircle className="h-3 w-3" /> Actually 100% vegan
        </button>
        <button onClick={() => setPendingType('not_vegan_friendly')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors disabled:opacity-50">
          <Leaf className="h-3 w-3" /> Not vegan-friendly
        </button>
        <button onClick={() => setPendingType('non_vegan_chain')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50">
          <Link2 className="h-3 w-3" /> Non-vegan friendly chain
        </button>
        <button onClick={() => setPendingType('vegan_friendly_chain')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors disabled:opacity-50">
          <Store className="h-3 w-3" /> Vegan-friendly chain
        </button>
        <button onClick={() => setPendingType('few_vegan_options')} disabled={submitting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors disabled:opacity-50">
          <Leaf className="h-3 w-3" /> Few vegan options only
        </button>
      </div>

      {/* Optional evidence note — only appears after a report type is picked, so
          the prompt stays compact until then. Note is optional; submit either way. */}
      {pendingType && (
        <div className="mt-2.5 rounded-md bg-surface-container-low p-2.5">
          <label className="block text-[11px] font-medium text-on-surface mb-1">
            Reporting “{REPORT_LABELS[pendingType] ?? pendingType}” - how do you know?{' '}
            <span className="font-normal text-on-surface-variant">(optional; a link or what you saw helps us check faster)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            autoFocus
            placeholder="e.g. walked past today and it was boarded up, or their website says permanently closed"
            className="w-full text-xs rounded-md border border-outline-variant/30 bg-surface-container-lowest p-2 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleReport(pendingType, note)}
              disabled={submitting}
              className="px-3 py-1.5 text-[11px] font-medium text-on-primary-btn silk-gradient rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Submit report'}
            </button>
            <button
              type="button"
              onClick={() => { setPendingType(null); setNote('') }}
              disabled={submitting}
              className="text-[11px] text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-on-surface-variant mt-2">Your feedback helps keep our data accurate</p>
    </div>
  )
}
