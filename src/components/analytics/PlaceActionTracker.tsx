'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Counts taps on a place page's directions / website / phone links for the
 * owner's detailed stats. Links opt in with data-place-action="...". One
 * count per action per tab session, identifier-free (like ViewTracker).
 */
export default function PlaceActionTracker({ placeId }: { placeId: string }) {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-place-action]') as HTMLElement | null
      if (!el) return
      const action = el.dataset.placeAction
      if (!action || !['directions', 'website', 'phone', 'menu', 'booking', 'order'].includes(action)) return
      if (typeof navigator !== 'undefined' && navigator.webdriver) return
      const key = `pp_action:${placeId}:${action}`
      try {
        if (sessionStorage.getItem(key)) return
        sessionStorage.setItem(key, '1')
      } catch { /* storage blocked: still count once */ }
      ;(supabase as any).rpc('record_place_action', { p_place_id: placeId, p_action: action }).then(() => {}, () => {})
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [placeId])
  return null
}
