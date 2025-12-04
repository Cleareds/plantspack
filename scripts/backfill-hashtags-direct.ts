/**
 * Backfill hashtags with direct credentials
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mfeelaqjbtnypoojhfjp.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZWVsYXFqYnRueXBvb2poZmpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzM5MTIyNCwiZXhwIjoyMDY4OTY3MjI0fQ.oyVwmdmgLVh_ELfBgVFQZjmzcImAVQw8tGe-jAE3SwU'

const supabase = createClient(supabaseUrl, serviceKey)

const HASHTAG_REGEX = /#([a-zA-Z0-9_]{2,50})\b/g

function extractHashtags(text: string): string[] {
  const matches = text.matchAll(HASHTAG_REGEX)
  const hashtags = Array.from(matches, match => match[1].toLowerCase())
  return [...new Set(hashtags)] // Remove duplicates
}

async function getOrCreateHashtags(tags: string[]): Promise<Map<string, string>> {
  const tagMap = new Map<string, string>()

  if (tags.length === 0) return tagMap

  // Get existing hashtags
  const { data: existingHashtags } = await supabase
    .from('hashtags')
    .select('id, normalized_tag')
    .in('normalized_tag', tags)

  if (existingHashtags) {
    existingHashtags.forEach(h => tagMap.set(h.normalized_tag, h.id))
  }

  // Find tags that need to be created
  const newTags = tags.filter(tag => !tagMap.has(tag))

  if (newTags.length > 0) {
    console.log(`   Creating ${newTags.length} new hashtags: ${newTags.map(t => '#' + t).join(', ')}`)

    const newHashtagsData = newTags.map(tag => ({
      tag,
      normalized_tag: tag,
      usage_count: 0 // Will be updated by trigger
    }))

    const { data: created, error } = await supabase
      .from('hashtags')
      .insert(newHashtagsData)
      .select('id, normalized_tag')

    if (error) {
      console.error('   ❌ Error creating hashtags:', error)
    } else if (created) {
      created.forEach(h => tagMap.set(h.normalized_tag, h.id))
    }
  }

  return tagMap
}

async function linkHashtagsToPost(postId: string, hashtagIds: string[]) {
  if (hashtagIds.length === 0) return

  const insertData = hashtagIds.map(hashtagId => ({
    post_id: postId,
    hashtag_id: hashtagId
  }))

  const { error } = await supabase
    .from('post_hashtags')
    .insert(insertData)

  if (error) {
    // Check if error is due to duplicate key constraint
    if (error.code === '23505') {
      console.log(`   ℹ️  Some hashtags already linked`)
    } else {
      console.error(`   ❌ Error linking hashtags:`, error.message)
    }
  }
}

async function backfill(dryRun: boolean = false) {
  console.log('🔄 Hashtag Backfill Script')
  console.log('Mode:', dryRun ? '🔍 DRY RUN (preview only)' : '✅ LIVE (will modify database)')
  console.log('=' .repeat(60))

  try {
    // Get all posts with hashtags
    console.log('\n📥 Fetching posts...')

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, content, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (postsError) {
      console.error('❌ Error fetching posts:', postsError)
      return
    }

    if (!posts || posts.length === 0) {
      console.log('No posts found')
      return
    }

    console.log(`Found ${posts.length} posts`)

    let processed = 0
    let skipped = 0
    let errors = 0
    let totalHashtagsCreated = 0
    let totalLinksCreated = 0

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]
      const progress = `[${i + 1}/${posts.length}]`

      if (!post.content) {
        skipped++
        continue
      }

      // Extract hashtags
      const hashtags = extractHashtags(post.content)

      if (hashtags.length === 0) {
        skipped++
        continue
      }

      // Check if already linked
      const { data: existingLinks } = await supabase
        .from('post_hashtags')
        .select('id')
        .eq('post_id', post.id)

      if (existingLinks && existingLinks.length > 0) {
        console.log(`${progress} ⏭️  Post ${post.id}: Already has links (${existingLinks.length}) - skipping`)
        skipped++
        continue
      }

      console.log(`\n${progress} 🔖 Post ${post.id}`)
      console.log(`   Hashtags: ${hashtags.map(t => '#' + t).join(', ')}`)
      console.log(`   Content preview: ${post.content.substring(0, 60)}...`)

      if (!dryRun) {
        try {
          // Get or create hashtags
          const hashtagMap = await getOrCreateHashtags(hashtags)
          const hashtagIds = Array.from(hashtagMap.values())

          const newHashtags = hashtags.length - (hashtagIds.length - (hashtagIds.length - hashtags.length))
          if (newHashtags > 0) {
            totalHashtagsCreated += newHashtags
          }

          // Link hashtags to post
          await linkHashtagsToPost(post.id, hashtagIds)
          console.log(`   ✅ Linked ${hashtagIds.length} hashtags`)

          totalLinksCreated += hashtagIds.length
          processed++

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50))
        } catch (err: any) {
          console.error(`   ❌ Error:`, err.message)
          errors++
        }
      } else {
        console.log(`   🔍 Would link ${hashtags.length} hashtags`)
        processed++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 BACKFILL SUMMARY')
    console.log('-'.repeat(60))
    console.log(`Total posts checked: ${posts.length}`)
    console.log(`Posts processed: ${processed}`)
    console.log(`Posts skipped: ${skipped}`)
    console.log(`Errors: ${errors}`)

    if (!dryRun) {
      console.log(`New hashtags created: ${totalHashtagsCreated}`)
      console.log(`Total links created: ${totalLinksCreated}`)
      console.log('\n✅ Backfill complete!')
      console.log('\n🔍 Run diagnostics to verify:')
      console.log('   npx tsx scripts/full-diagnostic.ts')
    } else {
      console.log('\n💡 This was a DRY RUN.')
      console.log('Run without --dry-run to apply changes:')
      console.log('   npx tsx scripts/backfill-hashtags-direct.ts')
    }

    console.log('=' .repeat(60))

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
  }
}

// Parse args
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

backfill(dryRun)
