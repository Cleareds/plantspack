/**
 * Check why myveganjourney posts aren't showing
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mfeelaqjbtnypoojhfjp.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZWVsYXFqYnRueXBvb2poZmpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzM5MTIyNCwiZXhwIjoyMDY4OTY3MjI0fQ.oyVwmdmgLVh_ELfBgVFQZjmzcImAVQw8tGe-jAE3SwU'

const supabase = createClient(supabaseUrl, serviceKey)

async function checkPosts() {
  console.log('🔍 Checking #myveganjourney posts...\n')

  // Get hashtag
  const { data: hashtag } = await supabase
    .from('hashtags')
    .select('id')
    .eq('normalized_tag', 'myveganjourney')
    .single()

  if (!hashtag) {
    console.log('Hashtag not found')
    return
  }

  // Get post IDs
  const { data: links } = await supabase
    .from('post_hashtags')
    .select('post_id')
    .eq('hashtag_id', hashtag.id)

  const postIds = links?.map(l => l.post_id) || []

  console.log(`Found ${postIds.length} posts linked to #myveganjourney\n`)

  // Check each post
  const { data: posts } = await supabase
    .from('posts')
    .select('id, privacy, deleted_at, content')
    .in('id', postIds)

  if (posts) {
    console.log('Post details:')
    posts.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.id}`)
      console.log(`   Privacy: ${p.privacy}`)
      console.log(`   Deleted: ${p.deleted_at ? 'Yes' : 'No'}`)
      console.log(`   Content: ${p.content?.substring(0, 60)}...`)
    })

    const publicCount = posts.filter(p => p.privacy === 'public' && !p.deleted_at).length
    const privateCount = posts.filter(p => p.privacy !== 'public').length
    const deletedCount = posts.filter(p => p.deleted_at).length

    console.log('\n' + '='.repeat(60))
    console.log(`Public posts: ${publicCount}`)
    console.log(`Private/friends posts: ${privateCount}`)
    console.log(`Deleted posts: ${deletedCount}`)
  }
}

checkPosts()
