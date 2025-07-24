#!/usr/bin/env node

/**
 * Simple database setup that directly inserts data without complex mappings
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

async function setup() {
  console.log('🧪 Testing database connection...')
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) {
      console.log('❌ Database connection failed:', error.message)
      return
    }
    console.log('✅ Database connection successful')
    
    // Step 1: Create one test user in auth
    console.log('\n👤 Creating test user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User'
      }
    })
    
    if (authError && !authError.message.includes('already registered')) {
      console.log('⚠️  Auth user creation failed:', authError.message)
    } else {
      console.log('✅ Auth user created or exists')
    }
    
    // Step 2: Get the actual auth user ID
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.log('❌ Failed to list auth users:', listError.message)
      return
    }
    
    const testAuthUser = authUsers.users.find(u => u.email === 'test@example.com')
    if (!testAuthUser) {
      console.log('❌ Test auth user not found')
      return
    }
    
    console.log('✅ Found auth user with ID:', testAuthUser.id)
    
    // Step 3: Create profile in public.users table
    console.log('\n📝 Creating user profile...')
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: testAuthUser.id,
        email: 'test@example.com', 
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        bio: 'Test user for vegan social app'
      })
    
    if (profileError) {
      console.log('⚠️  Profile creation failed:', profileError.message)
    } else {
      console.log('✅ User profile created')
    }
    
    // Step 4: Create a test post
    console.log('\n📄 Creating test post...')
    const { error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: testAuthUser.id,
        content: 'This is a test post from the vegan social app! 🌱',
        privacy: 'public'
      })
    
    if (postError) {
      console.log('⚠️  Post creation failed:', postError.message)
    } else {
      console.log('✅ Test post created')
    }
    
    // Step 5: Create a test place
    console.log('\n📍 Creating test place...')
    const { error: placeError } = await supabase
      .from('places')
      .insert({
        name: 'Test Vegan Restaurant',
        description: 'A great test restaurant for vegans',
        category: 'restaurant',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Test Street, San Francisco, CA',
        created_by: testAuthUser.id
      })
    
    if (placeError) {
      console.log('⚠️  Place creation failed:', placeError.message)
    } else {
      console.log('✅ Test place created')
    }
    
    console.log('\n🎉 Simple setup complete!')
    console.log('\n🔑 Test Login Credentials:')
    console.log('Email: test@example.com')
    console.log('Password: password123')
    console.log('Username: testuser')
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  }
}

setup()