'use client'

// One-click delist (archive) for admins, rendered next to the vegan-level
// editor on place pages. Exists so a confirmed "not vegan" report can be
// acted on without a trip to the admin panel (community feedback
// 2026-07-13: fish shops listed as vegan needed a fast removal path).
// Archives, never deletes - the row keeps its history and can be restored.

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { Archive } from 'lucide-react'

export default function AdminDelistButton({ placeId, placeName }: { placeId: string; placeName: string }) {
  const { profile } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if ((profile as any)?.role !== 'admin') return null

  const delist = async () => {
    const reason = window.prompt(
      `Delist "${placeName}" from the directory?\n\nReason (stored on the row):`,
      'no vegan options - community report confirmed',
    )
    if (reason === null) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/places/${placeId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason.trim() || 'admin_delisted' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to delist')
        return
      }
      router.push('/vegan-places')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={delist}
      disabled={busy}
      title="Admin: remove this place from the directory (archived, reversible)"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
    >
      <Archive className="h-3 w-3" />
      {busy ? 'Delisting…' : 'Delist'}
    </button>
  )
}
