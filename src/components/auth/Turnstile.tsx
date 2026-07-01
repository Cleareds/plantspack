'use client'

import { useCallback, useEffect, useRef } from 'react'

// Cloudflare Turnstile widget. Renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY
// is set, so the signup form works normally before the keys are configured.
// Explicit render (not the auto class-based one) so it plays nicely with React.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SCRIPT_ID = 'cf-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id: string) => void
    }
  }
}

export default function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const doRender = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => onToken(token),
      'expired-callback': () => onToken(null),
      'error-callback': () => onToken(null),
    })
  }, [onToken])

  useEffect(() => {
    if (!SITE_KEY) return
    let poll: ReturnType<typeof setInterval> | undefined

    if (window.turnstile) {
      doRender()
    } else if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement('script')
      s.id = SCRIPT_ID
      s.src = SCRIPT_SRC
      s.async = true
      s.defer = true
      s.onload = doRender
      document.head.appendChild(s)
    } else {
      // Script tag exists (another mount) but API not ready yet — poll briefly.
      poll = setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll)
          doRender()
        }
      }, 200)
    }

    return () => {
      if (poll) clearInterval(poll)
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch { /* already gone */ }
        widgetIdRef.current = null
      }
    }
  }, [doRender])

  if (!SITE_KEY) return null
  return <div ref={containerRef} className="flex justify-center" />
}

// True when the widget is active, so callers can require a token before submit.
export const CAPTCHA_ENABLED = !!SITE_KEY
