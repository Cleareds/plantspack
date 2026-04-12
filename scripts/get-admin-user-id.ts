/**
 * Script to get admin user ID for business claim approvals
 * Run with: npx tsx scripts/get-admin-user-id.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getAdminUserId() {
  try {
    console.log('🔍 Looking for admin user...\n')

    // Try to find user with role='admin' first
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, username, email, first_name, last_name, role')
      .eq('role', 'admin')

    if (adminError) {
      console.error('❌ Error querying users:', adminError)
      return
    }

    if (adminUsers && adminUsers.length > 0) {
      console.log('✅ Found admin user(s):\n')
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.first_name} ${user.last_name} (@${user.username})`)
        console.log(`   Email: ${user.email}`)
        console.log(`   User ID: ${user.id}`)
        console.log('')
      })

      console.log('📋 To use in SQL, replace YOUR_ADMIN_USER_ID with one of the UUIDs above')
      console.log('   Example: reviewed_by = \'' + adminUsers[0].id + '\'')
      return
    }

    // If no admin role found, show all users and let user pick
    console.log('⚠️  No users with role="admin" found.')
    console.log('Showing all users (pick the one you want to use as admin):\n')

    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username, email, first_name, last_name')
      .order('created_at', { ascending: true })
      .limit(20)

    if (usersError) {
      console.error('❌ Error querying users:', usersError)
      return
    }

    if (allUsers && allUsers.length > 0) {
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.first_name || ''} ${user.last_name || ''} (@${user.username})`)
        console.log(`   Email: ${user.email}`)
        console.log(`   User ID: ${user.id}`)
        console.log('')
      })

      console.log('📋 Copy the User ID of the person who should approve business claims')
      console.log('   Then replace YOUR_ADMIN_USER_ID with that UUID in the SQL')
    } else {
      console.log('❌ No users found in database')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

getAdminUserId()
