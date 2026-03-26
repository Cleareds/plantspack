'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

const COOKIE_CONSENT_KEY = 'plantspack_cookie_consent'

function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) return false
    const prefs = JSON.parse(consent)
    return prefs.analytics === true
  } catch {
    return false
  }
}

/**
 * Tracks page views on route changes
 * Uses Next.js navigation hooks for optimal performance
 * Only tracks when user has given analytics cookie consent
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Only track in production and with consent
    if (process.env.NODE_ENV !== 'production') return
    if (!hasAnalyticsConsent()) return

    // Construct full URL with search params
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')

    // Small delay to ensure GA is loaded
    const timeoutId = setTimeout(() => {
      trackPageView(url)
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [pathname, searchParams])

  // This component doesn't render anything
  return null
}
