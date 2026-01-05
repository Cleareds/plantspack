import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function testDatabaseUpdate() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    return
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('🧪 TESTING DATABASE UPDATE (RPC FUNCTION)\n')
  console.log('━'.repeat(60))

  const userId = 'a7eaff5b-70ed-4ca8-b055-4566e2e8014d' // User email: ak.papasoft@gmail.com

  // Test 1: Get current user state
  console.log('1️⃣ Current User State:')
  const { data: beforeUser } = await adminClient
    .from('users')
    .select('subscription_tier, subscription_status, stripe_subscription_id')
    .eq('id', userId)
    .single()

  console.log(`   Tier: ${beforeUser?.subscription_tier}`)
  console.log(`   Status: ${beforeUser?.subscription_status}`)
  console.log(`   Subscription ID: ${beforeUser?.stripe_subscription_id}`)
  console.log('')

  // Test 2: Try to update using RPC function
  console.log('2️⃣ Testing RPC Function (update_user_subscription):')

  const testTier = beforeUser?.subscription_tier === 'premium' ? 'medium' : 'premium'
  console.log(`   Attempting to update tier: ${beforeUser?.subscription_tier} → ${testTier}`)

  const { data: rpcData, error: rpcError } = await adminClient.rpc('update_user_subscription', {
    target_user_id: userId,
    new_tier: testTier,
    new_status: 'active',
    stripe_sub_id: 'sub_1SmBv1AqP7U8Au3xeByytHo3',
    stripe_cust_id: 'cus_TjRjAXPSUCa8U4',
    period_start: new Date().toISOString(),
    period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  })

  if (rpcError) {
    console.log(`   ❌ RPC Error: ${rpcError.message}`)
    console.log(`   Error Code: ${rpcError.code}`)
    console.log(`   Error Details: ${JSON.stringify(rpcError.details)}`)
    console.log(`   Error Hint: ${rpcError.hint}`)

    // Test 3: Try direct table update as fallback
    console.log('\n3️⃣ Testing Direct Table Update (Fallback):')

    const { error: directError } = await adminClient
      .from('users')
      .update({
        subscription_tier: testTier,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (directError) {
      console.log(`   ❌ Direct Update Error: ${directError.message}`)
    } else {
      console.log(`   ✅ Direct update succeeded!`)
    }
  } else {
    console.log(`   ✅ RPC function succeeded!`)
    console.log(`   Response: ${JSON.stringify(rpcData)}`)
  }

  // Test 4: Check final state
  console.log('\n4️⃣ Final User State:')
  const { data: afterUser } = await adminClient
    .from('users')
    .select('subscription_tier, subscription_status, stripe_subscription_id')
    .eq('id', userId)
    .single()

  console.log(`   Tier: ${afterUser?.subscription_tier}`)
  console.log(`   Status: ${afterUser?.subscription_status}`)
  console.log(`   Subscription ID: ${afterUser?.stripe_subscription_id}`)

  if (afterUser?.subscription_tier === testTier) {
    console.log(`\n   ✅ Update successful! Tier changed to ${testTier}`)
  } else {
    console.log(`\n   ❌ Update failed! Tier still ${afterUser?.subscription_tier}`)
  }

  // Revert back to original tier
  console.log('\n5️⃣ Reverting to Original State:')
  const { error: revertError } = await adminClient.rpc('update_user_subscription', {
    target_user_id: userId,
    new_tier: beforeUser?.subscription_tier || 'medium',
    new_status: beforeUser?.subscription_status || 'active',
    stripe_sub_id: beforeUser?.stripe_subscription_id || null,
    stripe_cust_id: 'cus_TjRjAXPSUCa8U4',
    period_start: null,
    period_end: null
  })

  if (revertError) {
    console.log(`   ⚠️  Could not revert: ${revertError.message}`)
    console.log(`   Manually reverting with direct update...`)

    await adminClient
      .from('users')
      .update({
        subscription_tier: beforeUser?.subscription_tier,
        subscription_status: beforeUser?.subscription_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
  }

  console.log(`   ✅ Reverted to ${beforeUser?.subscription_tier}`)

  console.log('\n━'.repeat(60))
  console.log('\n✅ TEST COMPLETE!')
}

testDatabaseUpdate().catch(console.error)
