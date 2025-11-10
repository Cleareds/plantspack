// Stripe Integration for Premium Subscriptions

import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabase'

// Initialize Stripe
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null)

export { stripePromise }

export interface SubscriptionTier {
  id: 'free' | 'medium' | 'premium'
  name: string
  price: number
  currency: string
  interval: 'month'
  features: string[]
  maxPostLength: number
  maxImages: number
  maxVideos: number
  maxVideoSize: number
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
    currency: 'USD',
    interval: 'month',
    features: [
      '500 character posts',
      '3 images per post',
      'Basic feed access',
      'Community support'
    ],
    maxPostLength: 500,
    maxImages: 3,
    maxVideos: 0,
    maxVideoSize: 0,
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
    currency: 'USD',
    interval: 'month',
    features: [
      '1000 character posts',
      '7 images per post',
      '1 video per post (64MB max)',
      'Location sharing',
      'Post analytics',
      'Community support'
    ],
    maxPostLength: 1000,
    maxImages: 7,
    maxVideos: 1,
    maxVideoSize: 64 * 1024 * 1024, // 64MB in bytes
    badge: {
      text: 'Supporter',
      color: '#059669',
      bgColor: '#D1FAE5'
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 10,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited character posts',
      'Unlimited images per post',
      '3 videos per post (256MB max each)',
      'Location sharing',
      'Advanced post analytics',
      'Early access to new features',
      'Priority support'
    ],
    maxPostLength: -1, // -1 means unlimited
    maxImages: -1, // -1 means unlimited
    maxVideos: 3,
    maxVideoSize: 256 * 1024 * 1024, // 256MB in bytes
    badge: {
      text: 'Premium',
      color: '#7C3AED',
      bgColor: '#EDE9FE'
    }
  }
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
      .single()

    if (error) throw error

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
  tierId: 'medium' | 'premium',
  userId: string,
  successUrl: string,
  cancelUrl: string
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
        cancelUrl
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create checkout session')
    }

    const { sessionId } = await response.json()
    return sessionId
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

/**
 * Redirect to Stripe checkout
 */
export async function redirectToCheckout(
  tierId: 'medium' | 'premium',
  userId: string
) {
  try {
    const stripe = await stripePromise
    if (!stripe) {
      throw new Error('Stripe is not properly configured. Please check your environment variables.')
    }

    const sessionId = await createCheckoutSession(
      tierId,
      userId,
      `${window.location.origin}/pricing?success=true`,
      `${window.location.origin}/pricing?canceled=true`
    )

    const { error } = await stripe.redirectToCheckout({ sessionId })
    if (error) throw error
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
  subscription: UserSubscription,
  action: 'create_long_post' | 'multiple_images' | 'use_location' | 'see_analytics' | 'upload_video'
): boolean {
  if (subscription.status !== 'active') {
    return action === 'create_long_post' ? false : subscription.tier !== 'free'
  }

  const tier = SUBSCRIPTION_TIERS[subscription.tier]
  
  switch (action) {
    case 'create_long_post':
      return tier.maxPostLength > 500 || tier.maxPostLength === -1
    case 'multiple_images':
      return tier.maxImages > 3 || tier.maxImages === -1
    case 'upload_video':
      return tier.maxVideos > 0
    case 'use_location':
      return subscription.tier !== 'free'
    case 'see_analytics':
      return subscription.tier !== 'free'
    default:
      return true
  }
}

/**
 * Get tier badge component props
 */
export function getTierBadge(tier: 'free' | 'medium' | 'premium') {
  const config = SUBSCRIPTION_TIERS[tier]
  return {
    text: config.badge.text,
    color: config.badge.color,
    bgColor: config.badge.bgColor
  }
}