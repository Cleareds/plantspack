'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

/**
 * Sends a GA4 page_view on every route change (including the initial landing,
 * since the head config uses send_page_view:false).
 *
 * No consent gate here on purpose: under Google Consent Mode v2 the pageview is
 * sent for everyone — as a cookieless ping when analytics_storage is denied,
 * and as a full hit once the visitor opts in. gtag is queued synchronously by
 * the head bootstrap, so no setTimeout is needed to wait for the library.
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    trackPageView(url)
  }, [pathname, searchParams])

  return null
}
