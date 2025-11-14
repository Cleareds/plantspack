'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import CookieConsent from '@/components/legal/CookieConsent'

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        {children}
        <CookieConsent />
      </AuthProvider>
    </ErrorBoundary>
  )
}
