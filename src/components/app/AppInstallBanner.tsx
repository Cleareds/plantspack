'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { PLAY_URL } from '@/lib/app-links'
import { safeStorage } from '@/lib/safe-storage'

const DISMISS_KEY = 'app_banner_dismissed'

/**
 * Slim, dismissible "Get the app" banner for Android mobile-web visitors.
 *
 * iOS is intentionally NOT handled here — Safari renders its own native Smart
 * App Banner from the `apple-itunes-app` meta tag in layout.tsx. Chrome's
 * native-app install banner (manifest `related_applications`) is unreliable, so
 * Android gets this custom bar instead. We show ONLY on Android mobile web,
 * never inside the installed PWA (display-mode: standalone), never on desktop
 * (the component is also `lg:hidden`), and never after dismissal.
 */
export default function AppInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (safeStorage.local.get(DISMISS_KEY)) return

    const ua = navigator.userAgent || ''
    const isAndroid = /android/i.test(ua)
    if (!isAndroid) return

    // Already running as the installed PWA — no point promoting the app.
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari legacy flag; harmless to check on Android too.
      (navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) return

    setShow(true)
  }, [])

  function dismiss() {
    safeStorage.local.set(DISMISS_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 lg:hidden px-2 pb-2">
      <div className="flex items-center gap-3 rounded-xl bg-surface-container-high shadow-lg border border-outline-variant/40 px-3 py-2.5">
        <img
          src="/icon-192.png"
          alt=""
          aria-hidden
          className="h-9 w-9 rounded-lg flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-on-surface leading-tight">Get the Plants Pack app</p>
          <p className="text-xs text-on-surface-variant leading-tight truncate">
            Vegan places near you, on the go
          </p>
        </div>
        <a
          href={PLAY_URL}
          target="_blank"
          rel="noopener"
          onClick={dismiss}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-on-primary-btn silk-gradient rounded-lg hover:opacity-90 transition-opacity"
        >
          Get
        </a>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-on-surface-variant hover:text-on-surface"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
