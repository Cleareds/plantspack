import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const email = 'ak.papasoft@gmail.com'
const tier = 'medium' // supporter

async function activateSubscription() {
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

  console.log(`\nActivating ${tier} subscription for: ${email}`)

  // Find user
  const { data: user } = await adminClient
    .from('users')
    .select('id, username, subscription_tier, subscription_status')
    .eq('email', email)
    .single()

  if (!user) {
    console.error('❌ User not found')
    return
  }

  console.log(`\nCurrent status:`)
  console.log(`  Tier: ${user.subscription_tier || 'free'}`)
  console.log(`  Status: ${user.subscription_status || 'active'}`)

  // Update user subscription
  const { error: updateError } = await adminClient
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
      subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('❌ Failed to update subscription:', updateError)
    return
  }

  // Verify update
  const { data: updatedUser } = await adminClient
    .from('users')
    .select('subscription_tier, subscription_status, subscription_ends_at')
    .eq('id', user.id)
    .single()

  console.log(`\n✅ Subscription activated!`)
  console.log(`\nNew status:`)
  console.log(`  Tier: ${updatedUser?.subscription_tier}`)
  console.log(`  Status: ${updatedUser?.subscription_status}`)
  console.log(`  Ends: ${updatedUser?.subscription_ends_at}`)
}

activateSubscription().catch(console.error)
