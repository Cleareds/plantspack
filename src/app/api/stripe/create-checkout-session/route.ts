import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

const PRICE_IDS = {
  medium: process.env.STRIPE_MEDIUM_PRICE_ID!,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID!,
}

export async function POST(request: NextRequest) {
  try {
    const { tierId, userId, successUrl, cancelUrl } = await request.json()

    if (!tierId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    if (!PRICE_IDS[tierId as keyof typeof PRICE_IDS]) {
      return NextResponse.json(
        { error: 'Invalid tier ID' },
        { status: 400 }
      )
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId,
        },
      })
      customerId = customer.id

      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Create checkout session
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

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}