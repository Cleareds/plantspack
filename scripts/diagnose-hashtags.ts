/**
 * Hashtag System Diagnostic Script
 * Checks the state of hashtags in the database
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runDiagnostics() {
  console.log('🔍 Running Hashtag System Diagnostics...\n')
  console.log('=' .repeat(60))

  try {
    // 1. Total hashtags
    const { count: hashtagCount } = await supabase
      .from('hashtags')
      .select('*', { count: 'exact', head: true })

    console.log('📊 BASIC STATISTICS')
    console.log('-'.repeat(60))
    console.log(`Total Hashtags: ${hashtagCount || 0}`)

    // 2. Total post_hashtags links
    const { count: linkCount } = await supabase
      .from('post_hashtags')
      .select('*', { count: 'exact', head: true })

    console.log(`Total Post-Hashtag Links: ${linkCount || 0}`)

    // 3. Posts with hashtags in content
    const { count: postsWithHashtagContent } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .like('content', '%#%')

    console.log(`Posts with # in content: ${postsWithHashtagContent || 0}`)

    // 4. Public posts
    const { count: publicPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('privacy', 'public')
      .is('deleted_at', null)

    console.log(`Total Public Posts: ${publicPosts || 0}`)

    // 5. Posts with linked hashtags
    const { data: postsWithLinks } = await supabase
      .from('post_hashtags')
      .select('post_id')

    const uniquePostsWithLinks = new Set(postsWithLinks?.map(l => l.post_id) || []).size
    console.log(`Posts with Hashtag Links: ${uniquePostsWithLinks}`)

    const potentialMissing = (postsWithHashtagContent || 0) - uniquePostsWithLinks
    console.log(`Posts Potentially Missing Links: ${potentialMissing}`)

    // 6. Top hashtags
    console.log('\n📈 TOP 20 HASHTAGS')
    console.log('-'.repeat(60))

    const { data: topHashtags } = await supabase
      .from('hashtags')
      .select('tag, usage_count, created_at')
      .order('usage_count', { ascending: false })
      .limit(20)

    if (topHashtags && topHashtags.length > 0) {
      topHashtags.forEach((h, i) => {
        console.log(`${i + 1}. #${h.tag} (${h.usage_count} uses)`)
      })
    } else {
      console.log('No hashtags found')
    }

    // 7. Posts missing links (sample)
    console.log('\n⚠️  POSTS WITH HASHTAGS BUT NO LINKS (Sample)')
    console.log('-'.repeat(60))

    const { data: postsWithHashtags } = await supabase
      .from('posts')
      .select('id, content, created_at')
      .is('deleted_at', null)
      .like('content', '%#%')
      .order('created_at', { ascending: false })
      .limit(50)

    let missingLinksCount = 0
    const missingLinksSample = []

    if (postsWithHashtags) {
      for (const post of postsWithHashtags) {
        const { data: links } = await supabase
          .from('post_hashtags')
          .select('id')
          .eq('post_id', post.id)

        if (!links || links.length === 0) {
          missingLinksCount++
          if (missingLinksSample.length < 10) {
            // Extract hashtags from content
            const hashtagMatches = post.content.match(/#([a-zA-Z0-9_]{2,50})\b/g) || []
            missingLinksSample.push({
              id: post.id,
              created_at: post.created_at,
              hashtags: hashtagMatches,
              preview: post.content.substring(0, 80)
            })
          }
        }
      }
    }

    console.log(`Found ${missingLinksCount} posts with hashtags but no links (out of ${postsWithHashtags?.length || 0} checked)`)

    if (missingLinksSample.length > 0) {
      console.log('\nSample posts missing links:')
      missingLinksSample.forEach((post, i) => {
        console.log(`\n${i + 1}. Post ID: ${post.id}`)
        console.log(`   Created: ${new Date(post.created_at).toLocaleString()}`)
        console.log(`   Hashtags found: ${post.hashtags.join(', ')}`)
        console.log(`   Preview: ${post.preview}...`)
      })
    }

    // 8. Recent posts check
    console.log('\n📅 RECENT POSTS (Last 10)')
    console.log('-'.repeat(60))

    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, content, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentPosts) {
      for (const post of recentPosts) {
        const { data: links } = await supabase
          .from('post_hashtags')
          .select('id')
          .eq('post_id', post.id)

        const hasHashtagContent = /#([a-zA-Z0-9_]{2,50})\b/.test(post.content)
        const hashtagMatches = post.content.match(/#([a-zA-Z0-9_]{2,50})\b/g) || []

        const status = hasHashtagContent
          ? (links && links.length > 0 ? '✅' : '❌')
          : '⚪'

        console.log(`${status} ${new Date(post.created_at).toLocaleString()}`)
        console.log(`   ID: ${post.id}`)
        if (hasHashtagContent) {
          console.log(`   Hashtags in content: ${hashtagMatches.join(', ')}`)
          console.log(`   Linked hashtags: ${links?.length || 0}`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Diagnostics Complete')

    if (missingLinksCount > 0) {
      console.log(`\n⚠️  ACTION NEEDED: ${missingLinksCount} posts need hashtag links`)
      console.log('Run the backfill script to fix these posts.')
    } else {
      console.log('\n✨ All posts with hashtags have proper links!')
    }

  } catch (error) {
    console.error('❌ Error running diagnostics:', error)
    process.exit(1)
  }
}

runDiagnostics()
