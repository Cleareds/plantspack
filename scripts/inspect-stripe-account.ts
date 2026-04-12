import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function inspectStripeAccount() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found')
    return
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil',
  })

  console.log('🔍 Inspecting Stripe Account...\n')

  // 1. Check for customers
  console.log('1️⃣ CUSTOMERS:')
  const customers = await stripe.customers.list({
    limit: 10,
    email: 'ak.papasoft@gmail.com'
  })

  if (customers.data.length === 0) {
    console.log('   ❌ No customers found for ak.papasoft@gmail.com')
  } else {
    customers.data.forEach(customer => {
      console.log(`   ✅ Customer: ${customer.id}`)
      console.log(`      Email: ${customer.email}`)
      console.log(`      Created: ${new Date(customer.created * 1000).toLocaleString()}`)
    })
  }

  // 2. Check for subscriptions
  console.log('\n2️⃣ SUBSCRIPTIONS:')
  const subscriptions = await stripe.subscriptions.list({ limit: 10 })

  if (subscriptions.data.length === 0) {
    console.log('   ❌ No subscriptions found')
  } else {
    subscriptions.data.forEach(sub => {
      console.log(`   ✅ Subscription: ${sub.id}`)
      console.log(`      Customer: ${sub.customer}`)
      console.log(`      Status: ${sub.status}`)
      console.log(`      Items: ${sub.items.data.map(i => i.price.id).join(', ')}`)
    })
  }

  // 3. Check for recent payments
  console.log('\n3️⃣ RECENT PAYMENTS:')
  const paymentIntents = await stripe.paymentIntents.list({ limit: 5 })

  if (paymentIntents.data.length === 0) {
    console.log('   ❌ No payment intents found')
  } else {
    paymentIntents.data.forEach(pi => {
      console.log(`   Payment: ${pi.id}`)
      console.log(`      Amount: $${(pi.amount / 100).toFixed(2)}`)
      console.log(`      Status: ${pi.status}`)
      console.log(`      Created: ${new Date(pi.created * 1000).toLocaleString()}`)
    })
  }

  // 4. Check for checkout sessions
  console.log('\n4️⃣ RECENT CHECKOUT SESSIONS:')
  const sessions = await stripe.checkout.sessions.list({ limit: 5 })

  if (sessions.data.length === 0) {
    console.log('   ❌ No checkout sessions found')
  } else {
    sessions.data.forEach(session => {
      console.log(`   Session: ${session.id}`)
      console.log(`      Status: ${session.status}`)
      console.log(`      Customer: ${session.customer || 'Not created'}`)
      console.log(`      Subscription: ${session.subscription || 'Not created'}`)
      console.log(`      Amount: $${session.amount_total ? (session.amount_total / 100).toFixed(2) : 'N/A'}`)
    })
  }

  // 5. Check webhooks
  console.log('\n5️⃣ WEBHOOK ENDPOINTS:')
  const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })

  if (webhooks.data.length === 0) {
    console.log('   ❌ No webhook endpoints configured!')
  } else {
    webhooks.data.forEach(webhook => {
      console.log(`   Endpoint: ${webhook.url}`)
      console.log(`      Status: ${webhook.status}`)
      console.log(`      Events: ${webhook.enabled_events.join(', ')}`)
      console.log(`      Secret: ${webhook.secret ? webhook.secret.substring(0, 20) + '...' : 'Not available'}`)
    })
  }
}

inspectStripeAccount().catch(console.error)
