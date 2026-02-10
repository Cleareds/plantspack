'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { getUserSubscription, canPerformAction, SUBSCRIPTION_TIERS, type UserSubscription } from '@/lib/stripe'

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSubscription = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      const sub = await getUserSubscription(user.id)
      setSubscription(sub)
    } catch (err) {
      console.error('Error loading subscription:', err)
      setError('Failed to load subscription')
      // Set default free subscription on error
      setSubscription({
        tier: 'free',
        status: 'active'
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadSubscription()
    } else {
      setSubscription(null)
      setLoading(false)
    }
  }, [user, loadSubscription])

  const refresh = () => {
    if (user) {
      loadSubscription()
    }
  }

  // Helper functions
  const canCreateLongPost = () => {
    if (!subscription) return false
    return canPerformAction(subscription, 'create_long_post')
  }

  const canUseMultipleImages = () => {
    if (!subscription) return false
    return canPerformAction(subscription, 'multiple_images')
  }

  const canUseLocation = () => {
    if (!subscription) return false
    return canPerformAction(subscription, 'use_location')
  }

  const getMaxPostLength = () => {
    if (!subscription) return 250
    return SUBSCRIPTION_TIERS[subscription.tier].maxPostLength
  }

  const getMaxImages = () => {
    if (!subscription) return 1
    return SUBSCRIPTION_TIERS[subscription.tier].maxImages
  }

  const getCurrentTier = () => {
    if (!subscription) return SUBSCRIPTION_TIERS.free
    return SUBSCRIPTION_TIERS[subscription.tier]
  }

  const isPremiumUser = () => {
    return subscription?.tier === 'premium'
  }

  const isSupporterOrBetter = () => {
    return subscription?.tier === 'medium' || subscription?.tier === 'premium'
  }

  const isActive = () => {
    return subscription?.status === 'active'
  }

  const needsPayment = () => {
    return subscription?.status === 'past_due' || subscription?.status === 'unpaid'
  }

  const isCanceled = () => {
    return subscription?.status === 'canceled'
  }

  return {
    subscription,
    loading,
    error,
    refresh,

    // Permission checks
    canCreateLongPost,
    canUseMultipleImages,
    canUseLocation,

    // Limits
    getMaxPostLength,
    getMaxImages,
    
    // Tier info
    getCurrentTier,
    isPremiumUser,
    isSupporterOrBetter,
    
    // Status checks
    isActive,
    needsPayment,
    isCanceled
  }
}