'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'

/**
 * Supporter perk: ask us to verify/deep-check this place. Self-gating — only
 * renders for paying supporters (tier medium/premium). Posts to the
 * request-verification API, which files it in the admin data-quality queue.
 */
export default function RequestVerificationButton({ placeId }: { placeId: string }) {
  const { profile } = useAuth()
  const p = profile as { subscription_tier?: string } | null
  const isSupporter = ['medium', 'premium'].includes(p?.subscription_tier || '')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  if (!isSupporter) return null

  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary">
        <ShieldCheck className="h-4 w-4" /> Verification requested — thanks!
      </span>
    )
  }

  const onClick = async () => {
    setState('loading')
    try {
      const r = await fetch(`/api/places/${placeId}/request-verification`, { method: 'POST' })
      setState(r.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={state === 'loading'}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-surface-variant ghost-border hover:bg-surface-container-low rounded-xl transition-colors disabled:opacity-50"
    >
      <ShieldCheck className="h-4 w-4" />
      {state === 'loading' ? 'Requesting…' : state === 'error' ? 'Try again' : 'Request verification'}
    </button>
  )
}
