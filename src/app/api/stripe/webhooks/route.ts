import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
}) : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Log the event
    await logWebhookEvent(event)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!stripe) return
  
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
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
      { expand: ['latest_invoice', 'default_payment_method'] }
    )

    const periodStart = new Date((subscription as any).current_period_start * 1000).toISOString()
    const periodEnd = new Date((subscription as any).current_period_end * 1000).toISOString()

    console.log('Updating user subscription with params:', {
      target_user_id: userId,
      new_tier: tierId,
      new_status: 'active',
      stripe_sub_id: (subscription as any).id,
      stripe_cust_id: (subscription as any).customer,
      period_start: periodStart,
      period_end: periodEnd
    })

    // Update user subscription
    const { data, error } = await supabase.rpc('update_user_subscription', {
      target_user_id: userId,
      new_tier: tierId,
      new_status: 'active',
      stripe_sub_id: (subscription as any).id,
      stripe_cust_id: (subscription as any).customer as string,
      period_start: periodStart,
      period_end: periodEnd
    })

    if (error) {
      console.error('Database RPC error:', error)
      throw error
    }

    console.log('✅ Subscription activated successfully:', { userId, tierId, subscriptionId: (subscription as any).id })

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
  
  const subscriptionId = (invoice as any).subscription as string
  
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const userId = subscription.metadata.userId

    if (!userId) {
      console.error('No userId in subscription metadata')
      return
    }

    // Update subscription status
    await supabase.rpc('update_user_subscription', {
      target_user_id: userId,
      new_tier: subscription.metadata.tierId as 'medium' | 'premium',
      new_status: 'active',
      stripe_sub_id: subscription.id,
      stripe_cust_id: subscription.customer as string,
      period_start: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : null,
      period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null
    })

    console.log(`Payment succeeded for user ${userId}`)
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!stripe) return
  
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
  const userId = subscription.metadata.userId
  const tierId = subscription.metadata.tierId as 'medium' | 'premium'

  if (!userId) {
    console.error('No userId in subscription metadata')
    return
  }

  try {
    const status = mapStripeStatusToLocal(subscription.status)
    
    await supabase.rpc('update_user_subscription', {
      target_user_id: userId,
      new_tier: tierId,
      new_status: status,
      stripe_sub_id: subscription.id,
      stripe_cust_id: subscription.customer as string,
      period_start: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : null,
      period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null
    })

    console.log(`Subscription updated for user ${userId}, status: ${status}`)
  } catch (error) {
    console.error('Error handling subscription update:', error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
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
        await supabase
          .from('subscription_events')
          .insert({
            subscription_id: subscription.id,
            event_type: event.type,
            event_data: event.data,
            stripe_event_id: event.id
          })
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