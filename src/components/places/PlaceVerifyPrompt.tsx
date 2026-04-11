'use client'

import { useState } from 'react'
import { CheckCircle, AlertTriangle, Clock, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PlaceVerifyPromptProps {
  placeId: string
  placeName: string
}

export default function PlaceVerifyPrompt({ placeId, placeName }: PlaceVerifyPromptProps) {
  const [dismissed, setDismissed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [issue, setIssue] = useState<string | null>(null)

  if (dismissed || submitted) return null

  // Only show if user hasn't verified this place in this session
  const key = `verified_${placeId}`
  if (typeof window !== 'undefined' && sessionStorage.getItem(key)) return null

  const handleConfirm = async () => {
    sessionStorage.setItem(key, '1')
    // Touch the place to mark as community-verified
    await supabase.from('places').update({ updated_at: new Date().toISOString() }).eq('id', placeId)
    setSubmitted(true)
  }

  const handleReport = async (type: string) => {
    sessionStorage.setItem(key, '1')
    // Add a report/tag
    const { data } = await supabase.from('places').select('tags').eq('id', placeId).single()
    const tags = data?.tags || []
    const reportTag = `community_report:${type}`
    if (!tags.includes(reportTag)) {
      await supabase.from('places').update({
        tags: [...tags, reportTag],
        updated_at: new Date().toISOString(),
      }).eq('id', placeId)
    }
    setSubmitted(true)
    setIssue(type)
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50 rounded-lg p-3 text-xs text-emerald-700 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        {issue ? 'Thanks for reporting! We\'ll review this.' : 'Thanks for confirming!'}
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
        <button onClick={handleConfirm}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors">
          <CheckCircle className="h-3 w-3" /> Yes, looks correct
        </button>
        <button onClick={() => handleReport('hours_wrong')}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors">
          <Clock className="h-3 w-3" /> Hours changed
        </button>
        <button onClick={() => handleReport('permanently_closed')}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
          <AlertTriangle className="h-3 w-3" /> Closed
        </button>
      </div>
      <p className="text-[10px] text-on-surface-variant/50 mt-2">Your feedback helps keep our data accurate</p>
    </div>
  )
}
