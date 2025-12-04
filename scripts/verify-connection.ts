/**
 * Verify Supabase connection and database schema
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('🔌 Verifying Supabase Connection...\n')
console.log('URL:', supabaseUrl)
console.log('Service Key (first 20 chars):', supabaseServiceKey.substring(0, 20) + '...')
console.log('=' .repeat(60))

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyConnection() {
  try {
    // Test basic connection with a simple query
    console.log('\n📊 Testing connection with direct SQL query...')

    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      })
      .then(() => ({ data: null, error: null }))
      .catch(() => ({ data: null, error: 'RPC not available' }))

    // Try alternative method - query posts directly
    console.log('\n📝 Querying posts table directly...')

    const { data: posts, error: postsError, count } = await supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .limit(5)

    if (postsError) {
      console.error('❌ Error querying posts:', postsError)
      console.error('Error details:', JSON.stringify(postsError, null, 2))

      // Check if it's a permission issue
      if (postsError.message?.includes('permission') || postsError.message?.includes('policy')) {
        console.log('\n⚠️  This appears to be an RLS policy issue.')
        console.log('The service role key should bypass RLS, but something is wrong.')
      }
    } else {
      console.log(`✅ Successfully queried posts table`)
      console.log(`Total count: ${count}`)
      console.log(`Returned ${posts?.length || 0} posts`)

      if (posts && posts.length > 0) {
        console.log('\nSample post:')
        console.log('- ID:', posts[0].id)
        console.log('- Content:', posts[0].content?.substring(0, 100))
        console.log('- Created:', posts[0].created_at)
        console.log('- Privacy:', posts[0].privacy)
      }
    }

    // Try to query users
    console.log('\n👥 Querying users table...')
    const { data: users, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .limit(1)

    if (usersError) {
      console.error('❌ Error querying users:', usersError)
    } else {
      console.log(`✅ Users table accessible (${usersCount} users)`)
    }

    // Try to query hashtags
    console.log('\n🏷️  Querying hashtags table...')
    const { data: hashtags, error: hashtagsError, count: hashtagsCount } = await supabase
      .from('hashtags')
      .select('*', { count: 'exact' })
      .limit(5)

    if (hashtagsError) {
      console.error('❌ Error querying hashtags:', hashtagsError)
    } else {
      console.log(`✅ Hashtags table accessible (${hashtagsCount} hashtags)`)
      if (hashtags && hashtags.length > 0) {
        console.log('Sample hashtags:', hashtags.map(h => '#' + h.tag).join(', '))
      }
    }

    // Try to query post_hashtags
    console.log('\n🔗 Querying post_hashtags table...')
    const { data: postHashtags, error: postHashtagsError, count: postHashtagsCount } = await supabase
      .from('post_hashtags')
      .select('*', { count: 'exact' })
      .limit(5)

    if (postHashtagsError) {
      console.error('❌ Error querying post_hashtags:', postHashtagsError)
    } else {
      console.log(`✅ Post_hashtags table accessible (${postHashtagsCount} links)`)
    }

    console.log('\n' + '='.repeat(60))

    // Summary
    if (!postsError && posts) {
      console.log('\n✅ CONNECTION SUCCESSFUL')
      console.log(`\nDatabase contains:`)
      console.log(`- ${count} posts`)
      console.log(`- ${usersCount} users`)
      console.log(`- ${hashtagsCount} hashtags`)
      console.log(`- ${postHashtagsCount} hashtag links`)

      // Check for posts with hashtags
      const postsWithHashtags = posts.filter(p => p.content && p.content.includes('#'))
      if (postsWithHashtags.length > 0) {
        console.log(`\n⚠️  Found ${postsWithHashtags.length} posts with # in content (out of ${posts.length} checked)`)
        console.log('These posts may need hashtag extraction!')
      }
    } else {
      console.log('\n❌ CONNECTION FAILED')
      console.log('Please check your credentials and try again.')
    }

  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

verifyConnection()
