import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
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
  const userId = session.metadata?.userId
  const tierId = session.metadata?.tierId as 'medium' | 'premium'

  if (!userId || !tierId) {
    console.error('Missing metadata in checkout session')
    return
  }

  try {
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    )

    // Update user subscription
    await supabase.rpc('update_user_subscription', {
      target_user_id: userId,
      new_tier: tierId,
      new_status: 'active',
      stripe_sub_id: subscription.id,
      stripe_cust_id: subscription.customer as string,
      period_start: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : null,
      period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null
    })

    console.log(`Subscription activated for user ${userId}, tier: ${tierId}`)
  } catch (error) {
    console.error('Error handling checkout completion:', error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
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