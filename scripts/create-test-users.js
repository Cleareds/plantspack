#!/usr/bin/env node

/**
 * Create test users in Supabase Auth for local development
 * Run this AFTER starting the local Supabase instance
 */

const { createClient } = require('@supabase/supabase-js')
const { testUsers } = require('./test-users')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUsers() {
  console.log('👥 Creating test users in Supabase Auth...\n')

  const usersCreated = []
  const usersSkipped = []

  for (const user of testUsers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name
        }
      })
      
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          console.log(`ℹ️  User already exists: ${user.email}`)
          usersSkipped.push(user.email)
        } else {
          console.log(`❌ Error creating ${user.email}: ${error.message}`)
        }
      } else {
        console.log(`✅ Created user: ${user.email}`)
        usersCreated.push(user.email)
      }
    } catch (err) {
      console.log(`❌ Failed to create ${user.email}: ${err.message}`)
    }
  }

  console.log(`\n📊 Results:`)
  console.log(`✅ Created: ${usersCreated.length} users`)
  console.log(`ℹ️  Skipped: ${usersSkipped.length} users (already exist)`)

  if (usersCreated.length > 0 || usersSkipped.length > 0) {
    console.log('\n🎉 Test users are ready!')
    console.log('\nYou can now log in with any of these accounts:')
    console.log('┌─────────────────────────┬─────────────┬─────────────────┐')
    console.log('│ Email                   │ Password    │ Username        │')
    console.log('├─────────────────────────┼─────────────┼─────────────────┤')
    testUsers.forEach(user => {
      const status = usersCreated.includes(user.email) ? '✅' : 
                     usersSkipped.includes(user.email) ? 'ℹ️ ' : '❌'
      console.log(`│ ${user.email.padEnd(23)} │ password123 │ ${user.username.padEnd(15)} │ ${status}`)
    })
    console.log('└─────────────────────────┴─────────────┴─────────────────┘')
    
    console.log('\n🚀 Next steps:')
    console.log('1. Run: npm run db:populate-js  (to add posts and places)')
    console.log('2. Run: npm run dev  (to start the app)')
    console.log('3. Visit: http://localhost:3000')
  }
}

// Run the function
if (require.main === module) {
  createTestUsers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err)
      process.exit(1)
    })
}

module.exports = { createTestUsers }