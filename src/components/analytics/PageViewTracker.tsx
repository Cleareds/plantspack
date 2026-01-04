'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

/**
 * Tracks page views on route changes
 * Uses Next.js navigation hooks for optimal performance
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Only track in production
    if (process.env.NODE_ENV !== 'production') return

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
