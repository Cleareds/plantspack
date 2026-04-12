import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const email = 'ak.papasoft@gmail.com'

async function syncSubscription() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const stripeKey = process.env.STRIPE_SECRET_KEY

  if (!supabaseUrl || !supabaseServiceKey || !stripeKey) {
    console.error('Missing environment variables')
    process.exit(1)
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-06-30.basil' })

  console.log(`\nSyncing Stripe subscription for: ${email}`)

  // Get user
  const { data: user } = await adminClient
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (!user) {
    console.error('❌ User not found')
    return
  }

  // Get latest subscription from Stripe
  const subscriptions = await stripe.subscriptions.list({
    limit: 1,
    status: 'active',
  })

  if (subscriptions.data.length === 0) {
    console.error('❌ No active subscriptions found in Stripe')
    return
  }

  const subscription = subscriptions.data[0]
  const priceId = subscription.items.data[0].price.id

  // Determine tier from price ID
  let tier: 'medium' | 'premium' = 'medium'
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
    tier = 'premium'
  } else if (priceId === process.env.STRIPE_MEDIUM_PRICE_ID) {
    tier = 'medium'
  }

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now if not set

  console.log(`\nStripe subscription found:`)
  console.log(`  Subscription ID: ${subscription.id}`)
  console.log(`  Customer ID: ${subscription.customer}`)
  console.log(`  Tier: ${tier}`)
  console.log(`  Status: ${subscription.status}`)
  console.log(`  Period end: ${periodEnd.toLocaleString()}`)

  // Update database
  const { error } = await adminClient
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      subscription_ends_at: periodEnd.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) {
    console.error('❌ Error updating database:', error)
    return
  }

  console.log('\n✅ Database updated successfully!')
  console.log(`   Tier: ${tier}`)
  console.log(`   Status: active`)
  console.log('   Refresh your browser to see the changes!')
}

syncSubscription().catch(console.error)
