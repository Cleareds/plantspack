import { createClient } from '@supabase/supabase-js'

// Supabase test client (you should use test database for this)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key for admin operations

export const testSupabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Clean up test data before/after tests
 */
export async function cleanupTestData() {
  try {
    // Delete test posts (posts created by test users)
    await testSupabase
      .from('posts')
      .delete()
      .like('content', '%test_post_%')

    // Delete test users (be careful with this in production!)
    await testSupabase
      .from('users')
      .delete()
      .like('email', '%plantspack.com')

    console.log('✅ Test data cleaned up successfully')
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error)
  }
}

/**
 * Create test posts for search functionality
 * This version is more robust and doesn't require creating users directly
 */
export async function createTestPosts() {
  try {
    // Get existing users from the database instead of creating new ones
    const { data: existingUsers } = await testSupabase
      .from('users')
      .select('*')
      .limit(2)

    if (!existingUsers || existingUsers.length === 0) {
      console.log('⚠️  No users found in database. Tests will need to create users through auth flow.')
      return { testUser1: null, testUser2: null }
    }

    const [testUser1, testUser2] = existingUsers

    // Create test posts for searching
    const testPosts = [
      {
        user_id: testUser1.id,
        content: 'test_post_vegan_recipe This is a delicious vegan pasta recipe',
        privacy: 'public'
      },
      {
        user_id: testUser1.id,
        content: 'test_post_plant_based Just tried an amazing plant-based burger',
        privacy: 'public'
      }
    ]

    // Add posts for second user if available
    if (testUser2) {
      testPosts.push(
        {
          user_id: testUser2.id,
          content: 'test_post_sustainability Love learning about sustainable farming',
          privacy: 'public'
        },
        {
          user_id: testUser2.id,
          content: 'test_post_friends_only This is a friends only post about my garden',
          privacy: 'friends'
        }
      )
    }

    for (const post of testPosts) {
      await testSupabase
        .from('posts')
        .upsert(post, { onConflict: 'content' })
    }

    console.log('✅ Test posts created successfully')
    return { testUser1, testUser2 }
  } catch (error) {
    console.error('❌ Error creating test posts:', error)
    // Don't throw error, just log it - tests can still run
    return { testUser1: null, testUser2: null }
  }
}

/**
 * Ensure a test user exists in the database
 */
async function ensureTestUser(userData: {
  email: string
  username: string
  firstName: string
  lastName: string
}) {
  // Check if user already exists
  const { data: existingUser } = await testSupabase
    .from('users')
    .select('*')
    .eq('email', userData.email)
    .single()

  if (existingUser) {
    return existingUser
  }

  // Generate a UUID for the test user
  const userId = crypto.randomUUID()
  
  // Create new test user
  const { data: newUser, error } = await testSupabase
    .from('users')
    .insert({
      id: userId,
      email: userData.email,
      username: userData.username,
      first_name: userData.firstName,
      last_name: userData.lastName,
      bio: 'Test user for automated testing',
      avatar_url: null,
      is_private: false
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error creating test user:', error)
    throw new Error(`Failed to create test user: ${error.message}`)
  }

  return newUser
}

/**
 * Get test posts for verification
 */
export async function getTestPosts() {
  const { data: posts, error } = await testSupabase
    .from('posts')
    .select(`
      *,
      users (
        id,
        username,
        first_name,
        last_name,
        avatar_url
      )
    `)
    .like('content', '%test_post_%')
    .eq('privacy', 'public')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get test posts: ${error.message}`)
  }

  return posts || []
}