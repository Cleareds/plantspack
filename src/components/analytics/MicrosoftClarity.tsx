'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_ID || 'wpglvbdxu2'
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

export default function MicrosoftClarity() {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (!CLARITY_PROJECT_ID) return
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

  if (!CLARITY_PROJECT_ID || !shouldLoad) return null

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
      `}
    </Script>
  )
}
