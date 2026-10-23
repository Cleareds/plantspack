'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { BUSINESS_TOOLS_PUBLIC } from '@/lib/business/launch'

// One lookup per signed-in user per page load, shared by every gate on the page.
const pilotCache = new Map<string, Promise<boolean>>()

function lookupPilot(userId: string): Promise<boolean> {
  let p = pilotCache.get(userId)
  if (!p) {
    const sb = supabase as any
    p = (async () => {
      const { data } = await sb.rpc('get_user_owned_places', { p_user_id: userId })
      const ids = ((data || []) as Array<{ place_id: string }>).map((r) => r.place_id)
      if (!ids.length) return false
      const { data: pilots } = await sb.from('business_pilots').select('place_id').in('place_id', ids)
      return !!pilots?.length
    })().catch(() => false)
    pilotCache.set(userId, p)
  }
  return p
}

/** True when the signed-in user owns at least one pilot place (business_pilots). */
export function usePilotOwner(): boolean | null {
  const { user } = useAuth()
  const [pilot, setPilot] = useState<boolean | null>(null)
  useEffect(() => {
    if (!user) { setPilot(false); return }
    let alive = true
    lookupPilot(user.id).then((v) => { if (alive) setPilot(v) })
    return () => { alive = false }
  }, [user])
  return pilot
}

/**
 * Renders children when the business tools are public, for admins while they
 * are in preview, when `open` (content that is live anyway, e.g. a pilot
 * place), or with `allowPilotOwners` for owners of a pilot place.
 * Everyone else gets the fallback (default: nothing). Client-side, so cached
 * ISR pages stay cached.
 */
export default function AdminPreviewGate({ children, fallback = null, open = false, allowPilotOwners = false }: {
  children: ReactNode
  fallback?: ReactNode
  open?: boolean
  allowPilotOwners?: boolean
}) {
  const { profile, loading } = useAuth()
  const pilot = usePilotOwner()
  if (BUSINESS_TOOLS_PUBLIC || open) return <>{children}</>
  if (loading) return null
  if (profile?.role === 'admin') return <>{children}</>
  if (allowPilotOwners) {
    if (pilot === null) return null
    if (pilot) return <>{children}</>
  }
  return <>{fallback}</>
}

/** Business tools visible to this user: launched, admin, or owner of a pilot place. */
export function useBusinessToolsVisible(): boolean {
  const { profile } = useAuth()
  const pilot = usePilotOwner()
  return BUSINESS_TOOLS_PUBLIC || profile?.role === 'admin' || pilot === true
}
