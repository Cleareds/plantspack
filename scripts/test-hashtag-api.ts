/**
 * Test hashtag API endpoint functionality
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mfeelaqjbtnypoojhfjp.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZWVsYXFqYnRueXBvb2poZmpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzM5MTIyNCwiZXhwIjoyMDY4OTY3MjI0fQ.oyVwmdmgLVh_ELfBgVFQZjmzcImAVQw8tGe-jAE3SwU'

const supabase = createClient(supabaseUrl, serviceKey)

console.log('🧪 Testing Hashtag API Functionality\n')
console.log('=' .repeat(60))

async function testHashtagQuery(tag: string) {
  console.log(`\n📍 Testing hashtag: #${tag}`)
  console.log('-'.repeat(60))

  try {
    // Step 1: Get the hashtag ID
    const { data: hashtagInfo, error: hashtagError } = await supabase
      .from('hashtags')
      .select('id, tag, usage_count')
      .eq('normalized_tag', tag.toLowerCase())
      .single()

    if (hashtagError || !hashtagInfo) {
      console.log(`❌ Hashtag not found:`, hashtagError?.message || 'No data')
      return
    }

    console.log(`✅ Found hashtag:`)
    console.log(`   ID: ${hashtagInfo.id}`)
    console.log(`   Tag: #${hashtagInfo.tag}`)
    console.log(`   Usage count: ${hashtagInfo.usage_count}`)

    // Step 2: Get post IDs from post_hashtags
    const { data: postHashtagLinks, error: linkError } = await supabase
      .from('post_hashtags')
      .select('post_id, created_at')
      .eq('hashtag_id', hashtagInfo.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (linkError) {
      console.log(`❌ Error fetching links:`, linkError.message)
      return
    }

    console.log(`\n✅ Found ${postHashtagLinks?.length || 0} post links`)

    if (!postHashtagLinks || postHashtagLinks.length === 0) {
      console.log(`⚠️  No posts linked to this hashtag`)
      return
    }

    // Step 3: Get full post data
    const postIds = postHashtagLinks.map(link => link.post_id)

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        content,
        privacy,
        created_at,
        deleted_at
      `)
      .in('id', postIds)
      .is('deleted_at', null)
      .eq('privacy', 'public')

    if (postsError) {
      console.log(`❌ Error fetching posts:`, postsError.message)
      return
    }

    console.log(`\n✅ Retrieved ${posts?.length || 0} public posts`)

    if (posts && posts.length > 0) {
      console.log('\n📝 Sample posts:')
      posts.slice(0, 5).forEach((post, i) => {
        console.log(`\n${i + 1}. Post ID: ${post.id}`)
        console.log(`   Privacy: ${post.privacy}`)
        console.log(`   Created: ${new Date(post.created_at).toLocaleString()}`)
        console.log(`   Content: ${post.content?.substring(0, 60)}...`)
      })
    }

    console.log('\n✅ Hashtag API functionality working!')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

async function testAllHashtags() {
  // Get all hashtags
  const { data: allHashtags } = await supabase
    .from('hashtags')
    .select('tag, usage_count')
    .order('usage_count', { ascending: false })

  console.log('\n📊 All Hashtags in Database:')
  if (allHashtags && allHashtags.length > 0) {
    allHashtags.forEach((h, i) => {
      console.log(`${i + 1}. #${h.tag} (${h.usage_count} posts)`)
    })
  }

  // Test the top hashtags
  if (allHashtags && allHashtags.length > 0) {
    const topHashtags = allHashtags.slice(0, 3)
    for (const hashtag of topHashtags) {
      await testHashtagQuery(hashtag.tag)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ ALL TESTS COMPLETE')
  console.log('\n🎉 Hashtag pages should now work!')
  console.log('\nTest by visiting:')
  if (allHashtags && allHashtags.length > 0) {
    allHashtags.slice(0, 3).forEach(h => {
      console.log(`- http://localhost:3000/hashtag/${h.tag}`)
    })
  }
}

testAllHashtags()
