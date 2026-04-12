#!/usr/bin/env node

/**
 * Debug specific user auth issues
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

async function debugUser() {
  console.log('🔍 Debugging papasoft user...')

  try {
    // Check profile in public.users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'papasoft')
      .single()

    if (profileError) {
      console.error('❌ Profile not found:', profileError)
      return
    }

    console.log('📋 Profile found:', {
      id: profile.id,
      email: profile.email,
      username: profile.username
    })

    // Check auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Could not list auth users:', authError)
      return
    }

    const authUser = authUsers.users.find(u => u.email === profile.email)
    
    if (!authUser) {
      console.log('❌ No auth user found for email:', profile.email)
      console.log('🔧 Creating auth user...')
      
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: profile.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name
        }
      })

      if (createError) {
        console.error('❌ Failed to create auth user:', createError)
        return
      }

      console.log('✅ Created auth user with ID:', newAuthUser.user.id)
      
      // Update profile to match auth user ID
      const { error: updateError } = await supabase
        .from('users')
        .update({ id: newAuthUser.user.id })
        .eq('username', 'papasoft')

      if (updateError) {
        console.error('❌ Failed to update profile ID:', updateError)
      } else {
        console.log('✅ Updated profile ID to match auth user')
      }
      
    } else {
      console.log('✅ Auth user found:', {
        id: authUser.id,
        email: authUser.email
      })
      
      if (authUser.id !== profile.id) {
        console.log('⚠️  ID mismatch!')
        console.log('Profile ID:', profile.id)
        console.log('Auth ID:', authUser.id)
        
        console.log('🔧 Fixing profile ID...')
        const { error: updateError } = await supabase
          .from('users')
          .update({ id: authUser.id })
          .eq('username', 'papasoft')

        if (updateError) {
          console.error('❌ Failed to update profile ID:', updateError)
        } else {
          console.log('✅ Fixed profile ID to match auth user')
        }
      } else {
        console.log('✅ IDs match - user should be able to login')
      }
    }

    console.log('\n🔑 Login credentials:')
    console.log('Email: ak.papasoft@gmail.com')
    console.log('Username: papasoft')
    console.log('Password: password123')

  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugUser()