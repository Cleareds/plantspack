'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Data Deletion Request Confirmed
        </h1>

        <p className="text-gray-600 mb-6">
          Your data deletion request has been received and will be processed within 30 days.
          All your profile data, posts, and related content will be permanently deleted from our system.
        </p>

        {code && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Confirmation Code</p>
            <p className="text-sm font-mono text-gray-900 break-all">{code}</p>
          </div>
        )}

        <p className="text-sm text-gray-500">
          If you have any questions, please contact our support team.
        </p>
      </div>
    </div>
  )
}

export default function DataDeletionConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}
