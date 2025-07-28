'use client'

import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import SubscriptionDashboard from '@/components/subscription/SubscriptionDashboard'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function SubscriptionSettingsPage() {
  const { user, authReady } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authReady && !user) {
      router.push('/auth')
    }
  }, [user, authReady, router])

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/settings"
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Settings</span>
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-900">Subscription Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your subscription, view billing history, and upgrade your plan.
        </p>
      </div>

      {/* Subscription Dashboard */}
      <SubscriptionDashboard />
    </div>
  )
}