#!/usr/bin/env node

/**
 * Fix authentication by creating auth users for existing profiles
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://localhost:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixAuthUsers() {
  console.log('🔧 Fixing authentication users...')

  try {
    // Get all existing users from public.users
    const { data: profiles, error: fetchError } = await supabase
      .from('users')
      .select('*')

    if (fetchError) {
      console.error('❌ Could not fetch profiles:', fetchError)
      return
    }

    console.log(`📋 Found ${profiles.length} profiles to fix`)

    // Create auth users for each profile
    for (const profile of profiles) {
      console.log(`\n👤 Processing: ${profile.email}`)
      
      try {
        const { error } = await supabase.auth.admin.createUser({
          email: profile.email,
          password: 'password123', // Default password for all test users
          email_confirm: true,
          user_metadata: {
            username: profile.username,
            first_name: profile.first_name,
            last_name: profile.last_name
          }
        })

        if (error && !error.message.includes('already registered')) {
          console.log(`⚠️  ${profile.email}: ${error.message}`)
        } else if (!error) {
          console.log(`✅ Created auth user: ${profile.email}`)
        } else {
          console.log(`ℹ️  User already exists: ${profile.email}`)
        }
      } catch (err) {
        console.log(`⚠️  ${profile.email}: ${err.message}`)
      }
    }

    console.log('\n🎉 Auth users fixed!')
    console.log('\n🔑 You can now login with:')
    console.log('Password: password123')
    console.log('\nUsers:')
    profiles.forEach(profile => {
      console.log(`- Email: ${profile.email}`)
      console.log(`- Username: ${profile.username}`)
    })

  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixAuthUsers()