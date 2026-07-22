import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendSubscriptionEmail } from '@/lib/email'
import { log } from '@/lib/logger'

// Force Node.js runtime (required for Stripe SDK)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

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
  log.debug('🔔 ===== STRIPE WEBHOOK RECEIVED =====')

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
    log.debug('📝 Webhook signature present:', !!signature)

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      log.debug('✅ Signature verified successfully')
      log.debug('📋 Event type:', event.type)
      log.debug('🆔 Event ID:', event.id)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    log.debug(`🔄 Processing event: ${event.type}`)
    switch (event.type) {
      case 'checkout.session.completed':
        log.debug('💳 Handling checkout completion...')
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        log.debug('💰 Handling payment success...')
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        log.debug('⚠️  Handling payment failure...')
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        log.debug('🔄 Handling subscription update...')
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        log.debug('🗑️  Handling subscription deletion...')
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        log.debug(`⚠️  Unhandled event type: ${event.type}`)
    }

    // Log the event
    await logWebhookEvent(event)

    log.debug('✅ ===== WEBHOOK PROCESSED SUCCESSFULLY =====')
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

  log.debug('=== Handling Checkout Completed ===')
  log.debug('Session ID:', session.id)
  log.debug('Metadata:', session.metadata)

  const userId = session.metadata?.userId
  const tierId = session.metadata?.tierId as 'medium' | 'premium'

  if (!userId || !tierId) {
    console.error('Missing metadata in checkout session:', { userId, tierId })
    return
  }

  try {
    // Get subscription details
    log.debug('Retrieving subscription:', session.subscription)
    const subscriptionResponse = await stripe.subscriptions.retrieve(
      session.subscription as string,
      { expand: ['latest_invoice', 'default_payment_method'] }
    )

    // Type assertion with proper casting
    const subscription = subscriptionResponse as any
    const periodStart = new Date(subscription.current_period_start * 1000).toISOString()
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

    log.debug('Updating user subscription with params:', {
      target_user_id: userId,
      new_tier: tierId,
      new_status: 'active',
      stripe_sub_id: subscription.id,
      stripe_cust_id: subscription.customer,
      period_start: periodStart,
      period_end: periodEnd
    })

    // Update user subscription
    log.debug('📞 Calling update_user_subscription RPC...')
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

    log.debug('✅ RPC call succeeded, data:', rpcData)
    log.debug('✅ Subscription activated successfully:', { userId, tierId, subscriptionId: subscription.id })

    // Verify the update worked by querying the user
    const { data: updatedUser, error: verifyError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status, email, username')
      .eq('id', userId)
      .single()

    if (verifyError) {
      console.error('⚠️ Could not verify subscription update:', verifyError)
    } else {
      log.debug('✅ Verified user subscription:', updatedUser)

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

    // Founding Supporter: grant the permanent founding badge while the founding
    // cohort is still small. Best-effort — never blocks provisioning.
    try {
      const FOUNDING_CAP = 100
      const { count: foundingCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('founding_supporter', true)
      if ((foundingCount ?? 0) < FOUNDING_CAP) {
        await supabase.from('users').update({ founding_supporter: true }).eq('id', userId)
        log.debug('🌱 Founding Supporter granted:', userId)
      }
    } catch (e) {
      console.error('Founding grant check failed (non-fatal):', e)
    }

    // Check for early purchaser promotion after successful subscription activation
    if (tierId === 'medium') {
      try {
        const { error: promoError } = await (supabase.rpc as any)('grant_early_purchaser_subscription', {
          target_user_id: userId
        })

        if (promoError && !promoError.message?.includes('not eligible') && !promoError.message?.includes('no longer available')) {
          console.error('Error checking early purchaser promotion:', promoError)
        } else if (!promoError) {
          log.debug('🎉 Early purchaser promotion granted to user:', userId)
        }
      } catch (promoCheckError) {
        console.error('Error during early purchaser promotion check:', promoCheckError)
      }
    }
  } catch (error) {
    console.error('❌ Error handling checkout completion:', error)

    // Fallback: direct database update if RPC fails
    try {
      log.debug('Attempting fallback direct database update...')
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
        log.debug('✅ Fallback update succeeded')
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
    let tierId: 'medium' | 'premium'

    if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
      tierId = 'premium'
    } else if (priceId === process.env.STRIPE_MEDIUM_PRICE_ID) {
      tierId = 'medium'
    } else {
      // Not a PlantsPack price — this event belongs to another product in the
      // same Stripe account (e.g. Reelfleur). Skip rather than defaulting to
      // 'free', so an unrelated subscription can never downgrade a PlantsPack
      // user (e.g. if its metadata.userId ever collided with ours).
      log.debug(`Ignoring non-PlantsPack price ${priceId} in invoice.payment_succeeded`)
      return
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

    log.debug(`✅ Payment succeeded for user ${userId}: ${tierId}`)
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

    log.debug(`Payment failed for user ${userId}`)
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Use admin client to bypass RLS for webhook operations
  const supabase = createAdminClient()

  log.debug('📊 ===== SUBSCRIPTION UPDATE HANDLER =====')
  const extendedSubscription = subscription as any

  log.debug('🔍 Subscription ID:', extendedSubscription.id)
  log.debug('👤 Customer ID:', extendedSubscription.customer)
  log.debug('📋 Subscription metadata:', JSON.stringify(extendedSubscription.metadata))

  const userId = extendedSubscription.metadata.userId

  if (!userId) {
    console.error('❌ No userId in subscription metadata!')
    console.error('   Subscription ID:', extendedSubscription.id)
    console.error('   Available metadata:', JSON.stringify(extendedSubscription.metadata))
    return
  }

  log.debug('✅ User ID found:', userId)

  try {
    // Determine tier from actual price ID (not metadata, which doesn't update on plan changes)
    const priceId = extendedSubscription.items.data[0]?.price?.id
    log.debug('💰 Price ID from subscription:', priceId)
    log.debug('🔧 Expected Premium Price ID:', process.env.STRIPE_PREMIUM_PRICE_ID)
    log.debug('🔧 Expected Medium Price ID:', process.env.STRIPE_MEDIUM_PRICE_ID)

    let tierId: 'medium' | 'premium'

    if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
      tierId = 'premium'
      log.debug('✅ Detected tier: PREMIUM')
    } else if (priceId === process.env.STRIPE_MEDIUM_PRICE_ID) {
      tierId = 'medium'
      log.debug('✅ Detected tier: SUPPORTER (medium)')
    } else {
      // Not a PlantsPack price — belongs to another product in the same Stripe
      // account (e.g. Reelfleur). Skip rather than defaulting to 'free', so an
      // unrelated subscription can never downgrade a PlantsPack user. Genuine
      // downgrades come through customer.subscription.deleted (cancellation).
      log.debug(`Ignoring non-PlantsPack price ${priceId} in subscription.updated`)
      return
    }

    const status = mapStripeStatusToLocal(extendedSubscription.status)
    log.debug('📊 Subscription status:', extendedSubscription.status, '→', status)

    log.debug('💾 Calling RPC function with params:')
    log.debug('   target_user_id:', userId)
    log.debug('   new_tier:', tierId)
    log.debug('   new_status:', status)
    log.debug('   stripe_sub_id:', extendedSubscription.id)
    log.debug('   stripe_cust_id:', extendedSubscription.customer)

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
      log.debug('🔄 Attempting fallback direct table update...')
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
        log.debug('✅ Fallback update succeeded!')
      }
    } else {
      log.debug('✅ RPC function succeeded!')
      log.debug('   Response data:', rpcData)
    }

    log.debug(`✅ ===== SUBSCRIPTION UPDATE COMPLETE: ${tierId} (${status}) =====`)
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

    log.debug(`Subscription canceled for user ${userId}`)
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
          log.debug(`Webhook event ${event.id} already processed, skipping`)
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