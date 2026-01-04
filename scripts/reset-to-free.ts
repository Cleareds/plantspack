import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const email = 'ak.papasoft@gmail.com'

async function resetToFree() {
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

  console.log(`\nResetting to Free tier: ${email}`)

  const { data: user } = await adminClient
    .from('users')
    .select('id, subscription_tier')
    .eq('email', email)
    .single()

  if (!user) {
    console.error('❌ User not found')
    return
  }

  console.log(`Current tier: ${user.subscription_tier}`)

  // Reset to free tier and clear Stripe data
  const { error } = await adminClient
    .from('users')
    .update({
      subscription_tier: 'free',
      subscription_status: 'active',
      subscription_ends_at: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log('✅ Reset to Free tier!')
  console.log('\nYou can now test the full Stripe checkout flow:')
  console.log('1. Go to https://plantspack.com/support')
  console.log('2. Click "Upgrade to Supporter" or "Upgrade to Premium"')
  console.log('3. Complete checkout with test card: 4242 4242 4242 4242')
  console.log('4. Webhook will automatically activate your subscription')
  console.log('5. "Manage Subscription" will work with real Stripe subscription')
}

resetToFree().catch(console.error)
