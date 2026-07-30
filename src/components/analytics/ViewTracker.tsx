'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type EntityType = 'place' | 'pack' | 'post'

interface ViewTrackerProps {
  entityType: EntityType
  entityId: string
}

/**
 * Fire-and-forget view counter.
 *
 * Calls the `record_content_view` Postgres function directly rather than an
 * `/api/**` route, for two reasons:
 *
 *   - Place pages are ISR/CDN-cached, so a server-side count would only fire on
 *     a cache miss and would badly under-report exactly the pages that rank.
 *   - It costs zero Vercel function invocations, which have been a real line on
 *     the bill. The mobile app calls the same function, so web and app counts are
 *     directly comparable.
 *
 * Per-session dedupe via sessionStorage: a reload, a back-navigation, or a
 * Strict-Mode double-effect in dev must not each count as a fresh view. Cleared
 * when the tab closes, so a genuine return visit tomorrow does count.
 */
export default function ViewTracker({ entityType, entityId }: ViewTrackerProps) {
  useEffect(() => {
    if (!entityId) return

    const key = `pp_viewed:${entityType}:${entityId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // Private mode / storage disabled. Counting once per mount is a better
      // failure mode than not counting at all.
    }

    // Headless browsers and most automation report this. Cheap way to keep
    // obvious non-humans out of a number we show to contributors.
    if (typeof navigator !== 'undefined' && navigator.webdriver) return

    supabase
      .rpc('record_content_view', { p_entity_type: entityType, p_entity_id: entityId })
      .then(({ error }) => {
        // Never surface this. A failed counter must not look like a broken page.
        if (error && process.env.NODE_ENV === 'development') {
          console.debug('[ViewTracker]', error.message)
        }
      })
  }, [entityType, entityId])

  return null
}
