#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function testReviewCreation() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('Testing review creation...\n')

  // Get a place ID
  const { data: places } = await supabase
    .from('places')
    .select('id, name')
    .limit(1)
    .single()

  if (!places) {
    console.log('No places found')
    return
  }

  console.log('Testing with place:', places.name, '(', places.id, ')\n')

  // Get a user ID
  const { data: users } = await supabase.auth.admin.listUsers()
  const testUser = users?.users[0]

  if (!testUser) {
    console.log('No users found')
    return
  }

  console.log('Testing with user:', testUser.email, '\n')

  // Try to create a review using service role
  const { data, error } = await supabase
    .from('place_reviews')
    .insert({
      place_id: places.id,
      user_id: testUser.id,
      rating: 5,
      content: 'Test review from script'
    })
    .select()
    .single()

  if (error) {
    console.log('❌ Error creating review:', error)
    console.log('\nError details:')
    console.log('  Code:', error.code)
    console.log('  Message:', error.message)
    console.log('  Details:', error.details)
    console.log('  Hint:', error.hint)
  } else {
    console.log('✓ Review created successfully!')
    console.log('  Review ID:', data.id)

    // Clean up
    await supabase
      .from('place_reviews')
      .delete()
      .eq('id', data.id)
    console.log('  (Cleaned up test review)')
  }
}

testReviewCreation()
