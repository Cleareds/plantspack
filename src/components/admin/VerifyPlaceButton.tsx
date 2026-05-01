'use client'

import { useState } from 'react'
import { Check, RotateCcw, Loader2 } from 'lucide-react'

/**
 * "Confirm exists" button for the per-country admin data-quality page.
 * Posts to /api/admin/places/{id}/verify which sets verification_level=3
 * (admin-confirmed). Click again with shift to revert.
 */
export default function VerifyPlaceButton({
  placeId,
  initialVerified,
}: {
  placeId: string
  initialVerified: boolean
}) {
  const [verified, setVerified] = useState(initialVerified)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const toggle = async (unverify: boolean) => {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/places/${placeId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unverify }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `${res.status}`)
      }
      setVerified(!unverify)
    } catch (e: any) {
      setErr(e?.message || 'failed')
    } finally {
      setBusy(false)
    }
  }

  if (verified) {
    return (
      <div className="flex items-center gap-1">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-medium">
          <Check className="h-3 w-3" /> Verified
        </span>
        <button
          onClick={() => toggle(true)}
          disabled={busy}
          title="Revert to ai-verified"
          className="text-xs text-on-surface-variant hover:text-red-600 px-1"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => toggle(false)}
        disabled={busy}
        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary text-on-primary-btn text-xs font-medium hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        Confirm exists
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  )
}
