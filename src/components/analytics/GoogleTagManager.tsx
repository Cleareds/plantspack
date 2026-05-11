'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-MJG3ZGS6'
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

export default function GoogleTagManager() {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (!GTM_ID) return
    if (!isProductionBrowser()) return

    if (hasAnalyticsConsent()) setShouldLoad(true)

    const handleConsentChange = () => {
      setShouldLoad(hasAnalyticsConsent())
    }
    window.addEventListener('cookie-consent-changed', handleConsentChange)
    return () => {
      window.removeEventListener('cookie-consent-changed', handleConsentChange)
    }
  }, [])

  if (!GTM_ID || !shouldLoad) return null

  return (
    <Script id="gtm-init" strategy="afterInteractive">
      {`
        (function(w,d,s,l,i){
          w[l]=w[l]||[];
          w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),
              dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;
          j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GTM_ID}');
      `}
    </Script>
  )
}
