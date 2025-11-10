'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth'
import ErrorBoundary from '@/components/error/ErrorBoundary'

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ErrorBoundary>
  )
}
