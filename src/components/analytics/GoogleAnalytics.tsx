'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

const GA_MEASUREMENT_ID = 'G-402EVF2GP0'

export default function GoogleAnalytics() {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    // Only load in production to avoid polluting analytics during development
    // Also check if we're in a browser environment
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'production' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
    ) {
      setShouldLoad(true)
    }
  }, [])

  // Don't render anything in development or server-side
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
