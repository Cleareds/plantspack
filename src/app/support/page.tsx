'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
  Loader2,
  X,
  Coffee
} from 'lucide-react'
import { 
  SUBSCRIPTION_TIERS, 
  redirectToCheckout, 
  getUserSubscription,
  createPortalSession,
  type UserSubscription 
} from '@/lib/stripe'
import { getPromotionalInfo, getUserPromotionalStatus, type PromotionalInfo } from '@/lib/promotional'

function PricingContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [managingSubscription, setManagingSubscription] = useState(false)
  const [promotionalInfo, setPromotionalInfo] = useState<PromotionalInfo | null>(null)
  const [userPromoStatus, setUserPromoStatus] = useState<any>(null)
  const [showBMC, setShowBMC] = useState(true)

  // Handle success/cancel/error messages
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')
  const error = searchParams.get('error')

  useEffect(() => {
    if (user) {
      getUserSubscription(user.id).then(setSubscription)
      getUserPromotionalStatus(user.id).then(setUserPromoStatus)
    }

    // Load promotional info regardless of user status
    getPromotionalInfo().then(setPromotionalInfo)

    // Load BMC visibility state from localStorage
    const bmcHidden = localStorage.getItem('bmc_hidden')
    if (bmcHidden === 'true') {
      setShowBMC(false)
    }
  }, [user])

  const handleCloseBMC = () => {
    setShowBMC(false)
    localStorage.setItem('bmc_hidden', 'true')
  }

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
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout. Please try again.'
      alert(errorMessage)
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
        {/* Success/Cancel/Error Messages */}
        {success && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-green-800 font-medium">
                  🎉 Subscription activated successfully! Welcome to the community! 🌱
                </p>
                <p className="text-green-700 text-sm mt-1">
                  You now have access to all premium features. Start creating amazing content!
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <X className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-red-800 font-medium">
                  Something went wrong with your subscription
                </p>
                <p className="text-red-700 text-sm mt-1">
                  {error === 'payment_failed' 
                    ? 'Payment could not be processed. Please check your payment method and try again.'
                    : error === 'session_expired'
                    ? 'Your checkout session has expired. Please start the process again.'
                    : 'An unexpected error occurred. Please contact support or try again later.'
                  }
                </p>
              </div>
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

        {/* Promotional Banners */}
        {promotionalInfo && (
          <div className="mb-24 flex justify-between">
            {/* Early Bird Promotion Banner */}
            {promotionalInfo.earlyBirdAvailable && !userPromoStatus?.isPromotionalSubscriber && (
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-lg p-4 mr-[2%] flex-1 min-h-[100%]">
                <div className="text-center">
                  <div className="flex justify-center items-center space-x-2 mb-2">
                    <Star className="h-4 w-4 text-green-600" />
                    <h3 className="text-base font-bold text-green-800">🎉 Early Bird Special!</h3>
                    <Star className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-green-700 text-sm mb-1">
                    <strong>First 100 registered users get Supporter tier FREE for 1 year!</strong>
                  </p>
                  <p className="text-green-600 text-xs">
                    Only <span className="font-bold">{promotionalInfo.earlyBirdUsersLeft}</span> spots left!
                    {!user && ' Sign up now to claim your free subscription.'}
                  </p>
                </div>
              </div>
            )}

            {/* Early Purchaser Promotion Banner */}
            {promotionalInfo.earlyPurchaserAvailable && (
              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 rounded-lg p-4 w-[49%] flex-1 min-h-[100%]">
                <div className="text-center">
                  <div className="flex justify-center items-center space-x-2 mb-2">
                    <Crown className="h-4 w-4 text-purple-600" />
                    <h3 className="text-base font-bold text-purple-800">💫 Purchaser Bonus!</h3>
                    <Crown className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="text-purple-700 text-sm mb-1">
                    <strong>First 100 Supporter subscribers get upgraded to Premium FREE for 1 year!</strong>
                  </p>
                  <p className="text-purple-600 text-xs">
                    Only <span className="font-bold">{promotionalInfo.earlyPurchasersLeft}</span> upgrade spots left!
                    Subscribe to Supporter ($3/month) and get Premium ($10/month) automatically.
                  </p>
                </div>
              </div>
            )}

            {/* User's Promotional Status */}
            {userPromoStatus?.isPromotionalSubscriber && (
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200 rounded-xl p-6">
                <div className="text-center">
                  <div className="flex justify-center items-center space-x-2 mb-3">
                    <Check className="h-6 w-6 text-yellow-600" />
                    <h3 className="text-xl font-bold text-yellow-800">🎊 You&apos;re a Special Member!</h3>
                  </div>
                  <p className="text-yellow-700 text-lg">
                    {userPromoStatus.promotionalType === 'early_bird' 
                      ? `You&apos;re user #${userPromoStatus.registrationNumber}! Enjoying FREE Supporter benefits until ${new Date(userPromoStatus.promotionalGrantedAt).getFullYear() + 1}.`
                      : 'You received a free Premium upgrade for being an early supporter! Thank you for believing in our community.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

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
                  <td className="text-center py-4 px-4">500 characters</td>
                  <td className="text-center py-4 px-4">1000 characters</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-medium">Images per Post</td>
                  <td className="text-center py-4 px-4">3</td>
                  <td className="text-center py-4 px-4">7</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-medium">Video Uploads</td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">1 per post (64MB)</td>
                  <td className="text-center py-4 px-4">3 per post (256MB)</td>
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
                  <td className="py-4 pr-4 font-medium flex items-center space-x-2">
                    <Headphones className="h-4 w-4" />
                    <span>Support</span>
                  </td>
                  <td className="text-center py-4 px-4">Community</td>
                  <td className="text-center py-4 px-4">Community</td>
                  <td className="text-center py-4 px-4">Priority</td>
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

      {/* Buy Me a Coffee Floating Block */}
      {showBMC && (
        <div className="fixed bottom-6 left-6 z-50">
          <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-yellow-400 p-4 max-w-[160px]">
            {/* Close Button */}
            <button
              onClick={handleCloseBMC}
              className="absolute -top-2 -right-2 p-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-full shadow-lg transition-colors z-10"
              aria-label="Close"
            >
              <X className="h-3 w-3" />
            </button>

            <a
              href="https://buymeacoffee.com/plantspack"
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:opacity-90 transition-opacity"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">
                    Support Us! ☕
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Buy us a coffee and help keep PlantsPack growing! 🌱
                  </p>
                  <div className="flex justify-left">
                    <Image
                      src="/bmc_qr.png"
                      alt="Buy Me a Coffee QR Code"
                      width={120}
                      height={120}
                      className="rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Scan to donate
                  </p>
                </div>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span className="text-green-600">Loading support options...</span>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}