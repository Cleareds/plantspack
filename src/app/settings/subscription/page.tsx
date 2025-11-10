'use client'

import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SubscriptionSettingsPage() {
  const { profile, authReady } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authReady && profile?.username) {
      router.push(`/profile/${profile.username}/subscription`)
    }
  }, [profile, authReady, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to subscription settings...</p>
      </div>
    </div>
  )
}
