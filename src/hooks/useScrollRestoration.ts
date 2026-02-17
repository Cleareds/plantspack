'use client'

import { useEffect, useRef } from 'react'
import { savePageState, loadPageState } from '@/lib/page-state-storage'

interface UseScrollRestorationOptions {
  key: string
  enabled?: boolean
  delay?: number
}

export function useScrollRestoration({
  key,
  enabled = true,
  delay = 300,
}: UseScrollRestorationOptions): void {
  const scrollKey = `scroll_${key}`
  const hasSavedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const savedY = loadPageState<number>(scrollKey)
    if (savedY === null || savedY <= 0) return

    let attempts = 0
    const MAX_ATTEMPTS = 3
    const RETRY_INTERVAL = 200

    const tryRestore = () => {
      attempts++
      const pageHeight = document.documentElement.scrollHeight
      const viewportHeight = window.innerHeight

      // Only restore if content is tall enough to reach the saved position
      if (pageHeight - viewportHeight >= savedY || attempts >= MAX_ATTEMPTS) {
        window.scrollTo({ top: savedY, behavior: 'instant' })
        hasSavedRef.current = false
      } else if (attempts < MAX_ATTEMPTS) {
        setTimeout(tryRestore, RETRY_INTERVAL)
      }
    }

    const timer = setTimeout(tryRestore, delay)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey, enabled, delay])

  // Save scroll on unmount
  useEffect(() => {
    if (!enabled) return

    return () => {
      const y = window.scrollY
      if (y > 0) {
        savePageState(scrollKey, y)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey, enabled])
}
