import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'

// Force Node.js runtime (required for Stripe SDK)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Initialize Stripe with secret key
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
}) : null

const PRICE_IDS: Record<string, { month: string; year: string }> = {
  medium: {
    month: process.env.STRIPE_MEDIUM_PRICE_ID!,
    year: process.env.STRIPE_MEDIUM_YEARLY_PRICE_ID || process.env.STRIPE_MEDIUM_PRICE_ID!,
  },
}

export async function POST(request: NextRequest) {
  // Enhanced logging for debugging
  console.log('=== Stripe Checkout Session Creation ===')
  console.log('Environment check:')
  console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Set' : 'Missing')
  console.log('- STRIPE_MEDIUM_PRICE_ID:', process.env.STRIPE_MEDIUM_PRICE_ID || 'Missing')
  console.log('- STRIPE_PREMIUM_PRICE_ID:', '(removed — single tier)')

  if (!stripe) {
    console.error('Stripe not initialized - missing STRIPE_SECRET_KEY')
    return NextResponse.json(
      { error: 'Stripe not configured - missing secret key' },
      { status: 500 }
    )
  }

  // Check if price IDs are configured
  if (!process.env.STRIPE_MEDIUM_PRICE_ID) {
    console.error('Missing STRIPE_MEDIUM_PRICE_ID in environment variables')
    return NextResponse.json(
      { error: 'Payment configuration error. Please try again later.' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    console.log('Request body:', body)
    
    const { tierId, userId, successUrl, cancelUrl, interval = 'month' } = body

    if (!tierId || !userId) {
      console.error('Missing required parameters:', { tierId, userId })
      return NextResponse.json(
        { error: 'Missing required parameters: tierId and userId are required' },
        { status: 400 }
      )
    }

    const tierPrices = PRICE_IDS[tierId as keyof typeof PRICE_IDS]
    if (!tierPrices) {
      console.error('Invalid tier ID:', tierId, 'Available:', Object.keys(PRICE_IDS))
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      )
    }

    const billingInterval = interval === 'year' ? 'year' : 'month'
    const priceId = tierPrices[billingInterval]
    console.log('Using price ID:', priceId, 'interval:', billingInterval)

    // Get user details
    console.log('Fetching user details for ID:', userId)
    const supabase = createAdminClient()
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('email, stripe_customer_id, username')
      .eq('id', userId)
      .maybeSingle()

    if (userError) {
      console.error('Database error fetching user:', userError)
    }

    // If profile doesn't exist, try to get email from auth and create profile
    if (!user) {
      console.log('Profile not found, checking auth user...')
      const { data: authData } = await supabase.auth.admin.getUserById(userId)

      if (!authData?.user?.email) {
        console.error('User not found in auth or users table:', userId)
        return NextResponse.json(
          { error: 'User not found. Please try logging out and back in.' },
          { status: 404 }
        )
      }

      // Auto-create profile with unique username
      const email = authData.user.email
      const metadata = authData.user.user_metadata || {}
      const baseUsername = metadata.username || email.split('@')[0]

      // Find unique username
      let finalUsername = baseUsername
      let counter = 1
      for (let i = 0; i < 50; i++) {
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('username', finalUsername)
          .maybeSingle()
        if (!existing) break
        finalUsername = `${baseUsername}${counter}`
        counter++
      }

      const { error: createErr } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          username: finalUsername,
          first_name: metadata.first_name || metadata.given_name || '',
          last_name: metadata.last_name || metadata.family_name || '',
          bio: '',
        })

      if (createErr) {
        console.error('Failed to auto-create profile:', createErr)
        // If it's a duplicate key on id, the profile exists — just re-fetch
      }

      // Re-fetch
      const { data: retryUser } = await supabase
        .from('users')
        .select('email, stripe_customer_id, username')
        .eq('id', userId)
        .maybeSingle()

      user = retryUser

      if (!user) {
        console.error('Profile still not found after auto-create for:', userId)
        return NextResponse.json(
          { error: 'Failed to load user data. Please try logging out and back in.' },
          { status: 500 }
        )
      }
    }

    console.log('User found:', { email: user.email, hasStripeCustomer: !!user.stripe_customer_id })

    // Check for existing active subscriptions and redirect to portal if found
    if (user.stripe_customer_id) {
      console.log('Checking for existing active subscriptions...')
      try {
        const existingSubscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: 'active',
          limit: 10,
        })

        if (existingSubscriptions.data.length > 0) {
          console.log('User already has active subscription(s) - redirecting to portal:', existingSubscriptions.data.map(s => s.id))

          // Create portal session instead of checkout
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
          const returnUrl = user.username
            ? `${baseUrl}/profile/${user.username}/subscription`
            : `${baseUrl}/settings`

          const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: returnUrl,
            configuration: 'bpc_1Slz6vAqP7U8Au3xYpLZ2VX9',
          })

          return NextResponse.json({
            redirectToPortal: true,
            portalUrl: portalSession.url,
          })
        }
        console.log('No active subscriptions found - OK to create checkout')
      } catch (error) {
        console.error('Error checking existing subscriptions:', error)
        // Continue anyway - better to allow duplicate than block legitimate checkout
      }
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripe_customer_id

    if (!customerId) {
      console.log('Creating new Stripe customer for:', user.email)
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: userId,
          },
        })
        customerId = customer.id
        console.log('Created Stripe customer:', customerId)

        // Update user with Stripe customer ID
        const { error: updateError } = await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId)

        if (updateError) {
          console.error('Failed to update user with Stripe customer ID:', updateError)
          // Don't fail the request, just log the error
        }
      } catch (stripeError) {
        console.error('Failed to create Stripe customer:', stripeError)
        return NextResponse.json(
          { error: 'Failed to create payment account' },
          { status: 500 }
        )
      }
    } else {
      console.log('Using existing Stripe customer:', customerId)
    }

    // Create checkout session
    console.log('Creating checkout session with params:', {
      customerId,
      priceId: priceId,
      tierId,
      successUrl,
      cancelUrl
    })

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
          tierId: tierId,
        },
        subscription_data: {
          metadata: {
            userId: userId,
            tierId: tierId,
          },
        },
      })

      console.log('Checkout session created successfully:', session.id)
      return NextResponse.json({ sessionId: session.id })
    } catch (stripeError) {
      console.error('Failed to create checkout session:', stripeError)
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Unexpected error in checkout session creation:', message, error)
    return NextResponse.json(
      { error: message || 'Internal server error' },
      { status: 500 }
    )
  }
}