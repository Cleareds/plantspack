'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Thin top-of-page progress bar that appears on every internal link click and
 * disappears when the destination route renders. Fixes the "I clicked but
 * nothing happened" gap that comes from Next.js client-side navigation
 * suppressing the browser's native loading indicator.
 *
 * Implementation:
 * - A document-level capture-phase click listener detects in-app anchor
 *   clicks and starts the bar.
 * - The bar advances asymptotically toward 90 % so it never stalls at zero
 *   on slow pages.
 * - When the pathname or search params change (route committed), the bar
 *   completes to 100 % and fades out.
 */
function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const tickRef = useRef<number | null>(null)
  const fadeRef = useRef<number | null>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      const a = (e.target as HTMLElement | null)?.closest('a')
      if (!a) return
      if (a.target && a.target !== '_self') return
      if (a.hasAttribute('download')) return
      const href = a.getAttribute('href')
      if (!href) return
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return
      let url: URL
      try {
        url = new URL(a.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      // Same URL = no navigation pending
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      start()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // Route committed - finish the bar.
  useEffect(() => {
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  function start() {
    if (tickRef.current) window.clearInterval(tickRef.current)
    if (fadeRef.current) window.clearTimeout(fadeRef.current)
    setVisible(true)
    setProgress(8)
    tickRef.current = window.setInterval(() => {
      setProgress(p => (p < 90 ? p + (90 - p) * 0.12 : p))
    }, 200)
  }

  function finish() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (!visible) return
    setProgress(100)
    fadeRef.current = window.setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 280)
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 top-0 z-[9999] h-[2px]"
      style={{
        opacity: visible ? 1 : 0,
        transition: visible ? 'none' : 'opacity 220ms ease 120ms',
      }}
    >
      <div
        className="h-full bg-primary"
        style={{
          width: `${progress}%`,
          transition: 'width 220ms ease-out',
          boxShadow: '0 0 10px rgba(34, 197, 94, 0.55)',
        }}
      />
    </div>
  )
}

import { Suspense } from 'react'

export default function NavigationProgress() {
  // useSearchParams() requires a Suspense boundary in App Router.
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  )
}
