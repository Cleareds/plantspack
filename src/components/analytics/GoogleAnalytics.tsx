'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

const GA_MEASUREMENT_ID = 'G-402EVF2GP0'
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

function isProductionBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  )
}

export default function GoogleAnalytics() {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (!isProductionBrowser()) return

    // Check consent on mount
    if (hasAnalyticsConsent()) {
      setShouldLoad(true)
    }

    // Listen for consent changes (dispatched by CookieConsent component)
    const handleConsentChange = () => {
      if (hasAnalyticsConsent()) {
        setShouldLoad(true)
      } else {
        setShouldLoad(false)
      }
    }

    window.addEventListener('cookie-consent-changed', handleConsentChange)
    return () => {
      window.removeEventListener('cookie-consent-changed', handleConsentChange)
    }
  }, [])

  // Don't render anything until user has given analytics consent
  if (!shouldLoad) {
    return null
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
        async
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            send_page_view: true,
            anonymize_ip: true,
          });
        `}
      </Script>
    </>
  )
}
