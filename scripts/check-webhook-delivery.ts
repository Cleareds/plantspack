import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function checkWebhookDelivery() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found')
    return
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil',
  })

  console.log('🔍 Checking Recent Webhook Deliveries...\n')

  try {
    // Get recent subscription events (last 20)
    const events = await stripe.events.list({
      limit: 20,
      types: [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
      ]
    })

    console.log(`Found ${events.data.length} recent subscription events:\n`)

    events.data.forEach((event, index) => {
      console.log(`${index + 1}. Event: ${event.type}`)
      console.log(`   ID: ${event.id}`)
      console.log(`   Created: ${new Date(event.created * 1000).toLocaleString()}`)

      if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as Stripe.Subscription
        const previousAttributes = (event.data as any).previous_attributes

        console.log(`   Subscription: ${subscription.id}`)
        console.log(`   Customer: ${subscription.customer}`)
        console.log(`   Current Status: ${subscription.status}`)
        console.log(`   Metadata: ${JSON.stringify(subscription.metadata)}`)

        // Show what changed
        if (previousAttributes) {
          console.log(`   Changes:`)

          if (previousAttributes.items?.data?.[0]?.price?.id) {
            const oldPriceId = previousAttributes.items.data[0].price.id
            const newPriceId = subscription.items.data[0].price.id

            const oldPrice = oldPriceId === process.env.STRIPE_MEDIUM_PRICE_ID ? 'Supporter ($3)' :
                            oldPriceId === process.env.STRIPE_PREMIUM_PRICE_ID ? 'Premium ($7)' : 'Unknown'
            const newPrice = newPriceId === process.env.STRIPE_MEDIUM_PRICE_ID ? 'Supporter ($3)' :
                            newPriceId === process.env.STRIPE_PREMIUM_PRICE_ID ? 'Premium ($7)' : 'Unknown'

            console.log(`     - Plan changed: ${oldPrice} → ${newPrice}`)
          }

          if (previousAttributes.status) {
            console.log(`     - Status changed: ${previousAttributes.status} → ${subscription.status}`)
          }
        }
      } else if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`   Session: ${session.id}`)
        console.log(`   Customer: ${session.customer}`)
        console.log(`   Subscription: ${session.subscription}`)
        console.log(`   Metadata: ${JSON.stringify(session.metadata)}`)
      }

      console.log('')
    })

    console.log('\n📊 CHECKING WEBHOOK DELIVERY STATUS:\n')
    console.log('Go to: https://dashboard.stripe.com/test/webhooks')
    console.log('Click on your webhook endpoint')
    console.log('Check "Attempted webhooks" tab for these events\n')
    console.log('Look for:')
    console.log('✅ 200 = Success (webhook processed correctly)')
    console.log('❌ 400 = Bad request (likely signature verification failed)')
    console.log('❌ 500 = Server error (webhook code crashed)')
    console.log('❌ 307 = Redirect (should be fixed now)')

  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message)
    } else {
      console.error('❌ Unknown error:', error)
    }
  }
}

checkWebhookDelivery().catch(console.error)
