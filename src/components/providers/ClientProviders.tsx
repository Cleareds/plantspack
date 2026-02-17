'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from '@/lib/auth'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import CookieConsent from '@/components/legal/CookieConsent'
import { clearExpiredStates, clearUserStates } from '@/lib/page-state-storage'

function StateCleanup() {
  const { user } = useAuth()
  const prevUserIdRef = useRef<string | undefined>(undefined)

  // Clear expired states once on app load
  useEffect(() => {
    clearExpiredStates()
  }, [])

  // Clear state when user changes (logout/login as different user)
  useEffect(() => {
    const prevId = prevUserIdRef.current
    const currentId = user?.id

    if (prevId && prevId !== currentId) {
      clearUserStates(prevId)
    }

    prevUserIdRef.current = currentId
  }, [user?.id])

  return null
}

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StateCleanup />
        {children}
        <CookieConsent />
      </AuthProvider>
    </ErrorBoundary>
  )
}
