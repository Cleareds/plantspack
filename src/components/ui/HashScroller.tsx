'use client'

import { useEffect } from 'react'

/**
 * Re-scrolls to window.location.hash after client-side content loads.
 * Native browser scroll runs before async children (images, fetch-on-mount
 * components) have rendered, so the landing position is often wrong. This
 * re-tries a few times as layout settles.
 */
export default function HashScroller() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash) return

    let target: Element | null = null
    try {
      target = document.querySelector(hash)
    } catch {
      return
    }
    if (!target) return

    const scrollToTarget = () => {
      target!.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    scrollToTarget()
    const timers = [
      setTimeout(scrollToTarget, 150),
      setTimeout(scrollToTarget, 500),
      setTimeout(scrollToTarget, 1200),
    ]

    return () => { timers.forEach(clearTimeout) }
  }, [])

  return null
}
