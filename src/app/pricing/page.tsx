'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Check, 
  Star, 
  Crown, 
  Leaf, 
  MapPin, 
  BarChart3, 
  Headphones, 
  Palette,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import { 
  SUBSCRIPTION_TIERS, 
  redirectToCheckout, 
  getUserSubscription,
  createPortalSession,
  type UserSubscription 
} from '@/lib/stripe'

function PricingContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [managingSubscription, setManagingSubscription] = useState(false)

  // Handle success/cancel messages
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    if (user) {
      getUserSubscription(user.id).then(setSubscription)
    }
  }, [user])

  const handleUpgrade = async (tierId: 'medium' | 'premium') => {
    if (!user) {
      router.push('/auth')
      return
    }

    setLoading(true)
    try {
      await redirectToCheckout(tierId, user.id)
    } catch (error) {
      console.error('Error starting checkout:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!user) return

    setManagingSubscription(true)
    try {
      const portalUrl = await createPortalSession(user.id)
      window.location.href = portalUrl
    } catch (error) {
      console.error('Error opening customer portal:', error)
      alert('Failed to open subscription management. Please try again.')
    } finally {
      setManagingSubscription(false)
    }
  }

  const isCurrentTier = (tierId: string) => {
    return subscription?.tier === tierId
  }

  const canUpgradeTo = (tierId: string) => {
    if (!subscription) return true
    
    const tierOrder = { free: 0, medium: 1, premium: 2 }
    const currentOrder = tierOrder[subscription.tier]
    const targetOrder = tierOrder[tierId as keyof typeof tierOrder]
    
    return targetOrder > currentOrder
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link 
              href="/"
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Feed</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success/Cancel Messages */}
        {success && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-600" />
              <p className="text-green-800 font-medium">
                Subscription activated successfully! Welcome to the community! 🌱
              </p>
            </div>
          </div>
        )}

        {canceled && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              Subscription process was canceled. You can try again anytime!
            </p>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-green-100 rounded-full">
              <Leaf className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Support the Vegan Community
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Choose a plan that fits your needs and helps us grow the world&apos;s most supportive 
            plant-based social network. Every contribution makes a difference! 🌿
          </p>
          
          {subscription && (
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
              <Crown className="h-4 w-4 text-green-600" />
              <span className="text-green-800 font-medium">
                Current plan: {SUBSCRIPTION_TIERS[subscription.tier].name}
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {Object.values(SUBSCRIPTION_TIERS).map((tier) => {
            const isCurrent = isCurrentTier(tier.id)
            const canUpgrade = canUpgradeTo(tier.id)
            const isPopular = tier.id === 'medium'
            
            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl border-2 p-8 ${
                  isCurrent
                    ? 'border-green-500 bg-green-50'
                    : isPopular
                    ? 'border-green-300 bg-white shadow-lg scale-105'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium">
                      <Star className="h-4 w-4" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrent && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium">
                      <Check className="h-4 w-4" />
                      <span>Current Plan</span>
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
                    tier.id === 'free' ? 'bg-gray-100' :
                    tier.id === 'medium' ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    {tier.id === 'free' && <Leaf className="h-6 w-6 text-gray-600" />}
                    {tier.id === 'medium' && <Star className="h-6 w-6 text-green-600" />}
                    {tier.id === 'premium' && <Crown className="h-6 w-6 text-purple-600" />}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                  
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                    <span className="text-gray-600">/{tier.interval}</span>
                  </div>
                  
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    tier.id === 'free' ? 'bg-gray-100 text-gray-800' :
                    tier.id === 'medium' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {tier.badge.text}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <div className="text-center">
                  {tier.id === 'free' ? (
                    <div className="text-gray-500 text-sm">
                      Always free for everyone
                    </div>
                  ) : isCurrent ? (
                    <button
                      onClick={handleManageSubscription}
                      disabled={managingSubscription}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {managingSubscription ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span>Manage Subscription</span>
                        </>
                      )}
                    </button>
                  ) : canUpgrade ? (
                    <button
                      onClick={() => handleUpgrade(tier.id as 'medium' | 'premium')}
                      disabled={loading}
                      className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                        isPopular
                          ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white'
                      }`}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span>Upgrade to {tier.name}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      Lower tier than current
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature Comparison */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Detailed Feature Comparison
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 pr-4">Feature</th>
                  <th className="text-center py-4 px-4">Free</th>
                  <th className="text-center py-4 px-4">Supporter</th>
                  <th className="text-center py-4 px-4">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-4 pr-4 font-medium">Post Length</td>
                  <td className="text-center py-4 px-4">250 characters</td>
                  <td className="text-center py-4 px-4">1000 characters</td>
                  <td className="text-center py-4 px-4">1000 characters</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-medium">Images per Post</td>
                  <td className="text-center py-4 px-4">1</td>
                  <td className="text-center py-4 px-4">3</td>
                  <td className="text-center py-4 px-4">5</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-medium flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>Location Sharing</span>
                  </td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">✅</td>
                  <td className="text-center py-4 px-4">✅</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-medium flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Post Analytics</span>
                  </td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">Basic</td>
                  <td className="text-center py-4 px-4">Advanced</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-medium">Algorithm Priority</td>
                  <td className="text-center py-4 px-4">Standard</td>
                  <td className="text-center py-4 px-4">Higher</td>
                  <td className="text-center py-4 px-4">Highest</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-medium flex items-center space-x-2">
                    <Headphones className="h-4 w-4" />
                    <span>Support</span>
                  </td>
                  <td className="text-center py-4 px-4">Community</td>
                  <td className="text-center py-4 px-4">Community</td>
                  <td className="text-center py-4 px-4">Priority</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-medium flex items-center space-x-2">
                    <Palette className="h-4 w-4" />
                    <span>Profile Themes</span>
                  </td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Questions? We&apos;re Here to Help! 🌱
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change my plan anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade, downgrade, or cancel your subscription at any time. 
                Changes take effect at your next billing cycle.
              </p>
            </div>
            
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens if I cancel?
              </h3>
              <p className="text-gray-600">
                You&apos;ll continue to have access to premium features until the end of your 
                billing period, then automatically switch to the free plan.
              </p>
            </div>
            
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                How do you use the money?
              </h3>
              <p className="text-gray-600">
                Every dollar goes towards keeping the platform running, adding new features, 
                and supporting the vegan community worldwide.
              </p>
            </div>
            
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                Is my payment secure?
              </h3>
              <p className="text-gray-600">
                Absolutely! We use Stripe for secure payment processing. We never store 
                your payment information on our servers.
              </p>
            </div>
          </div>
          
          <div className="mt-12">
            <Link
              href="/contact"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Still have questions? Get in touch →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-green-600">Loading pricing...</span>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}