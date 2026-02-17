'use client'

import React, { useState, useEffect, useRef } from 'react'
import { savePageState, loadPageState } from '@/lib/page-state-storage'

interface UsePageStateOptions<T> {
  key: string
  defaultValue: T
  userId?: string
  enabled?: boolean
  ttl?: number
}

export function usePageState<T>({
  key,
  defaultValue,
  userId,
  enabled = true,
  ttl,
}: UsePageStateOptions<T>): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (!enabled || typeof window === 'undefined') return defaultValue
    const saved = loadPageState<T>(key, userId)
    return saved !== null ? saved : defaultValue
  })

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialMount = useRef(true)

  // On user change: reload state for the new user
  useEffect(() => {
    if (!enabled) return
    const saved = loadPageState<T>(key, userId)
    setValue(saved !== null ? saved : defaultValue)
    // We intentionally exclude defaultValue from deps to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, userId, enabled])

  // Debounced save on value change (skip first mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (!enabled) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      savePageState(key, value, ttl, userId)
    }, 300)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [key, value, userId, enabled, ttl])

  return [value, setValue]
}
