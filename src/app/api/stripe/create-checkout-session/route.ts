import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

// Force Node.js runtime (required for Stripe SDK)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Initialize Stripe with secret key
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
}) : null

const PRICE_IDS = {
  medium: process.env.STRIPE_MEDIUM_PRICE_ID!,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID!,
}

export async function POST(request: NextRequest) {
  // Enhanced logging for debugging
  console.log('=== Stripe Checkout Session Creation ===')
  console.log('Environment check:')
  console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Set' : 'Missing')
  console.log('- STRIPE_MEDIUM_PRICE_ID:', process.env.STRIPE_MEDIUM_PRICE_ID || 'Missing')
  console.log('- STRIPE_PREMIUM_PRICE_ID:', process.env.STRIPE_PREMIUM_PRICE_ID || 'Missing')

  if (!stripe) {
    console.error('Stripe not initialized - missing STRIPE_SECRET_KEY')
    return NextResponse.json(
      { error: 'Stripe not configured - missing secret key' },
      { status: 500 }
    )
  }

  // Check if price IDs are configured
  if (!process.env.STRIPE_MEDIUM_PRICE_ID || !process.env.STRIPE_PREMIUM_PRICE_ID) {
    console.error('Missing Stripe price IDs in environment variables')
    return NextResponse.json(
      { 
        error: 'Stripe price IDs not configured',
        details: {
          medium: process.env.STRIPE_MEDIUM_PRICE_ID ? 'Set' : 'Missing',
          premium: process.env.STRIPE_PREMIUM_PRICE_ID ? 'Set' : 'Missing'
        }
      },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    console.log('Request body:', body)
    
    const { tierId, userId, successUrl, cancelUrl } = body

    if (!tierId || !userId) {
      console.error('Missing required parameters:', { tierId, userId })
      return NextResponse.json(
        { error: 'Missing required parameters: tierId and userId are required' },
        { status: 400 }
      )
    }

    if (!PRICE_IDS[tierId as keyof typeof PRICE_IDS]) {
      console.error('Invalid tier ID:', tierId, 'Available:', Object.keys(PRICE_IDS))
      return NextResponse.json(
        { 
          error: 'Invalid tier ID',
          details: {
            received: tierId,
            available: Object.keys(PRICE_IDS)
          }
        },
        { status: 400 }
      )
    }

    console.log('Using price ID:', PRICE_IDS[tierId as keyof typeof PRICE_IDS])

    // Get user details
    console.log('Fetching user details for ID:', userId)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Database error fetching user:', userError)
      return NextResponse.json(
        { 
          error: 'Database error',
          details: userError.message
        },
        { status: 500 }
      )
    }

    if (!user) {
      console.error('User not found:', userId)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('User found:', { email: user.email, hasStripeCustomer: !!user.stripe_customer_id })

    // Check for existing active subscriptions to prevent duplicates
    if (user.stripe_customer_id) {
      console.log('Checking for existing active subscriptions...')
      try {
        const existingSubscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: 'active',
          limit: 10,
        })

        if (existingSubscriptions.data.length > 0) {
          console.error('User already has active subscription(s):', existingSubscriptions.data.map(s => s.id))
          return NextResponse.json(
            {
              error: 'You already have an active subscription. Please use "Manage Subscription" to change your plan.',
              hasActiveSubscription: true,
            },
            { status: 400 }
          )
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
          { 
            error: 'Failed to create Stripe customer',
            details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    } else {
      console.log('Using existing Stripe customer:', customerId)
    }

    // Create checkout session
    console.log('Creating checkout session with params:', {
      customerId,
      priceId: PRICE_IDS[tierId as keyof typeof PRICE_IDS],
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
            price: PRICE_IDS[tierId as keyof typeof PRICE_IDS],
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
        { 
          error: 'Failed to create checkout session',
          details: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unexpected error in checkout session creation:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}