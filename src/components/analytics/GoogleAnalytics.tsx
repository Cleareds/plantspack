'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

const GA_MEASUREMENT_ID = 'G-402EVF2GP0'

function isProductionBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  )
}

/**
 * Loads the gtag.js library for ALL production visitors — NOT gated on consent.
 * Consent is handled by Google Consent Mode v2: the inline bootstrap in the
 * <head> (see layout.tsx) sets analytics_storage='denied' by default, so until
 * a user opts in GA only sends cookieless pings (no identifiers stored). On
 * opt-in, CookieConsent calls gtag('consent','update',...) to switch to full
 * cookie measurement. This is the GDPR-compliant pattern and recovers the
 * organic traffic the old consent gate dropped entirely.
 *
 * `afterInteractive` (vs the previous `lazyOnload`) loads the library right
 * after hydration — still off the critical render path, but early enough that
 * the landing page_view registers before fast bounces. gtag's config/consent
 * commands were already queued synchronously in the head, so they replay in
 * order the moment this library finishes loading.
 */
export default function GoogleAnalytics() {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (isProductionBrowser()) setShouldLoad(true)
  }, [])

  if (!shouldLoad) return null

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  )
}
