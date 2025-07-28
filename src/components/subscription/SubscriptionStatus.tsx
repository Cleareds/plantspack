'use client'

import { useState, useEffect } from 'react'
import { Crown, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getUserSubscription, SUBSCRIPTION_TIERS, type UserSubscription } from '@/lib/stripe'
import { formatDistanceToNow } from 'date-fns'

interface SubscriptionStatusProps {
  className?: string
  showDetails?: boolean
}

export default function SubscriptionStatus({ className = '', showDetails = false }: SubscriptionStatusProps) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSubscription()
    }
  }, [user])

  const loadSubscription = async () => {
    if (!user) return
    
    try {
      const sub = await getUserSubscription(user.id)
      setSubscription(sub)
    } catch (error) {
      console.error('Error loading subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !subscription) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded h-6 w-20 ${className}`} />
    )
  }

  const tier = SUBSCRIPTION_TIERS[subscription.tier]
  const isActive = subscription.status === 'active'
  const isPastDue = subscription.status === 'past_due'
  const isCanceled = subscription.status === 'canceled'

  const StatusIcon = () => {
    if (isPastDue) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    if (isCanceled) return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (subscription.tier === 'free') return <Crown className="h-4 w-4 text-gray-400" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <StatusIcon />
        <div
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            color: tier.badge.color,
            backgroundColor: tier.badge.bgColor
          }}
        >
          {tier.badge.text}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <StatusIcon />
          <span className="font-medium text-gray-900">
            {tier.name} Plan
          </span>
        </div>
        <div
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            color: tier.badge.color,
            backgroundColor: tier.badge.bgColor
          }}
        >
          {tier.badge.text}
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <span className={`font-medium ${
            isActive ? 'text-green-600' : 
            isPastDue ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {isActive ? 'Active' : 
             isPastDue ? 'Payment Due' : 
             'Inactive'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>Price:</span>
          <span className="font-medium">
            ${tier.price}
            {tier.price > 0 && <span className="text-gray-500">/month</span>}
          </span>
        </div>

        {subscription.currentPeriodEnd && (
          <div className="flex items-center justify-between">
            <span>
              {isCanceled || subscription.cancelAtPeriodEnd ? 'Expires:' : 'Next billing:'}
            </span>
            <span className="font-medium">
              {formatDistanceToNow(subscription.currentPeriodEnd, { addSuffix: true })}
            </span>
          </div>
        )}

        {isPastDue && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
            Payment failed. Please update your payment method to maintain access to premium features.
          </div>
        )}
      </div>
    </div>
  )
}