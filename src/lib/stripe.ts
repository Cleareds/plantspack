// Stripe Integration for Premium Subscriptions
// NOTE: loadStripe() — the @stripe/stripe-js SDK loader — is imported
// DYNAMICALLY below so it doesn't end up in the main JS bundle for pages
// that never touch checkout (home, feed, map, directory, city pages, etc).
// Components that import constants/types from this file (SUBSCRIPTION_TIERS,
// UserSubscription) won't pull the SDK. Only the checkout/portal flow does.

import { supabase } from './supabase'

let _stripePromise: Promise<any> | null = null
function getStripePromise() {
  if (_stripePromise) return _stripePromise
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    _stripePromise = Promise.resolve(null)
    return _stripePromise
  }
  // Dynamic import so @stripe/stripe-js is a separate chunk.
  _stripePromise = import('@stripe/stripe-js')
    .then(({ loadStripe }) => loadStripe(key))
    .catch(() => null)
  return _stripePromise
}


/**
 * Best-effort detection of Meta / TikTok in-app browsers. Their WebViews
 * sandbox external scripts, causing Stripe.js (and many other SDKs) to
 * fail to load. We use this to show a clearer "open in browser" CTA.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /\b(FBAN|FBAV|FB_IAB|Instagram|Messenger|Line|WhatsApp|TikTok|LinkedInApp)\b/i.test(ua)
}

export { getStripePromise }

export interface SubscriptionTier {
  id: 'free' | 'medium' | 'premium'
  name: string
  price: number
  yearlyPrice?: number
  currency: string
  interval: 'month'
  features: string[]
  maxPostLength: number
  maxImages: number
  maxVideos: number
  maxVideoSize: number
  maxVideoLength: number // seconds
  maxPacks: number
  verifiedBadge: boolean
  badge: {
    text: string
    color: string
    bgColor: string
  }
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'EUR',
    interval: 'month',
    features: [
      'Unlimited posts',
      'Unlimited images',
      'Up to 10 videos per post',
      'Location sharing',
      'Pack creation',
      'Full feed access',
    ],
    maxPostLength: -1,
    maxImages: -1,
    maxVideos: 10,
    maxVideoSize: 50 * 1024 * 1024,
    maxVideoLength: 300,
    maxPacks: 20,
    verifiedBadge: false,
    badge: {
      text: 'Free',
      color: '#6B7280',
      bgColor: '#F3F4F6'
    }
  },
  medium: {
    id: 'medium',
    name: 'Supporter',
    price: 3,
    yearlyPrice: 30,
    currency: 'EUR',
    interval: 'month',
    features: [
      'Supporter badge',
      'Direct edit access to all places',
      'Discuss and vote on platform\'s future',
      'Our eternal gratitude',
    ],
    maxPostLength: -1,
    maxImages: -1,
    maxVideos: 10,
    maxVideoSize: 50 * 1024 * 1024,
    maxVideoLength: 300,
    maxPacks: 20,
    verifiedBadge: true,
    badge: {
      text: 'Supporter',
      color: '#059669',
      bgColor: '#D1FAE5'
    }
  },
  // Premium tier removed — single $3/month Supporter tier only
}

export interface UserSubscription {
  tier: 'free' | 'medium' | 'premium'
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
}

/**
 * Get user's current subscription status
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status, subscription_ends_at')
      .eq('id', userId)
      .maybeSingle() // Use maybeSingle() to handle new users without throwing error

    if (error) throw error

    // If no user found or no subscription data, return free tier
    if (!user) {
      return {
        tier: 'free',
        status: 'active'
      }
    }

    return {
      tier: user.subscription_tier || 'free',
      status: user.subscription_status || 'active',
      currentPeriodEnd: user.subscription_ends_at ? new Date(user.subscription_ends_at) : undefined
    }
  } catch (error) {
    console.error('Error fetching user subscription:', error)
    return {
      tier: 'free',
      status: 'active'
    }
  }
}

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(
  tierId: 'medium',
  userId: string,
  successUrl: string,
  cancelUrl: string,
  interval: 'month' | 'year' = 'month'
) {
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tierId,
        userId,
        successUrl,
        cancelUrl,
        interval
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout session')
    }

    // Check if we should redirect to portal instead (user has active subscription)
    if (data.redirectToPortal) {
      return { redirectToPortal: true, portalUrl: data.portalUrl }
    }

    return { sessionId: data.sessionId }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

/**
 * Redirect to Stripe checkout
 */
export async function redirectToCheckout(
  tierId: 'medium',
  userId: string,
  interval: 'month' | 'year' = 'month'
) {
  try {
    const stripe = await getStripePromise()
    if (!stripe) {
      // Either the env var is missing (dev) or Stripe.js was blocked
      // by an ad blocker / in-app browser (prod). Tell the user which.
      if (isInAppBrowser()) {
        throw new Error(
          'Stripe checkout isn’t supported inside the Facebook / Instagram / TikTok in-app browser. Please tap the menu (⋯) and choose "Open in browser" to continue.'
        )
      }
      throw new Error(
        'Couldn’t load the payment provider. If you’re using an ad blocker, please allow js.stripe.com and try again.'
      )
    }

    const result = await createCheckoutSession(
      tierId,
      userId,
      `${window.location.origin}/support?success=true&tier=${tierId}`,
      `${window.location.origin}/support?canceled=true`,
      interval
    )

    // If user has active subscription, redirect to portal instead
    if ('redirectToPortal' in result && result.redirectToPortal) {
      window.location.href = result.portalUrl
      return
    }

    // Otherwise, proceed with checkout
    if ('sessionId' in result) {
      const { error } = await stripe.redirectToCheckout({ sessionId: result.sessionId })
      if (error) throw error
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error)
    throw error
  }
}

/**
 * Create customer portal session
 */
export async function createPortalSession(userId: string) {
  try {
    const response = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      throw new Error('Failed to create portal session')
    }

    const { url } = await response.json()
    return url
  } catch (error) {
    console.error('Error creating portal session:', error)
    throw error
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const response = await fetch('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    })

    if (!response.ok) {
      throw new Error('Failed to cancel subscription')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

/**
 * Check if user can perform action based on subscription tier
 */
export function canPerformAction(
  _subscription: UserSubscription,
  _action: 'create_long_post' | 'multiple_images' | 'use_location' | 'upload_video' | 'create_pack'
): boolean {
  return true
}

/**
 * Get tier badge component props
 */
export function getTierBadge(tier: 'free' | 'medium' | 'premium') {
  // Legacy premium users get shown as supporter
  const config = SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.medium
  return {
    text: config.badge.text,
    color: config.badge.color,
    bgColor: config.badge.bgColor
  }
}