#!/usr/bin/env tsx
/**
 * Script to create the E2E test user in Supabase
 * Run with: npx tsx scripts/create-test-user.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface TestUser {
  email: string
  password: string
  username: string
  subscriptionTier: 'free' | 'medium' | 'premium'
}

const TEST_USERS: TestUser[] = [
  {
    email: 'e2e.free@plantspack.com',
    password: 'TestPassword123!',
    username: 'e2etest_free',
    subscriptionTier: 'free',
  },
  {
    email: 'e2e.supporter@plantspack.com',
    password: 'TestPassword123!',
    username: 'e2etest_supporter',
    subscriptionTier: 'medium',
  },
  {
    email: 'e2e.premium@plantspack.com',
    password: 'TestPassword123!',
    username: 'e2etest_premium',
    subscriptionTier: 'premium',
  },
]

async function createTestUser(testUser: TestUser) {
  console.log(`\nCreating ${testUser.subscriptionTier} tier test user...`)

  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error checking existing users:', listError)
      throw listError
    }

    const existingUser = existingUsers?.users.find((u) => u.email === testUser.email)

    if (existingUser) {
      console.log('✓ Test user already exists:', testUser.email)
      console.log('  User ID:', existingUser.id)
      console.log('  Tier:', testUser.subscriptionTier)
      return existingUser.id
    }

    // Create the user
    const { data, error } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        username: testUser.username,
      },
    })

    if (error) {
      console.error('Error creating user:', error)
      throw error
    }

    console.log('✓ Test user created successfully!')
    console.log('  Email:', testUser.email)
    console.log('  Password:', testUser.password)
    console.log('  User ID:', data.user?.id)

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: data.user?.id,
        email: testUser.email,
        username: testUser.username,
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      throw profileError
    }

    console.log('✓ User profile created successfully!')

    // Create subscription if not free tier
    if (testUser.subscriptionTier !== 'free') {
      const periodStart = new Date().toISOString()
      const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now

      const { error: subscriptionError } = await supabase.rpc('update_user_subscription', {
        target_user_id: data.user?.id,
        new_tier: testUser.subscriptionTier,
        new_status: 'active',
        stripe_sub_id: `test_sub_${testUser.subscriptionTier}_${Date.now()}`,
        stripe_cust_id: `test_cust_${testUser.username}`,
        period_start: periodStart,
        period_end: periodEnd,
      })

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError)
        throw subscriptionError
      }

      console.log(`✓ ${testUser.subscriptionTier} subscription created successfully!`)
    } else {
      console.log('✓ Free tier - no subscription needed')
    }

    return data.user?.id
  } catch (error) {
    console.error('Failed to create test user:', error)
    throw error
  }
}

async function createAllTestUsers() {
  console.log('Creating E2E test users with different subscription tiers...')
  console.log('=' .repeat(60))

  for (const testUser of TEST_USERS) {
    try {
      await createTestUser(testUser)
    } catch (error) {
      console.error(`Failed to create ${testUser.subscriptionTier} user:`, error)
      // Continue with other users
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Test user creation complete!')
  console.log('\nTest Users:')
  console.log('  Free:      e2e.free@plantspack.com')
  console.log('  Supporter: e2e.supporter@plantspack.com')
  console.log('  Premium:   e2e.premium@plantspack.com')
  console.log('  Password:  TestPassword123! (all users)')
}

createAllTestUsers()
