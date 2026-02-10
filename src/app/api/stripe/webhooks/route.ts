import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendSubscriptionEmail } from '@/lib/email'

// Force Node.js runtime (required for Stripe SDK)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
}) : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// GET handler for health check / information
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/stripe/webhooks',
    method: 'POST only',
    purpose: 'Stripe webhook receiver',
    status: webhookSecret ? 'configured' : 'not configured',
    message: 'This endpoint only accepts POST requests from Stripe. Configure in Stripe Dashboard > Developers > Webhooks',
    documentation: 'https://stripe.com/docs/webhooks'
  })
}

export async function POST(request: NextRequest) {
  console.log('🔔 ===== STRIPE WEBHOOK RECEIVED =====')

  if (!stripe) {
    console.error('❌ Stripe not configured - missing STRIPE_SECRET_KEY')
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    )
  }

  if (!webhookSecret) {
    console.error('❌ Missing STRIPE_WEBHOOK_SECRET environment variable')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!
    console.log('📝 Webhook signature present:', !!signature)

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log('✅ Signature verified successfully')
      console.log('📋 Event type:', event.type)
      console.log('🆔 Event ID:', event.id)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    console.log(`🔄 Processing event: ${event.type}`)
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('💳 Handling checkout completion...')
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        console.log('💰 Handling payment success...')
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        console.log('⚠️  Handling payment failure...')
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        console.log('🔄 Handling subscription update...')
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        console.log('🗑️  Handling subscription deletion...')
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`⚠️  Unhandled event type: ${event.type}`)
    }

    // Log the event
    await logWebhookEvent(event)

    console.log('✅ ===== WEBHOOK PROCESSED SUCCESSFULLY =====')
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ ===== WEBHOOK PROCESSING ERROR =====')
    console.error('Error details:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!stripe) return

  // Use admin client to bypass RLS for webhook operations
  const supabase = createAdminClient()

  console.log('=== Handling Checkout Completed ===')
  console.log('Session ID:', session.id)
  console.log('Metadata:', session.metadata)

  const userId = session.metadata?.userId
  const tierId = session.metadata?.tierId as 'medium' | 'premium'

  if (!userId || !tierId) {
    console.error('Missing metadata in checkout session:', { userId, tierId })
    return
  }

  try {
    // Get subscription details
    console.log('Retrieving subscription:', session.subscription)
    const subscriptionResponse = await stripe.subscriptions.retrieve(
      session.subscription as string,
      { expand: ['latest_invoice', 'default_payment_method'] }
    )

    // Type assertion with proper casting
    const subscription = subscriptionResponse as any
    const periodStart = new Date(subscription.current_period_start * 1000).toISOString()
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

    console.log('Updating user subscription with params:', {
      target_user_id: userId,
      new_tier: tierId,
      new_status: 'active',
      stripe_sub_id: subscription.id,
      stripe_cust_id: subscription.customer,
      period_start: periodStart,
      period_end: periodEnd
    })

    // Update user subscription
    console.log('📞 Calling update_user_subscription RPC...')
    const { data: rpcData, error } = await supabase.rpc('update_user_subscription', {
      target_user_id: userId,
      new_tier: tierId,
      new_status: 'active',
      stripe_sub_id: subscription.id,
      stripe_cust_id: subscription.customer as string,
      period_start: periodStart,
      period_end: periodEnd
    })

    if (error) {
      console.error('❌ Database RPC error:', error)
      console.error('RPC error details:', JSON.stringify(error, null, 2))
      throw error
    }

    console.log('✅ RPC call succeeded, data:', rpcData)
    console.log('✅ Subscription activated successfully:', { userId, tierId, subscriptionId: subscription.id })

    // Verify the update worked by querying the user
    const { data: updatedUser, error: verifyError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status, email, username')
      .eq('id', userId)
      .single()

    if (verifyError) {
      console.error('⚠️ Could not verify subscription update:', verifyError)
    } else {
      console.log('✅ Verified user subscription:', updatedUser)

      // Send subscription confirmation email
      if (updatedUser.email && updatedUser.username) {
        sendSubscriptionEmail(
          updatedUser.email,
          updatedUser.username,
          tierId
        ).catch((err) => {
          console.error('Failed to send subscription email:', err)
        })
      }
    }

    // Check for early purchaser promotion after successful subscription activation
    if (tierId === 'medium') {
      try {
        const { error: promoError } = await supabase.rpc('grant_early_purchaser_subscription', {
          target_user_id: userId
        })

        if (promoError && !promoError.message?.includes('not eligible') && !promoError.message?.includes('no longer available')) {
          console.error('Error checking early purchaser promotion:', promoError)
        } else if (!promoError) {
          console.log('🎉 Early purchaser promotion granted to user:', userId)
        }
      } catch (promoCheckError) {
        console.error('Error during early purchaser promotion check:', promoCheckError)
      }
    }
  } catch (error) {
    console.error('❌ Error handling checkout completion:', error)

    // Fallback: direct database update if RPC fails
    try {
      console.log('Attempting fallback direct database update...')
      const { error: fallbackError } = await supabase
        .from('users')
        .update({
          subscription_tier: tierId,
          subscription_status: 'active',
          stripe_subscription_id: session.subscription,
          stripe_customer_id: session.customer,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (fallbackError) {
        console.error('Fallback update also failed:', fallbackError)
      } else {
        console.log('✅ Fallback update succeeded')
      }
    } catch (fallbackError) {
      console.error('❌ Fallback update failed:', fallbackError)
    }
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!stripe) return

  // Use admin client to bypass RLS for webhook operations
  const supabase = createAdminClient()

  const subscriptionId = (invoice as any).subscription as string

  try {
    const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
    const subscription = subscriptionResponse as any
    const userId = subscription.metadata.userId

    if (!userId) {
      console.error('No userId in subscription metadata')
      return
    }

    // Determine tier from actual price ID (not metadata, which doesn't update on plan changes)
    const priceId = subscription.items.data[0]?.price?.id
    let tierId: 'medium' | 'premium' | 'free' = 'free'

    if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
      tierId = 'premium'
    } else if (priceId === process.env.STRIPE_MEDIUM_PRICE_ID) {
      tierId = 'medium'
    }

    // Update subscription status
    await supabase.rpc('update_user_subscription', {
      target_user_id: userId,
      new_tier: tierId,
      new_status: 'active',
      stripe_sub_id: subscription.id,
      stripe_cust_id: subscription.customer as string,
      period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
      period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
    })

    console.log(`✅ Payment succeeded for user ${userId}: ${tierId}`)
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!stripe) return

  // Use admin client to bypass RLS for webhook operations
  const supabase = createAdminClient()

  const subscriptionId = (invoice as any).subscription as string

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const userId = subscription.metadata.userId

    if (!userId) {
      console.error('No userId in subscription metadata')
      return
    }

    // Update subscription status to past_due
    await supabase
      .from('users')
      .update({ subscription_status: 'past_due' })
      .eq('id', userId)

    console.log(`Payment failed for user ${userId}`)
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Use admin client to bypass RLS for webhook operations
  const supabase = createAdminClient()

  console.log('📊 ===== SUBSCRIPTION UPDATE HANDLER =====')
  const extendedSubscription = subscription as any

  console.log('🔍 Subscription ID:', extendedSubscription.id)
  console.log('👤 Customer ID:', extendedSubscription.customer)
  console.log('📋 Subscription metadata:', JSON.stringify(extendedSubscription.metadata))

  const userId = extendedSubscription.metadata.userId

  if (!userId) {
    console.error('❌ No userId in subscription metadata!')
    console.error('   Subscription ID:', extendedSubscription.id)
    console.error('   Available metadata:', JSON.stringify(extendedSubscription.metadata))
    return
  }

  console.log('✅ User ID found:', userId)

  try {
    // Determine tier from actual price ID (not metadata, which doesn't update on plan changes)
    const priceId = extendedSubscription.items.data[0]?.price?.id
    console.log('💰 Price ID from subscription:', priceId)
    console.log('🔧 Expected Premium Price ID:', process.env.STRIPE_PREMIUM_PRICE_ID)
    console.log('🔧 Expected Medium Price ID:', process.env.STRIPE_MEDIUM_PRICE_ID)

    let tierId: 'medium' | 'premium' | 'free' = 'free'

    if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
      tierId = 'premium'
      console.log('✅ Detected tier: PREMIUM')
    } else if (priceId === process.env.STRIPE_MEDIUM_PRICE_ID) {
      tierId = 'medium'
      console.log('✅ Detected tier: SUPPORTER (medium)')
    } else {
      console.warn(`⚠️  Unknown price ID: ${priceId}, defaulting to free tier`)
      console.warn('   This price ID does not match any configured tiers!')
    }

    const status = mapStripeStatusToLocal(extendedSubscription.status)
    console.log('📊 Subscription status:', extendedSubscription.status, '→', status)

    console.log('💾 Calling RPC function with params:')
    console.log('   target_user_id:', userId)
    console.log('   new_tier:', tierId)
    console.log('   new_status:', status)
    console.log('   stripe_sub_id:', extendedSubscription.id)
    console.log('   stripe_cust_id:', extendedSubscription.customer)

    const { data: rpcData, error: rpcError } = await supabase.rpc('update_user_subscription', {
      target_user_id: userId,
      new_tier: tierId,
      new_status: status,
      stripe_sub_id: extendedSubscription.id,
      stripe_cust_id: extendedSubscription.customer as string,
      period_start: extendedSubscription.current_period_start ? new Date(extendedSubscription.current_period_start * 1000).toISOString() : null,
      period_end: extendedSubscription.current_period_end ? new Date(extendedSubscription.current_period_end * 1000).toISOString() : null
    })

    if (rpcError) {
      console.error('❌ RPC Error:', rpcError)
      console.error('   Code:', rpcError.code)
      console.error('   Message:', rpcError.message)
      console.error('   Details:', rpcError.details)
      console.error('   Hint:', rpcError.hint)

      // Try direct table update as fallback
      console.log('🔄 Attempting fallback direct table update...')
      const { error: fallbackError } = await supabase
        .from('users')
        .update({
          subscription_tier: tierId,
          subscription_status: status,
          stripe_subscription_id: extendedSubscription.id,
          stripe_customer_id: extendedSubscription.customer as string,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (fallbackError) {
        console.error('❌ Fallback update also failed:', fallbackError)
      } else {
        console.log('✅ Fallback update succeeded!')
      }
    } else {
      console.log('✅ RPC function succeeded!')
      console.log('   Response data:', rpcData)
    }

    console.log(`✅ ===== SUBSCRIPTION UPDATE COMPLETE: ${tierId} (${status}) =====`)
  } catch (error) {
    console.error('❌ ===== ERROR IN SUBSCRIPTION UPDATE =====')
    console.error('Error:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack')
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Use admin client to bypass RLS for webhook operations
  const supabase = createAdminClient()

  const userId = subscription.metadata.userId

  if (!userId) {
    console.error('No userId in subscription metadata')
    return
  }

  try {
    // Downgrade user to free tier
    await supabase.rpc('update_user_subscription', {
      target_user_id: userId,
      new_tier: 'free',
      new_status: 'canceled',
      stripe_sub_id: null,
      stripe_cust_id: subscription.customer as string,
      period_start: null,
      period_end: null
    })

    console.log(`Subscription canceled for user ${userId}`)
  } catch (error) {
    console.error('Error handling subscription cancellation:', error)
  }
}

async function logWebhookEvent(event: Stripe.Event) {
  // Use admin client to bypass RLS for webhook operations
  const supabase = createAdminClient()

  try {
    // Extract subscription ID if available
    let subscriptionId = null
    if (event.data.object && 'subscription' in event.data.object) {
      subscriptionId = event.data.object.subscription as string
    }

    // Log to subscription_events table
    if (subscriptionId) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .single()

      if (subscription) {
        // Check if this event was already processed (idempotency)
        const { data: existingEvent } = await supabase
          .from('subscription_events')
          .select('id')
          .eq('stripe_event_id', event.id)
          .maybeSingle()

        // Only insert if event hasn't been processed before
        if (!existingEvent) {
          const { error: insertError } = await supabase
            .from('subscription_events')
            .insert({
              subscription_id: subscription.id,
              event_type: event.type,
              event_data: event.data,
              stripe_event_id: event.id
            })

          // If insert fails due to unique constraint (race condition), that's ok
          if (insertError && insertError.code !== '23505') {
            throw insertError
          }
        } else {
          console.log(`Webhook event ${event.id} already processed, skipping`)
        }
      }
    }
  } catch (error) {
    console.error('Error logging webhook event:', error)
  }
}

function mapStripeStatusToLocal(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'canceled':
      return 'canceled'
    case 'past_due':
      return 'past_due'
    case 'unpaid':
      return 'unpaid'
    default:
      return 'active'
  }
}