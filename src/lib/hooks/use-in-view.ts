'use client'

import { useEffect, useRef, useState } from 'react'

interface UseInViewOptions {
  /** Trigger when N pixels before reaching the viewport. Default 200. */
  rootMargin?: string
  /** Once true, stay true (don't unmount when scrolling away). Default true. */
  once?: boolean
  /** If true, treat as in-view immediately (skip the observer). */
  disabled?: boolean
}

/**
 * Hook to defer expensive work (map tiles, third-party iframes, large
 * canvases) until an element nears the viewport. Bots and pre-render
 * crawlers never scroll, so they never fire the observer - this is the
 * cheapest way to keep them off paid/quota-limited APIs.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(opts: UseInViewOptions = {}) {
  const { rootMargin = '200px', once = true, disabled = false } = opts
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (disabled) { setInView(true); return }
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return }
    const obs = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setInView(true)
          if (once) obs.disconnect()
          return
        }
      }
    }, { rootMargin })
    obs.observe(el)
    return () => obs.disconnect()
  }, [rootMargin, once, disabled])

  return { ref, inView }
}
