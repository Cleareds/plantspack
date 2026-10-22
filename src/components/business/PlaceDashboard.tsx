'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { OwnedPlaceCard } from './BusinessDashboard'
import type { OwnedPlace } from '@/lib/business/owned-places'

/**
 * The dashboard for one place: the same card the owner sees on
 * /business/dashboard. Owners can open their own places, admins any place,
 * which is how admins test the owner experience.
 */
export default function PlaceDashboard({ placeId }: { placeId: string }) {
  const [place, setPlace] = useState<OwnedPlace | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch(`/api/business/places/${placeId}`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) { setError(d.error || 'You cannot open this dashboard.'); return }
        const p = d.place
        setPlace({
          id: p.id, slug: p.slug, name: p.name, city: p.city, country: p.country,
          category: p.category ?? 'eat', vegan_level: p.vegan_level, main_image_url: p.main_image_url ?? null, verified_at: null,
        })
      })
      .catch(() => setError('The dashboard could not be loaded. Please refresh.'))
  }, [placeId])

  useEffect(() => { load() }, [load])

  if (error) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl ghost-border p-8">
        <p className="text-on-surface mb-4">{error}</p>
        <Link href="/business" className="text-primary font-medium hover:underline">How to claim your place</Link>
      </div>
    )
  }
  if (!place) {
    return <div className="flex items-center gap-2 text-on-surface-variant py-16"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>
  }
  return <OwnedPlaceCard place={place} onChanged={load} />
}
