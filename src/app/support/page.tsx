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
  ArrowLeft,
  Loader2,
  X,
  Sparkles,
  Zap,
  Shield,
  MessageCircle,
  Video,
  ImageIcon,
  FileText,
  Vote
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
  const tierFromUrl = searchParams.get('tier') as 'medium' | 'premium' | null

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
      await redirectToCheckout(tierId, user.id, billingInterval)
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

  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')

  const tierDisplayNames: Record<string, string> = {
    free: 'Explorer',
    medium: 'Supporter',
    premium: 'Premium',
  }

  const tierDescriptions: Record<string, string> = {
    free: 'Get started and explore the community',
    medium: 'For passionate plant-based advocates',
    premium: 'For creators who want it all',
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Feed</span>
            </Link>
            {subscription && subscription.tier !== 'free' && (
              <button
                onClick={handleManageSubscription}
                disabled={managingSubscription}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors"
              >
                {managingSubscription ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Manage Subscription</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Success/Cancel/Error Messages */}
        {success && (
          <div className="mb-12 p-5 bg-primary/5 border border-primary/15 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-primary/10 rounded-full">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-on-surface font-semibold">
                  Subscription activated successfully!
                </p>
                <p className="text-on-surface-variant text-sm mt-1">
                  You now have access to all {tierFromUrl === 'medium' ? 'Supporter' : tierFromUrl === 'premium' ? 'Premium' : subscription?.tier === 'medium' ? 'Supporter' : 'Premium'} features. Start creating amazing content!
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-12 p-5 bg-error/5 border border-error/15 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-error/10 rounded-full">
                <X className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-error font-semibold">
                  Something went wrong with your subscription
                </p>
                <p className="text-error/80 text-sm mt-1">
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
          <div className="mb-12 p-5 bg-tertiary/5 border border-tertiary/15 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-tertiary/10 rounded-full">
                <ArrowLeft className="h-5 w-5 text-tertiary" />
              </div>
              <p className="text-on-surface-variant">
                Subscription process was canceled. You can try again anytime!
              </p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest">
              <Leaf className="h-3.5 w-3.5" />
              <span>Pricing</span>
            </div>
          </div>
          <h1 className="font-headline font-extrabold text-5xl md:text-7xl text-on-surface tracking-tight leading-[1.1] mb-6">
            Grow with the
            <br />
            <span className="text-primary">community</span>
          </h1>
          <p className="text-on-surface-variant text-xl md:text-2xl leading-relaxed max-w-2xl mx-auto">
            Choose a plan that fits your needs. Every contribution helps us build
            a better platform for everyone.
          </p>

          {subscription && (
            <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Current plan: {tierDisplayNames[subscription.tier] || SUBSCRIPTION_TIERS[subscription.tier].name}
              </span>
            </div>
          )}
        </div>

        {/* Promotional Banners */}
        {promotionalInfo && (
          <div className="mb-20 flex flex-col md:flex-row gap-4 justify-center">
            {/* Early Bird Promotion Banner */}
            {promotionalInfo.earlyBirdAvailable && !userPromoStatus?.isPromotionalSubscriber && (
              <div className="flex-1 max-w-md rounded-[2rem] bg-primary/5 border border-primary/10 p-6">
                <div className="text-center">
                  <div className="flex justify-center items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="font-label font-extrabold text-xs uppercase tracking-[0.2em] text-primary">Early Bird Special</span>
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-on-surface text-sm font-semibold mb-2">
                    First 100 registered users get Supporter tier FREE and a Founder badge!
                  </p>
                  <p className="text-on-surface-variant text-xs">
                    Only <span className="font-bold text-primary">{promotionalInfo.earlyBirdUsersLeft}</span> spots left!
                    {!user && ' Sign up now to claim your free subscription.'}
                  </p>
                </div>
              </div>
            )}

            {/* Early Purchaser Promotion Banner */}
            {promotionalInfo.earlyPurchaserAvailable && (
              <div className="flex-1 max-w-md rounded-[2rem] bg-tertiary/5 border border-tertiary/10 p-6">
                <div className="text-center">
                  <div className="flex justify-center items-center gap-2 mb-3">
                    <Crown className="h-4 w-4 text-tertiary" />
                    <span className="font-label font-extrabold text-xs uppercase tracking-[0.2em] text-tertiary">Purchaser Bonus</span>
                    <Crown className="h-4 w-4 text-tertiary" />
                  </div>
                  <p className="text-on-surface text-sm font-semibold mb-2">
                    First 100 Supporter subscribers get upgraded to Professional FREE and a Founder badge!
                  </p>
                  <p className="text-on-surface-variant text-xs">
                    Only <span className="font-bold text-tertiary">{promotionalInfo.earlyPurchasersLeft}</span> upgrade spots left!
                    Subscribe to Supporter ($2/month) and get Premium ($5/month) automatically.
                  </p>
                </div>
              </div>
            )}

            {/* User's Promotional Status */}
            {userPromoStatus?.isPromotionalSubscriber && (
              <div className="flex-1 max-w-lg rounded-[2rem] bg-primary/5 border border-primary/10 p-6">
                <div className="text-center">
                  <div className="flex justify-center items-center gap-2 mb-3">
                    <Check className="h-5 w-5 text-primary" />
                    <span className="font-label font-extrabold text-xs uppercase tracking-[0.2em] text-primary">Special Member</span>
                  </div>
                  <p className="text-on-surface-variant">
                    {userPromoStatus.promotionalType === 'early_bird'
                      ? `You're user #${userPromoStatus.registrationNumber}! Enjoying FREE Supporter benefits until ${new Date(userPromoStatus.promotionalGrantedAt).getFullYear() + 1}.`
                      : 'You received a free Professional upgrade for being an early supporter! Thank you for believing in our community.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {promotionalInfo && (
          <p className="text-sm text-on-surface-variant text-center max-w-2xl mx-auto mb-20 -mt-12">
            All early-benefits will be applied manually in 1-3 business days after registration/purchase.
          </p>
        )}

        {/* Billing Interval Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 bg-surface-container-low rounded-full p-1">
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                billingInterval === 'month'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                billingInterval === 'year'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Yearly
              <span className="ml-1 text-[10px] font-bold uppercase">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-24 items-start">
          {/* Free / Explorer Tier */}
          {(() => {
            const tier = SUBSCRIPTION_TIERS['free']
            const isCurrent = isCurrentTier('free')
            return (
              <div
                className="group relative rounded-[2.5rem] border border-outline-variant/10 bg-surface-container-lowest p-8 lg:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="mb-8">
                  <div className="font-label font-extrabold text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-4">
                    Explorer
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-5xl font-extrabold tracking-tighter text-on-surface">$0</span>
                    <span className="text-on-surface-variant font-medium">/month</span>
                  </div>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    {tierDescriptions['free']}
                  </p>
                </div>

                {/* CTA */}
                <button
                  disabled
                  className="w-full h-14 rounded-2xl font-bold text-sm bg-surface-container-highest text-on-surface-variant cursor-not-allowed mb-8"
                >
                  {isCurrent ? 'Current Plan' : 'Free Forever'}
                </button>

                {/* Features */}
                <ul className="space-y-4">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-on-surface-variant/10 flex items-center justify-center">
                        <Check className="h-3 w-3 text-on-surface-variant" />
                      </div>
                      <span className="text-sm text-on-surface-variant">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })()}

          {/* Medium / Supporter Tier (Recommended) */}
          {(() => {
            const tier = SUBSCRIPTION_TIERS['medium']
            const isCurrent = isCurrentTier('medium')
            const canUpgrade = canUpgradeTo('medium')
            const displayPrice = billingInterval === 'year' ? tier.yearlyPrice : tier.price
            const displayInterval = billingInterval === 'year' ? '/year' : '/month'
            return (
              <div
                className="group relative rounded-[2.5rem] border-2 border-primary ring-8 ring-primary/5 bg-surface-container-lowest p-8 lg:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                {/* Recommended Badge */}
                <div className="absolute -top-4 right-8">
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                    <Sparkles className="h-3.5 w-3.5" />
                    Recommended
                  </div>
                </div>

                <div className="mb-8">
                  <div className="font-label font-extrabold text-xs uppercase tracking-[0.2em] text-primary mb-4">
                    Supporter
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-5xl font-extrabold tracking-tighter text-on-surface">${displayPrice}</span>
                    <span className="text-on-surface-variant font-medium">{displayInterval}</span>
                  </div>
                  {billingInterval === 'year' && (
                    <p className="text-xs text-primary font-medium mb-2">Save ${tier.price * 12 - (tier.yearlyPrice || 0)}/yr</p>
                  )}
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    {tierDescriptions['medium']}
                  </p>
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <button
                    onClick={handleManageSubscription}
                    disabled={managingSubscription}
                    className="w-full h-16 rounded-2xl font-bold text-sm bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-all mb-8"
                  >
                    {managingSubscription ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : (
                      'Manage Subscription'
                    )}
                  </button>
                ) : canUpgrade ? (
                  <button
                    onClick={() => handleUpgrade('medium')}
                    disabled={loading}
                    className="w-full h-16 rounded-2xl font-bold text-sm bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-all mb-8 shadow-lg shadow-primary/25"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : (
                      'Get Supporter'
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full h-14 rounded-2xl font-bold text-sm bg-surface-container-highest text-on-surface-variant cursor-not-allowed mb-8"
                  >
                    Lower tier than current
                  </button>
                )}

                {/* Features */}
                <ul className="space-y-4">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm text-on-surface-variant">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })()}

          {/* Premium Tier */}
          {(() => {
            const tier = SUBSCRIPTION_TIERS['premium']
            const isCurrent = isCurrentTier('premium')
            const canUpgrade = canUpgradeTo('premium')
            const displayPrice = billingInterval === 'year' ? tier.yearlyPrice : tier.price
            const displayInterval = billingInterval === 'year' ? '/year' : '/month'
            return (
              <div
                className="group relative rounded-[2.5rem] border border-outline-variant/10 bg-surface-container-lowest p-8 lg:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="mb-8">
                  <div className="font-label font-extrabold text-xs uppercase tracking-[0.2em] text-tertiary mb-4">
                    Premium
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-5xl font-extrabold tracking-tighter text-on-surface">${displayPrice}</span>
                    <span className="text-on-surface-variant font-medium">{displayInterval}</span>
                  </div>
                  {billingInterval === 'year' && (
                    <p className="text-xs text-tertiary font-medium mb-2">Save ${tier.price * 12 - (tier.yearlyPrice || 0)}/yr</p>
                  )}
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    {tierDescriptions['premium']}
                  </p>
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <button
                    onClick={handleManageSubscription}
                    disabled={managingSubscription}
                    className="w-full h-16 rounded-2xl font-bold text-sm bg-tertiary text-white hover:opacity-90 disabled:opacity-50 transition-all mb-8"
                  >
                    {managingSubscription ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : (
                      'Manage Subscription'
                    )}
                  </button>
                ) : canUpgrade ? (
                  <button
                    onClick={() => handleUpgrade('premium')}
                    disabled={loading}
                    className="w-full h-16 rounded-2xl font-bold text-sm bg-tertiary text-white hover:opacity-90 disabled:opacity-50 transition-all mb-8"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : (
                      'Get Premium'
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full h-14 rounded-2xl font-bold text-sm bg-surface-container-highest text-on-surface-variant cursor-not-allowed mb-8"
                  >
                    Lower tier than current
                  </button>
                )}

                {/* Features */}
                <ul className="space-y-4">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-tertiary/10 flex items-center justify-center">
                        <Check className="h-3 w-3 text-tertiary" />
                      </div>
                      <span className="text-sm text-on-surface-variant">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })()}
        </div>

        {/* Feature Comparison Table */}
        <div className="rounded-[3rem] border border-outline-variant/10 bg-surface-container-lowest overflow-hidden mb-24">
          <div className="p-8 lg:p-12">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-4">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Compare Plans</span>
              </div>
              <h2 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight">
                Feature Comparison
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="text-left py-5 px-6 rounded-l-2xl">
                      <span className="font-label text-xs font-extrabold uppercase tracking-[0.2em] text-on-surface-variant">Feature</span>
                    </th>
                    <th className="text-center py-5 px-6">
                      <span className="font-label text-xs font-extrabold uppercase tracking-[0.2em] text-on-surface-variant">Explorer</span>
                    </th>
                    <th className="text-center py-5 px-6">
                      <span className="font-label text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Supporter</span>
                    </th>
                    <th className="text-center py-5 px-6 rounded-r-2xl">
                      <span className="font-label text-xs font-extrabold uppercase tracking-[0.2em] text-tertiary">Premium</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  <tr>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-on-surface-variant/60" />
                        <span className="font-medium text-on-surface text-sm">Post Length</span>
                      </div>
                    </td>
                    <td className="text-center py-5 px-6 text-sm text-on-surface-variant">1,000 characters</td>
                    <td className="text-center py-5 px-6 text-sm text-on-surface-variant">3,000 characters</td>
                    <td className="text-center py-5 px-6 text-sm font-semibold text-on-surface">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-on-surface-variant/60" />
                        <span className="font-medium text-on-surface text-sm">Images per Post</span>
                      </div>
                    </td>
                    <td className="text-center py-5 px-6 text-sm text-on-surface-variant">5</td>
                    <td className="text-center py-5 px-6 text-sm text-on-surface-variant">10</td>
                    <td className="text-center py-5 px-6 text-sm font-semibold text-on-surface">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-on-surface-variant/60" />
                        <span className="font-medium text-on-surface text-sm">Video Uploads</span>
                      </div>
                    </td>
                    <td className="text-center py-5 px-6 text-sm text-on-surface-variant">1 per post (30s)</td>
                    <td className="text-center py-5 px-6 text-sm text-on-surface-variant">3 per post (2min)</td>
                    <td className="text-center py-5 px-6 text-sm text-on-surface-variant">10 per post (5min)</td>
                  </tr>
                  <tr>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <Vote className="h-4 w-4 text-on-surface-variant/60" />
                        <span className="font-medium text-on-surface text-sm">Vote for new features</span>
                      </div>
                    </td>
                    <td className="text-center py-5 px-6">
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    </td>
                    <td className="text-center py-5 px-6">
                      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                    </td>
                    <td className="text-center py-5 px-6">
                      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-tertiary/10">
                        <Check className="h-3.5 w-3.5 text-tertiary" />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-on-surface-variant/60" />
                        <span className="font-medium text-on-surface text-sm">Community chat rooms</span>
                      </div>
                    </td>
                    <td className="text-center py-5 px-6">
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    </td>
                    <td className="text-center py-5 px-6">
                      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                    </td>
                    <td className="text-center py-5 px-6">
                      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-tertiary/10">
                        <Check className="h-3.5 w-3.5 text-tertiary" />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-on-surface-variant/60" />
                        <span className="font-medium text-on-surface text-sm">Location Sharing</span>
                      </div>
                    </td>
                    <td className="text-center py-5 px-6">
                      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-on-surface-variant/10">
                        <Check className="h-3.5 w-3.5 text-on-surface-variant" />
                      </div>
                    </td>
                    <td className="text-center py-5 px-6">
                      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                    </td>
                    <td className="text-center py-5 px-6">
                      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-tertiary/10">
                        <Check className="h-3.5 w-3.5 text-tertiary" />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-on-surface-variant/60" />
                        <span className="font-medium text-on-surface text-sm">Pack Creation</span>
                      </div>
                    </td>
                    <td className="text-center py-5 px-6">
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    </td>
                    <td className="text-center py-5 px-6 text-sm text-on-surface-variant">1 pack</td>
                    <td className="text-center py-5 px-6 text-sm text-on-surface-variant">5 packs</td>
                  </tr>
                  <tr>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-on-surface-variant/60" />
                        <span className="font-medium text-on-surface text-sm">Verified Badge</span>
                      </div>
                    </td>
                    <td className="text-center py-5 px-6">
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    </td>
                    <td className="text-center py-5 px-6">
                      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                    </td>
                    <td className="text-center py-5 px-6">
                      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-tertiary/10">
                        <Check className="h-3.5 w-3.5 text-tertiary" />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <Headphones className="h-4 w-4 text-on-surface-variant/60" />
                        <span className="font-medium text-on-surface text-sm">Support</span>
                      </div>
                    </td>
                    <td className="text-center py-5 px-6 text-sm text-on-surface-variant">Basic</td>
                    <td className="text-center py-5 px-6 text-sm text-on-surface-variant">Community</td>
                    <td className="text-center py-5 px-6 text-sm font-semibold text-on-surface">Priority</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-4">
              <Shield className="h-3.5 w-3.5" />
              <span>FAQ</span>
            </div>
            <h2 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight">
              Questions? We&apos;ve got answers
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: 'Can I change my plan anytime?',
                a: 'Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at your next billing cycle.'
              },
              {
                q: 'What happens if I cancel?',
                a: "You'll continue to have access to premium features until the end of your billing period, then automatically switch to the free plan."
              },
              {
                q: 'How do you use the money?',
                a: 'Every dollar goes towards keeping the platform running, adding new features, and supporting the vegan community worldwide.'
              },
              {
                q: 'Is my payment secure?',
                a: 'Absolutely! We use Stripe for secure payment processing. We never store your payment information on our servers.'
              }
            ].map((faq, i) => (
              <div key={i} className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6 lg:p-8">
                <h3 className="font-semibold text-on-surface mb-2 text-sm">
                  {faq.q}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors"
            >
              Still have questions? Get in touch
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>
          </div>
        </div>
      </div>

      {/* Buy Me a Coffee Floating Block */}
      {showBMC && (
        <div className="fixed bottom-6 left-6 z-50">
          <div className="relative bg-surface-container-lowest rounded-[1.5rem] shadow-xl border border-outline-variant/10 p-4 max-w-[160px]">
            {/* Close Button */}
            <button
              onClick={handleCloseBMC}
              className="absolute -top-2 -right-2 p-1.5 bg-on-surface hover:opacity-90 text-white rounded-full shadow-lg transition-colors z-10"
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
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-on-surface mb-1">
                  Support Us!
                </h3>
                <p className="text-xs text-on-surface-variant mb-3">
                  Buy us a coffee and help keep Plantspack growing!
                </p>
                <div className="flex justify-center">
                  <Image
                    src="/bmc_qr.png"
                    alt="Buy Me a Coffee QR Code"
                    width={120}
                    height={120}
                    className="rounded-xl"
                  />
                </div>
                <p className="text-xs text-on-surface-variant text-center mt-2">
                  Scan to donate
                </p>
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
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-on-surface-variant text-sm">Loading plans...</span>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}
