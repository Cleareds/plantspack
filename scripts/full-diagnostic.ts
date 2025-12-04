/**
 * Full diagnostic with working credentials
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mfeelaqjbtnypoojhfjp.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZWVsYXFqYnRueXBvb2poZmpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzM5MTIyNCwiZXhwIjoyMDY4OTY3MjI0fQ.oyVwmdmgLVh_ELfBgVFQZjmzcImAVQw8tGe-jAE3SwU'

const supabase = createClient(supabaseUrl, serviceKey)

const HASHTAG_REGEX = /#([a-zA-Z0-9_]{2,50})\b/g

console.log('🔍 Full Hashtag System Diagnostic\n')
console.log('=' .repeat(60))

async function runFullDiagnostic() {
  try {
    // Get all posts
    console.log('\n📊 Analyzing all posts...')

    const { data: allPosts, count: totalPosts } = await supabase
      .from('posts')
      .select('id, content, privacy, deleted_at, created_at', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    console.log(`Total active posts: ${totalPosts}`)

    if (!allPosts || allPosts.length === 0) {
      console.log('No posts found')
      return
    }

    // Analyze hashtags in content
    let postsWithHashtags = 0
    let totalHashtagsFound = 0
    const allHashtagsSet = new Set<string>()
    const postsNeedingLinks: any[] = []

    for (const post of allPosts) {
      if (!post.content) continue

      const matches = post.content.matchAll(HASHTAG_REGEX)
      const hashtags = Array.from(matches, match => match[1].toLowerCase())
      const uniqueHashtags = [...new Set(hashtags)]

      if (uniqueHashtags.length > 0) {
        postsWithHashtags++
        totalHashtagsFound += uniqueHashtags.length
        uniqueHashtags.forEach(tag => allHashtagsSet.add(tag))

        // Check if this post has hashtag links
        const { data: links } = await supabase
          .from('post_hashtags')
          .select('id')
          .eq('post_id', post.id)

        if (!links || links.length === 0) {
          postsNeedingLinks.push({
            id: post.id,
            hashtags: uniqueHashtags,
            content: post.content.substring(0, 80)
          })
        }
      }
    }

    console.log(`\nPosts with hashtags in content: ${postsWithHashtags}`)
    console.log(`Unique hashtags found: ${allHashtagsSet.size}`)
    console.log(`Total hashtag occurrences: ${totalHashtagsFound}`)

    // Check existing hashtags table
    const { count: existingHashtags } = await supabase
      .from('hashtags')
      .select('*', { count: 'exact', head: true })

    console.log(`\nExisting hashtags in DB: ${existingHashtags || 0}`)

    // Check existing links
    const { count: existingLinks } = await supabase
      .from('post_hashtags')
      .select('*', { count: 'exact', head: true })

    console.log(`Existing post-hashtag links: ${existingLinks || 0}`)

    console.log(`\n⚠️  Posts needing hashtag links: ${postsNeedingLinks.length}`)

    if (postsNeedingLinks.length > 0) {
      console.log('\n📋 Sample posts needing links (first 10):')
      postsNeedingLinks.slice(0, 10).forEach((post, i) => {
        console.log(`\n${i + 1}. Post ID: ${post.id}`)
        console.log(`   Hashtags: ${post.hashtags.map((t: string) => '#' + t).join(', ')}`)
        console.log(`   Content: ${post.content}...`)
      })
    }

    // Top hashtags
    const hashtagCounts = new Map<string, number>()
    for (const post of allPosts) {
      if (!post.content) continue
      const matches = post.content.matchAll(HASHTAG_REGEX)
      const hashtags = Array.from(matches, match => match[1].toLowerCase())
      hashtags.forEach(tag => {
        hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1)
      })
    }

    const sortedHashtags = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)

    console.log('\n📈 Top 20 Hashtags in Content:')
    sortedHashtags.forEach(([tag, count], i) => {
      console.log(`${i + 1}. #${tag} (${count} posts)`)
    })

    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('-'.repeat(60))
    console.log(`Total posts: ${totalPosts}`)
    console.log(`Posts with hashtags: ${postsWithHashtags}`)
    console.log(`Unique hashtags: ${allHashtagsSet.size}`)
    console.log(`Posts needing links: ${postsNeedingLinks.length}`)
    console.log(`Existing hashtag records: ${existingHashtags || 0}`)
    console.log(`Existing links: ${existingLinks || 0}`)

    if (postsNeedingLinks.length > 0) {
      console.log('\n✅ Ready to run backfill script!')
      console.log('Run: npx tsx scripts/backfill-hashtags-direct.ts')
    } else {
      console.log('\n✨ All posts already have hashtag links!')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

runFullDiagnostic()
