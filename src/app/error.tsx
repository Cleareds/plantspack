'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-container-low ghost-border rounded-full editorial-shadow mb-6">
          <AlertTriangle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-on-surface mb-2">Something Went Wrong</h1>
        <p className="text-on-surface-variant mb-4">
          An unexpected error occurred. Please try again or return to the home page.
        </p>
        {isDev && (
          <pre className="text-left text-sm text-on-surface-variant bg-surface-container-low ghost-border rounded-md p-4 mb-6 overflow-x-auto max-h-40">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-3 silk-gradient text-on-primary rounded-md hover:opacity-90 font-medium transition-colors cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-surface-container-low text-on-surface-variant ghost-border rounded-md hover:bg-surface-container-low font-medium transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
