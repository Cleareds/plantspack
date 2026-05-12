'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { AuthProvider, useAuth } from '@/lib/auth'
import { VeganFilterProvider } from '@/lib/vegan-filter-context'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import { clearExpiredStates, clearUserStates } from '@/lib/page-state-storage'

// Cookie banner is not in the critical render path. Loading it via
// next/dynamic with ssr:false splits its JS + Lucide icon imports out
// of the main bundle, so first paint doesn't pay for it. We also
// gate the dynamic import on a post-mount state so the chunk fetch
// doesn't compete with LCP — only after the page is interactive.
const CookieConsent = dynamic(() => import('@/components/legal/CookieConsent'), {
  ssr: false,
  loading: () => null,
})

function StateCleanup() {
  const { user } = useAuth()
  const prevUserIdRef = useRef<string | undefined>(undefined)

  // Clear expired states once on app load
  useEffect(() => {
    clearExpiredStates()
  }, [])

  // Clear state when user changes (logout/login as different user)
  useEffect(() => {
    const prevId = prevUserIdRef.current
    const currentId = user?.id

    if (prevId && prevId !== currentId) {
      clearUserStates(prevId)
    }

    prevUserIdRef.current = currentId
  }, [user?.id])

  return null
}

function DeferredCookieConsent() {
  // Wait until the browser is idle (or 2.5s elapsed) before pulling
  // the banner chunk. The banner itself has a 1s internal delay before
  // rendering, so users still see it on first-visit, but the JS fetch
  // doesn't fight the LCP image for bandwidth.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const w = window as any
    if (typeof w.requestIdleCallback === 'function') {
      const handle = w.requestIdleCallback(() => setReady(true), { timeout: 2500 })
      return () => w.cancelIdleCallback?.(handle)
    }
    const t = setTimeout(() => setReady(true), 2500)
    return () => clearTimeout(t)
  }, [])
  if (!ready) return null
  return <CookieConsent />
}

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <VeganFilterProvider>
          <StateCleanup />
          {children}
          <DeferredCookieConsent />
        </VeganFilterProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
