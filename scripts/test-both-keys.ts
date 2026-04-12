/**
 * Test both anon and service role keys
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('🔑 Testing Supabase API Keys...\n')
console.log('URL:', supabaseUrl)
console.log('=' .repeat(60))

async function testKey(keyName: string, key: string) {
  console.log(`\n📝 Testing ${keyName}...`)
  console.log(`Key (first 30 chars): ${key.substring(0, 30)}...`)

  const supabase = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Test posts table
    const { data: posts, error: postsError, count } = await supabase
      .from('posts')
      .select('id, content, created_at, privacy', { count: 'exact' })
      .limit(5)

    if (postsError) {
      console.log(`❌ ${keyName} - Posts query failed:`, postsError.message)
      return false
    }

    console.log(`✅ ${keyName} - Posts query successful!`)
    console.log(`   Total posts: ${count}`)
    console.log(`   Returned: ${posts?.length || 0} posts`)

    if (posts && posts.length > 0) {
      const postsWithHashtags = posts.filter(p => p.content?.includes('#'))
      console.log(`   Posts with # in content: ${postsWithHashtags.length}`)

      if (postsWithHashtags.length > 0) {
        console.log('\n   Sample post with hashtag:')
        const sample = postsWithHashtags[0]
        console.log(`   - ID: ${sample.id}`)
        console.log(`   - Privacy: ${sample.privacy}`)
        console.log(`   - Content: ${sample.content?.substring(0, 80)}...`)

        // Extract hashtags
        const hashtagMatches = sample.content?.match(/#([a-zA-Z0-9_]{2,50})\b/g) || []
        console.log(`   - Hashtags found: ${hashtagMatches.join(', ')}`)
      }
    }

    return true
  } catch (error: any) {
    console.log(`❌ ${keyName} - Error:`, error.message)
    return false
  }
}

async function runTests() {
  const anonWorks = await testKey('ANON KEY', anonKey)
  const serviceWorks = await testKey('SERVICE ROLE KEY', serviceKey)

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESULTS:')
  console.log(`Anon Key: ${anonWorks ? '✅ Working' : '❌ Not working'}`)
  console.log(`Service Role Key: ${serviceWorks ? '✅ Working' : '❌ Not working'}`)

  if (anonWorks || serviceWorks) {
    console.log('\n✅ At least one key works! We can proceed with the backfill.')
  } else {
    console.log('\n❌ Neither key works. Please verify your Supabase credentials.')
    console.log('\nTo get your keys:')
    console.log('1. Go to: https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp')
    console.log('2. Navigate to Settings → API')
    console.log('3. Copy both the anon and service_role keys')
  }
}

runTests()
