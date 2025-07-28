'use client'

import { useState } from 'react'
import { X, Crown, CheckCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { redirectToCheckout, SUBSCRIPTION_TIERS } from '@/lib/stripe'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentTier?: 'free' | 'medium' | 'premium'
  suggestedTier?: 'medium' | 'premium'
  reason?: string
}

export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  currentTier = 'free',
  suggestedTier = 'medium',
  reason 
}: UpgradeModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<'medium' | 'premium'>(suggestedTier)

  const handleUpgrade = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      await redirectToCheckout(selectedTier, user.id)
    } catch (error) {
      console.error('Error upgrading:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const availableTiers = Object.entries(SUBSCRIPTION_TIERS)
    .filter(([key]) => {
      if (currentTier === 'free') return key !== 'free'
      if (currentTier === 'medium') return key === 'premium'
      return false
    })
    .map(([key, tier]) => ({ key: key as 'medium' | 'premium', ...tier }))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Crown className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Upgrade Your Plan</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {reason && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">{reason}</p>
            </div>
          )}

          <div className="space-y-4">
            {availableTiers.map((tier) => (
              <div
                key={tier.key}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedTier === tier.key
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTier(tier.key)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: selectedTier === tier.key ? '#10B981' : '#D1D5DB',
                          backgroundColor: selectedTier === tier.key ? '#10B981' : 'transparent'
                        }}
                      >
                        {selectedTier === tier.key && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
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

                    <div className="text-3xl font-bold text-gray-900 mb-4">
                      ${tier.price}
                      <span className="text-lg font-normal text-gray-500">/month</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {tier.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison with current tier */}
          {currentTier !== 'free' && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">What&apos;s changing:</h4>
              <div className="text-sm text-gray-600">
                <p>• Current plan: {SUBSCRIPTION_TIERS[currentTier].name} (${SUBSCRIPTION_TIERS[currentTier].price}/month)</p>
                <p>• New plan: {SUBSCRIPTION_TIERS[selectedTier].name} (${SUBSCRIPTION_TIERS[selectedTier].price}/month)</p>
                <p className="mt-2 font-medium text-gray-900">
                  Monthly difference: +${SUBSCRIPTION_TIERS[selectedTier].price - SUBSCRIPTION_TIERS[currentTier].price}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Cancel anytime • Secure payment with Stripe
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {loading ? 'Processing...' : `Upgrade to ${SUBSCRIPTION_TIERS[selectedTier].name}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}