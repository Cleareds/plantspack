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

const TEST_USER_EMAIL = 'e2e.test@plantspack.com'
const TEST_USER_PASSWORD = 'TestPassword123!'
const TEST_USERNAME = 'e2etest'

async function createTestUser() {
  console.log('Creating E2E test user...')

  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error checking existing users:', listError)
      throw listError
    }

    const existingUser = existingUsers?.users.find((u) => u.email === TEST_USER_EMAIL)

    if (existingUser) {
      console.log('✓ Test user already exists:', TEST_USER_EMAIL)
      console.log('  User ID:', existingUser.id)
      return
    }

    // Create the user
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: TEST_USERNAME,
      },
    })

    if (error) {
      console.error('Error creating user:', error)
      throw error
    }

    console.log('✓ Test user created successfully!')
    console.log('  Email:', TEST_USER_EMAIL)
    console.log('  Password:', TEST_USER_PASSWORD)
    console.log('  User ID:', data.user?.id)

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: data.user?.id,
        email: TEST_USER_EMAIL,
        username: TEST_USERNAME,
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      throw profileError
    }

    console.log('✓ User profile created successfully!')
  } catch (error) {
    console.error('Failed to create test user:', error)
    process.exit(1)
  }
}

createTestUser()
