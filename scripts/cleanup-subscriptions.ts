import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const email = 'ak.papasoft@gmail.com'

async function cleanupSubscriptions() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    return
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil',
  })

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('🔍 COMPREHENSIVE SUBSCRIPTION INVESTIGATION\n')
  console.log('━'.repeat(60))
  console.log(`User: ${email}\n`)

  // 1. Get user from database
  console.log('1️⃣ DATABASE - User Information:')
  const { data: user, error: userError } = await adminClient
    .from('users')
    .select('id, username, email, subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id, subscription_ends_at')
    .eq('email', email)
    .single()

  if (userError || !user) {
    console.error('❌ User not found in database')
    return
  }

  console.log(`   User ID: ${user.id}`)
  console.log(`   Username: ${user.username}`)
  console.log(`   Database Tier: ${user.subscription_tier}`)
  console.log(`   Database Status: ${user.subscription_status}`)
  console.log(`   Stripe Customer ID: ${user.stripe_customer_id || 'Not set'}`)
  console.log(`   Stripe Subscription ID: ${user.stripe_subscription_id || 'Not set'}`)
  console.log(`   Subscription Ends: ${user.subscription_ends_at || 'Not set'}`)
  console.log('')

  // 2. Get all Stripe customers for this email
  console.log('2️⃣ STRIPE - Customer Accounts:')
  const customers = await stripe.customers.list({
    email: email,
    limit: 100,
  })

  console.log(`   Found ${customers.data.length} customer account(s):\n`)

  const allSubscriptions: Array<{
    subscription: Stripe.Subscription
    customerId: string
    customerEmail: string
  }> = []

  for (const customer of customers.data) {
    console.log(`   Customer: ${customer.id}`)
    console.log(`   Email: ${customer.email}`)
    console.log(`   Created: ${new Date(customer.created * 1000).toLocaleString()}`)

    // Get subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 100,
    })

    console.log(`   Subscriptions: ${subscriptions.data.length}`)

    for (const sub of subscriptions.data) {
      allSubscriptions.push({
        subscription: sub,
        customerId: customer.id,
        customerEmail: customer.email || '',
      })

      const priceId = sub.items.data[0]?.price?.id
      const tier = priceId === process.env.STRIPE_PREMIUM_PRICE_ID ? 'Premium' :
                   priceId === process.env.STRIPE_MEDIUM_PRICE_ID ? 'Supporter' : 'Unknown'

      console.log(`     - ${sub.id}`)
      console.log(`       Status: ${sub.status}`)
      console.log(`       Tier: ${tier}`)
      console.log(`       Price: ${priceId}`)
      console.log(`       Created: ${new Date(sub.created * 1000).toLocaleString()}`)
      console.log(`       Period End: ${new Date(sub.current_period_end * 1000).toLocaleString()}`)
      console.log(`       Metadata: ${JSON.stringify(sub.metadata)}`)
    }
    console.log('')
  }

  console.log('━'.repeat(60))
  console.log(`\n3️⃣ ANALYSIS:`)
  console.log(`   Total subscriptions found: ${allSubscriptions.length}`)

  const activeSubscriptions = allSubscriptions.filter(s => s.subscription.status === 'active')
  const inactiveSubscriptions = allSubscriptions.filter(s => s.subscription.status !== 'active')

  console.log(`   Active subscriptions: ${activeSubscriptions.length}`)
  console.log(`   Inactive subscriptions: ${inactiveSubscriptions.length}`)

  if (activeSubscriptions.length === 0) {
    console.log('\n⚠️  No active subscriptions found!')
    console.log('   User should be on Free tier')
    return
  }

  if (activeSubscriptions.length > 1) {
    console.log(`\n⚠️  PROBLEM: Multiple active subscriptions detected!`)
    console.log(`   This causes issues - only ONE subscription should be active\n`)

    // Sort by creation date (newest first)
    activeSubscriptions.sort((a, b) => b.subscription.created - a.subscription.created)

    console.log('   Subscriptions sorted by creation date (newest first):')
    activeSubscriptions.forEach((s, index) => {
      const priceId = s.subscription.items.data[0]?.price?.id
      const tier = priceId === process.env.STRIPE_PREMIUM_PRICE_ID ? 'Premium' :
                   priceId === process.env.STRIPE_MEDIUM_PRICE_ID ? 'Supporter' : 'Unknown'

      console.log(`   ${index + 1}. ${s.subscription.id}`)
      console.log(`      Created: ${new Date(s.subscription.created * 1000).toLocaleString()}`)
      console.log(`      Tier: ${tier}`)
      console.log(`      Customer: ${s.customerId}`)
    })

    console.log(`\n   ✅ KEEPING: ${activeSubscriptions[0].subscription.id} (newest)`)
    console.log(`   ❌ CANCELING: ${activeSubscriptions.length - 1} older subscription(s)\n`)

    // Cancel all but the newest
    for (let i = 1; i < activeSubscriptions.length; i++) {
      const subToCancel = activeSubscriptions[i]
      console.log(`   Canceling ${subToCancel.subscription.id}...`)

      try {
        await stripe.subscriptions.cancel(subToCancel.subscription.id)
        console.log(`   ✅ Canceled ${subToCancel.subscription.id}`)
      } catch (error) {
        console.error(`   ❌ Error canceling ${subToCancel.subscription.id}:`, error)
      }
    }
  }

  // Get the current subscription (newest active)
  const currentSubscription = activeSubscriptions[0]
  const priceId = currentSubscription.subscription.items.data[0]?.price?.id
  const tier = priceId === process.env.STRIPE_PREMIUM_PRICE_ID ? 'premium' :
               priceId === process.env.STRIPE_MEDIUM_PRICE_ID ? 'medium' : 'free'

  console.log(`\n4️⃣ CURRENT SUBSCRIPTION:`)
  console.log(`   Subscription ID: ${currentSubscription.subscription.id}`)
  console.log(`   Customer ID: ${currentSubscription.customerId}`)
  console.log(`   Tier: ${tier}`)
  console.log(`   Status: ${currentSubscription.subscription.status}`)
  console.log(`   Period End: ${new Date(currentSubscription.subscription.current_period_end * 1000).toLocaleString()}`)

  // Update database to match
  console.log(`\n5️⃣ SYNCING DATABASE:`)
  console.log(`   Current database tier: ${user.subscription_tier}`)
  console.log(`   Should be: ${tier}`)

  if (user.subscription_tier !== tier || user.stripe_subscription_id !== currentSubscription.subscription.id) {
    console.log(`   ⚠️  Database is out of sync! Updating...\n`)

    // Handle period_end safely
    let periodEnd: string | null = null
    if (currentSubscription.subscription.current_period_end) {
      try {
        periodEnd = new Date(currentSubscription.subscription.current_period_end * 1000).toISOString()
      } catch (e) {
        console.warn(`   ⚠️  Invalid period_end, using 30 days from now`)
        periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    }

    const { error: updateError } = await adminClient
      .from('users')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        stripe_customer_id: currentSubscription.customerId,
        stripe_subscription_id: currentSubscription.subscription.id,
        subscription_ends_at: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('   ❌ Error updating database:', updateError)
    } else {
      console.log('   ✅ Database updated successfully!')
    }
  } else {
    console.log('   ✅ Database is already in sync')
  }

  console.log(`\n━`.repeat(60))
  console.log('\n✅ CLEANUP COMPLETE!')
  console.log(`\nFinal State:`)
  console.log(`   - Active Subscriptions: 1`)
  console.log(`   - Tier: ${tier}`)
  console.log(`   - Subscription ID: ${currentSubscription.subscription.id}`)
  console.log(`   - Customer ID: ${currentSubscription.customerId}`)
  console.log(`\nRefresh your browser to see the updated subscription!`)
}

cleanupSubscriptions().catch(console.error)
