import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function checkWebhookLogs() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found')
    return
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil',
  })

  console.log('🔍 Checking Stripe Webhook Configuration...\n')

  // 1. List webhook endpoints
  console.log('1️⃣ WEBHOOK ENDPOINTS:')
  const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })

  if (webhooks.data.length === 0) {
    console.log('   ❌ No webhook endpoints configured!')
    console.log('   ⚠️  Go to https://dashboard.stripe.com/test/webhooks to add one')
    console.log('   ⚠️  Endpoint URL: https://plantspack.com/api/stripe/webhooks')
    return
  }

  webhooks.data.forEach((webhook, index) => {
    console.log(`\n   Webhook #${index + 1}:`)
    console.log(`   URL: ${webhook.url}`)
    console.log(`   Status: ${webhook.status}`)
    console.log(`   Events: ${webhook.enabled_events.join(', ')}`)
    console.log(`   Secret: ${webhook.secret ? webhook.secret.substring(0, 20) + '...' : 'Not available'}`)

    // Check if it's the production URL
    if (webhook.url.includes('plantspack.com')) {
      console.log('   ✅ This is the production webhook')

      // Verify secret matches
      if (webhook.secret === process.env.STRIPE_WEBHOOK_SECRET) {
        console.log('   ✅ Secret matches environment variable')
      } else {
        console.log('   ⚠️  Secret does NOT match STRIPE_WEBHOOK_SECRET in .env.local')
        console.log(`   Expected: ${process.env.STRIPE_WEBHOOK_SECRET}`)
        console.log(`   Actual: ${webhook.secret}`)
      }
    }
  })

  // 2. Get recent events sent to webhooks
  console.log('\n\n2️⃣ RECENT WEBHOOK EVENTS (last 10):')
  const events = await stripe.events.list({
    limit: 10,
    types: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed'
    ]
  })

  if (events.data.length === 0) {
    console.log('   ❌ No recent webhook events')
  } else {
    events.data.forEach((event, index) => {
      console.log(`\n   Event #${index + 1}:`)
      console.log(`   Type: ${event.type}`)
      console.log(`   ID: ${event.id}`)
      console.log(`   Created: ${new Date(event.created * 1000).toLocaleString()}`)

      // Check if event was sent to webhooks
      if (event.request) {
        console.log(`   Request ID: ${event.request.id}`)
      }

      // Show relevant data
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`   Session ID: ${session.id}`)
        console.log(`   Customer: ${session.customer}`)
        console.log(`   Subscription: ${session.subscription}`)
        console.log(`   Metadata: ${JSON.stringify(session.metadata)}`)
      } else if (event.type.startsWith('customer.subscription')) {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`   Subscription ID: ${subscription.id}`)
        console.log(`   Customer: ${subscription.customer}`)
        console.log(`   Status: ${subscription.status}`)
        console.log(`   Metadata: ${JSON.stringify(subscription.metadata)}`)
      }
    })
  }

  // 3. Instructions for checking webhook delivery
  console.log('\n\n3️⃣ HOW TO CHECK WEBHOOK DELIVERY:')
  console.log('   1. Go to: https://dashboard.stripe.com/test/webhooks')
  console.log('   2. Click on your webhook endpoint')
  console.log('   3. Check the "Attempted webhooks" tab')
  console.log('   4. Look for recent events and their HTTP response codes')
  console.log('   5. Click on an event to see the full request/response')
  console.log('')
  console.log('   ✅ 200 = Success')
  console.log('   ❌ 404 = Endpoint not found')
  console.log('   ❌ 400 = Invalid signature or bad request')
  console.log('   ❌ 500 = Server error')

  // 4. Check if production endpoint is accessible
  console.log('\n\n4️⃣ TESTING WEBHOOK ENDPOINT ACCESSIBILITY:')
  console.log('   Testing: https://plantspack.com/api/stripe/webhooks')

  try {
    const response = await fetch('https://plantspack.com/api/stripe/webhooks', {
      method: 'GET',
    })
    console.log(`   Response status: ${response.status}`)

    if (response.status === 405) {
      console.log('   ✅ Endpoint exists (405 = Method Not Allowed for GET, expects POST)')
    } else if (response.status === 404) {
      console.log('   ❌ Endpoint not found! The route may not be deployed.')
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`)
    }
  } catch (error) {
    console.log(`   ❌ Error reaching endpoint: ${error}`)
  }

  // 5. Check environment variables
  console.log('\n\n5️⃣ ENVIRONMENT VARIABLES CHECK:')
  console.log(`   STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing'}`)
  console.log(`   STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing'}`)
  console.log(`   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing'}`)

  if (process.env.STRIPE_WEBHOOK_SECRET) {
    console.log(`   Secret value: ${process.env.STRIPE_WEBHOOK_SECRET}`)
  }
}

checkWebhookLogs().catch(console.error)
