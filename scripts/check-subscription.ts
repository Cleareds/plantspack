import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const emailToCheck = 'ak.papasoft@gmail.com'

async function checkSubscription() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables')
    process.exit(1)
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log(`\nChecking subscription for: ${emailToCheck}`)

  // Find user
  const { data: userProfile, error: userError } = await adminClient
    .from('users')
    .select('id, username, email')
    .eq('email', emailToCheck)
    .maybeSingle()

  if (userError || !userProfile) {
    console.log(`❌ User not found: ${emailToCheck}`)
    return
  }

  console.log(`\nUser found:`)
  console.log(`  ID: ${userProfile.id}`)
  console.log(`  Username: ${userProfile.username}`)
  console.log(`  Email: ${userProfile.email}`)

  // Check for subscriptions
  const { data: subscriptions, error: subError } = await adminClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', userProfile.id)

  if (subError) {
    console.error('\n❌ Error fetching subscriptions:', subError)
    return
  }

  console.log(`\n📊 Subscriptions found: ${subscriptions?.length || 0}`)

  if (subscriptions && subscriptions.length > 0) {
    subscriptions.forEach((sub, index) => {
      console.log(`\nSubscription #${index + 1}:`)
      console.log(`  Stripe Subscription ID: ${sub.stripe_subscription_id}`)
      console.log(`  Status: ${sub.status}`)
      console.log(`  Tier: ${sub.tier}`)
      console.log(`  Current Period Start: ${sub.current_period_start}`)
      console.log(`  Current Period End: ${sub.current_period_end}`)
      console.log(`  Created: ${sub.created_at}`)
      console.log(`  Updated: ${sub.updated_at}`)
    })
  } else {
    console.log('\n⚠️ No subscriptions found in database')
  }

  // Check promotional subscriptions
  const { data: promoSubs, error: promoError } = await adminClient
    .from('promotional_subscriptions')
    .select('*')
    .eq('user_id', userProfile.id)

  if (!promoError && promoSubs && promoSubs.length > 0) {
    console.log(`\n🎁 Promotional subscriptions found: ${promoSubs.length}`)
    promoSubs.forEach((promo, index) => {
      console.log(`\nPromo #${index + 1}:`)
      console.log(`  Type: ${promo.promotional_type}`)
      console.log(`  Tier: ${promo.tier}`)
      console.log(`  Granted: ${promo.promotional_granted_at}`)
    })
  }
}

checkSubscription().catch(console.error)
