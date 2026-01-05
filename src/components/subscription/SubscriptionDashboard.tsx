'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { 
  getUserSubscription, 
  createPortalSession, 
  redirectToCheckout, 
  SUBSCRIPTION_TIERS,
  type UserSubscription 
} from '@/lib/stripe'
import { Crown, Calendar, CreditCard, AlertTriangle, CheckCircle, Settings, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function SubscriptionDashboard() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadSubscription()
    }
  }, [user])

  const loadSubscription = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const sub = await getUserSubscription(user.id)
      setSubscription(sub)
    } catch (err) {
      console.error('Error loading subscription:', err)
      setError('Failed to load subscription details')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tierId: 'medium' | 'premium') => {
    if (!user) return

    try {
      setActionLoading(true)
      setError(null)
      await redirectToCheckout(tierId, user.id)
    } catch (err) {
      console.error('Error upgrading subscription:', err)

      // Check if user already has active subscription
      if (err instanceof Error && err.message === 'ACTIVE_SUBSCRIPTION_EXISTS') {
        setError('You already have an active subscription. Please use "Manage Subscription" to change your plan.')
      } else {
        setError('Failed to start upgrade process')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!user) return
    
    try {
      setActionLoading(true)
      const portalUrl = await createPortalSession(user.id)
      window.open(portalUrl, '_blank')
    } catch (err) {
      console.error('Error opening customer portal:', err)
      setError('Failed to open subscription management')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!subscription) return null

  const currentTier = SUBSCRIPTION_TIERS[subscription.tier]
  const isActive = subscription.status === 'active'
  const isPastDue = subscription.status === 'past_due'
  const isCanceled = subscription.status === 'canceled'

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Crown className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Current Subscription</h2>
          </div>
          
          {subscription.tier !== 'free' && (
            <button
              onClick={handleManageSubscription}
              disabled={actionLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              <Settings className="h-4 w-4" />
              <span>Manage</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Details */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div 
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  color: currentTier.badge.color,
                  backgroundColor: currentTier.badge.bgColor 
                }}
              >
                {currentTier.badge.text}
              </div>
              <span className="text-2xl font-bold text-gray-900">
                ${currentTier.price}
                {currentTier.price > 0 && <span className="text-sm font-normal text-gray-500">/month</span>}
              </span>
            </div>
            
            <div className="space-y-2">
              {currentTier.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status & Billing */}
          <div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex items-center space-x-2">
                  {isActive && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {isPastDue && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  {isCanceled && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  <span className={`text-sm font-medium ${
                    isActive ? 'text-green-600' : 
                    isPastDue ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {isActive ? 'Active' : 
                     isPastDue ? 'Payment Due' : 
                     'Canceled'}
                  </span>
                </div>
              </div>

              {subscription.currentPeriodEnd && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isCanceled || subscription.cancelAtPeriodEnd ? 'Expires' : 'Next Billing'}
                  </label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formatDistanceToNow(subscription.currentPeriodEnd, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              )}

              {isPastDue && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Payment failed. Please update your payment method.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Options */}
      {subscription.tier === 'free' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upgrade Your Plan</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(SUBSCRIPTION_TIERS)
              .filter(([key]) => key !== 'free')
              .map(([key, tier]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{tier.name}</h4>
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
                  
                  <div className="text-2xl font-bold text-gray-900 mb-3">
                    ${tier.price}
                    <span className="text-sm font-normal text-gray-500">/month</span>
                  </div>
                  
                  <div className="space-y-1 mb-4">
                    {tier.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-gray-600">{feature}</span>
                      </div>
                    ))}
                    {tier.features.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{tier.features.length - 3} more features
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleUpgrade(key as 'medium' | 'premium')}
                    disabled={actionLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : `Upgrade to ${tier.name}`}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {subscription.tier === 'medium' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upgrade to Premium</h3>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">{SUBSCRIPTION_TIERS.premium.name}</h4>
              <div 
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ 
                  color: SUBSCRIPTION_TIERS.premium.badge.color,
                  backgroundColor: SUBSCRIPTION_TIERS.premium.badge.bgColor 
                }}
              >
                {SUBSCRIPTION_TIERS.premium.badge.text}
              </div>
            </div>
            
            <div className="text-2xl font-bold text-gray-900 mb-3">
              ${SUBSCRIPTION_TIERS.premium.price}
              <span className="text-sm font-normal text-gray-500">/month</span>
            </div>
            
            <div className="space-y-1 mb-4">
              {SUBSCRIPTION_TIERS.premium.features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-gray-600">{feature}</span>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => handleUpgrade('premium')}
              disabled={actionLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Upgrade to Premium'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}