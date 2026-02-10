'use client'

import { useState } from 'react'
import { Crown, ArrowRight, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { redirectToCheckout, SUBSCRIPTION_TIERS } from '@/lib/stripe'

interface UpgradePromptProps {
  isOpen: boolean
  onClose: () => void
  feature: string
  description: string
  suggestedTier?: 'medium' | 'premium'
  className?: string
}

export default function UpgradePrompt({ 
  isOpen, 
  onClose, 
  feature, 
  description,
  suggestedTier = 'medium',
  className = ''
}: UpgradePromptProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      await redirectToCheckout(suggestedTier, user.id)
    } catch (error) {
      console.error('Error upgrading:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const tier = SUBSCRIPTION_TIERS[suggestedTier]

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Crown className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Upgrade Required</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Unlock {feature}
            </h3>
            <p className="text-gray-600 text-sm">
              {description}
            </p>
          </div>

          {/* Tier highlight */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    color: tier.badge.color,
                    backgroundColor: tier.badge.bgColor
                  }}
                >
                  {tier.badge.text}
                </div>
                <span className="font-semibold text-gray-900">{tier.name}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  ${tier.price}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {tier.features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
              {tier.features.length > 4 && (
                <div className="text-sm text-gray-500 pl-3.5">
                  +{tier.features.length - 4} more features
                </div>
              )}
            </div>
          </div>

          {/* Benefits comparison */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">What you&apos;ll get:</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Post length:</span>
                <div className="font-medium text-gray-900">
                  {tier.maxPostLength} characters
                </div>
              </div>
              <div>
                <span className="text-gray-500">Images per post:</span>
                <div className="font-medium text-gray-900">
                  {tier.maxImages} images
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Upgrade to {tier.name}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="text-center mt-3">
            <p className="text-xs text-gray-500">
              Cancel anytime • Secure payment with Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Predefined upgrade prompts for common scenarios
export const UPGRADE_PROMPTS = {
  longPost: {
    feature: "Longer Posts",
    description: "Write up to 1000 characters per post to share more detailed thoughts and stories.",
    suggestedTier: 'medium' as const
  },
  multipleImages: {
    feature: "Multiple Images",
    description: "Add up to 3 images per post to better showcase your vegan lifestyle and recipes.",
    suggestedTier: 'medium' as const
  },
  location: {
    feature: "Location Sharing",
    description: "Share your location to help others discover local vegan spots and connect with nearby community members.",
    suggestedTier: 'medium' as const
  },
  premiumFeatures: {
    feature: "Premium Features",
    description: "Get access to all premium features including priority support and early access to new features.",
    suggestedTier: 'premium' as const
  }
}