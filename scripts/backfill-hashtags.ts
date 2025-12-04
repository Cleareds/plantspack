/**
 * Hashtag Backfill Script
 * Extracts hashtags from existing posts and creates the necessary links
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

// Hashtag extraction regex (same as in lib/hashtags.ts)
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
      console.error('Error creating hashtags:', error)
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
    .select()

  if (error) {
    // Check if error is due to duplicate key constraint
    if (error.code === '23505') {
      console.log(`   ℹ️  Some hashtags already linked to post ${postId}`)
    } else {
      console.error(`   ❌ Error linking hashtags to post ${postId}:`, error)
    }
  }
}

async function backfillHashtags(dryRun: boolean = false) {
  console.log('🔄 Starting Hashtag Backfill...')
  console.log('Mode:', dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify database)')
  console.log('=' .repeat(60))

  try {
    // Get all posts with hashtags in content
    console.log('\n📥 Fetching posts with hashtags...')

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, content, created_at')
      .is('deleted_at', null)
      .like('content', '%#%')
      .order('created_at', { ascending: false })

    if (postsError) {
      console.error('❌ Error fetching posts:', postsError)
      process.exit(1)
    }

    if (!posts || posts.length === 0) {
      console.log('✨ No posts found with hashtags in content')
      return
    }

    console.log(`Found ${posts.length} posts with hashtags in content`)

    let processedCount = 0
    let skippedCount = 0
    let errorCount = 0
    let totalHashtagsCreated = 0
    let totalLinksCreated = 0

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]
      const progress = `[${i + 1}/${posts.length}]`

      // Extract hashtags
      const hashtags = extractHashtags(post.content)

      if (hashtags.length === 0) {
        console.log(`${progress} ⚪ Post ${post.id}: No valid hashtags found`)
        skippedCount++
        continue
      }

      // Check if already linked
      const { data: existingLinks } = await supabase
        .from('post_hashtags')
        .select('id')
        .eq('post_id', post.id)

      if (existingLinks && existingLinks.length > 0) {
        console.log(`${progress} ⏭️  Post ${post.id}: Already has ${existingLinks.length} hashtag links (skipping)`)
        skippedCount++
        continue
      }

      console.log(`${progress} 🔖 Post ${post.id}:`)
      console.log(`   Created: ${new Date(post.created_at).toLocaleString()}`)
      console.log(`   Hashtags: ${hashtags.map(t => '#' + t).join(', ')}`)

      if (!dryRun) {
        try {
          // Get or create hashtags
          const hashtagMap = await getOrCreateHashtags(hashtags)
          const hashtagIds = Array.from(hashtagMap.values())

          const newHashtags = hashtags.filter(t => !hashtagMap.has(t))
          if (newHashtags.length > 0) {
            console.log(`   ✨ Created ${newHashtags.length} new hashtags`)
            totalHashtagsCreated += newHashtags.length
          }

          // Link hashtags to post
          await linkHashtagsToPost(post.id, hashtagIds)
          console.log(`   ✅ Linked ${hashtagIds.length} hashtags to post`)

          totalLinksCreated += hashtagIds.length
          processedCount++
        } catch (err) {
          console.error(`   ❌ Error processing post:`, err)
          errorCount++
        }
      } else {
        console.log(`   🔍 Would create/link ${hashtags.length} hashtags`)
        processedCount++
      }

      // Add a small delay to avoid rate limiting
      if (i < posts.length - 1 && !dryRun) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 BACKFILL SUMMARY')
    console.log('-'.repeat(60))
    console.log(`Total posts checked: ${posts.length}`)
    console.log(`Posts processed: ${processedCount}`)
    console.log(`Posts skipped (already linked): ${skippedCount}`)
    console.log(`Errors: ${errorCount}`)

    if (!dryRun) {
      console.log(`New hashtags created: ${totalHashtagsCreated}`)
      console.log(`Total links created: ${totalLinksCreated}`)
    }

    console.log('=' .repeat(60))

    if (dryRun) {
      console.log('\n💡 This was a DRY RUN. Run without --dry-run to apply changes.')
    } else {
      console.log('\n✅ Backfill complete!')
    }

  } catch (error) {
    console.error('❌ Fatal error during backfill:', error)
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

if (dryRun) {
  console.log('🔍 Running in DRY RUN mode - no changes will be made\n')
}

backfillHashtags(dryRun)
