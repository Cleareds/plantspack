#!/usr/bin/env tsx
/**
 * Script to secure E2E test users - prevent them from being used in production
 *
 * Options:
 * 1. Delete test users from production (recommended)
 * 2. Flag them as test accounts and restrict access
 *
 * Run with: npx tsx scripts/secure-test-users.ts [delete|flag]
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const TEST_USER_EMAILS = [
  'e2e.test@plantspack.com',
  'e2e.free@plantspack.com',
  'e2e.supporter@plantspack.com',
  'e2e.premium@plantspack.com',
]

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function deleteTestUsers() {
  console.log('Deleting E2E test users from production...\n')

  for (const email of TEST_USER_EMAILS) {
    try {
      // Get user by email
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users?.users.find(u => u.email === email)

      if (user) {
        // Delete user
        const { error } = await supabase.auth.admin.deleteUser(user.id)

        if (error) {
          console.log(`❌ Failed to delete ${email}:`, error.message)
        } else {
          console.log(`✓ Deleted: ${email}`)
        }
      } else {
        console.log(`⊘ Not found: ${email}`)
      }
    } catch (error: any) {
      console.error(`Error processing ${email}:`, error.message)
    }
  }

  console.log('\n✅ Test users have been removed from production!')
  console.log('\nRecommendation:')
  console.log('- Use test users only in local development or staging environments')
  console.log('- For E2E tests against production, create a separate staging database')
  console.log('- Or use environment-specific credentials that are not committed to the repo')
}

async function flagTestUsers() {
  console.log('Flagging E2E test users as test accounts...\n')

  for (const email of TEST_USER_EMAILS) {
    try {
      // Get user by email
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users?.users.find(u => u.email === email)

      if (user) {
        // Update user metadata to flag as test account
        const { error } = await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            is_test_account: true,
            test_only: true,
          }
        })

        if (error) {
          console.log(`❌ Failed to flag ${email}:`, error.message)
        } else {
          console.log(`✓ Flagged: ${email}`)

          // Also update the users table
          await supabase
            .from('users')
            .update({
              bio: '[E2E TEST ACCOUNT]',
            })
            .eq('id', user.id)
        }
      } else {
        console.log(`⊘ Not found: ${email}`)
      }
    } catch (error: any) {
      console.error(`Error processing ${email}:`, error.message)
    }
  }

  console.log('\n✅ Test users have been flagged!')
  console.log('\nNote: You should implement middleware to block test accounts in production:')
  console.log('- Check user_metadata.is_test_account in auth callbacks')
  console.log('- Return 403 error if test account tries to use production')
  console.log('- Or only allow test accounts when NODE_ENV !== "production"')
}

async function listTestUsers() {
  console.log('Checking for E2E test users...\n')

  const { data: users } = await supabase.auth.admin.listUsers()

  const testUsers = users?.users.filter(u =>
    TEST_USER_EMAILS.includes(u.email || '')
  )

  if (testUsers && testUsers.length > 0) {
    console.log(`Found ${testUsers.length} test user(s):\n`)
    testUsers.forEach(u => {
      console.log(`- ${u.email} (ID: ${u.id})`)
    })
  } else {
    console.log('No test users found in production.')
  }

  return testUsers
}

async function main() {
  const action = process.argv[2]

  if (!action || action === 'list') {
    await listTestUsers()
  } else if (action === 'delete') {
    const users = await listTestUsers()
    if (users && users.length > 0) {
      console.log('\n⚠️  WARNING: This will permanently delete these users!')
      console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n')
      await new Promise(resolve => setTimeout(resolve, 3000))
      await deleteTestUsers()
    }
  } else if (action === 'flag') {
    await flagTestUsers()
  } else {
    console.log('Usage: npx tsx scripts/secure-test-users.ts [list|delete|flag]')
    console.log('\nOptions:')
    console.log('  list   - List test users (default)')
    console.log('  delete - Delete test users from production')
    console.log('  flag   - Flag test users as test accounts')
  }
}

main()
