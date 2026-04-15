'use client'

import { useState } from 'react'
import { CheckCircle, AlertTriangle, Clock, X, Leaf } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PlaceVerifyPromptProps {
  placeId: string
  placeName: string
}

export default function PlaceVerifyPrompt({ placeId, placeName }: PlaceVerifyPromptProps) {
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
    await supabase.from('places').update({ updated_at: new Date().toISOString() }).eq('id', placeId)
    setSubmitted('confirmed')
  }

  const handleReport = async (type: string) => {
    setSubmitting(true)
    sessionStorage.setItem(key, '1')
    const { data } = await supabase.from('places').select('tags').eq('id', placeId).single()
    const tags = data?.tags || []
    const reportTag = `community_report:${type}`
    if (!tags.includes(reportTag)) {
      await supabase.from('places').update({
        tags: [...tags, reportTag],
        updated_at: new Date().toISOString(),
      }).eq('id', placeId)
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
    <div className="bg-surface-container-lowest rounded-lg ghost-border p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-on-surface">Is this info still correct?</p>
        <button onClick={() => setDismissed(true)} className="text-on-surface-variant/40 hover:text-on-surface-variant">
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
