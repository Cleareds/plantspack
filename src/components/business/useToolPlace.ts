'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PlacePlan } from '@/lib/business/plan'

export interface ToolPlace { id: string; slug: string | null; name: string; city: string | null; country: string | null; vegan_level: string | null }

/** Loads the place, its plan and whether the viewer is an admin, for tool pages. */
export function useToolPlace(placeId: string) {
  const [place, setPlace] = useState<ToolPlace | null>(null)
  const [plan, setPlan] = useState<PlacePlan | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(() => {
    fetch(`/api/business/places/${placeId}`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) { setError(d.error || 'You cannot open this page.'); return }
        setPlace(d.place)
        setPlan(d.plan)
        setIsAdmin(!!d.isAdmin)
      })
      .catch(() => setError('This page could not be loaded. Please refresh.'))
  }, [placeId])
  useEffect(() => { reload() }, [reload])
  return { place, plan, isAdmin, error, reload }
}
