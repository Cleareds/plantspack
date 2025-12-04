/**
 * Quick script to check if there are ANY posts in the database
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkPosts() {
  console.log('Checking all posts in database...\n')

  // Count ALL posts (including deleted, private, etc.)
  const { count: allPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })

  console.log(`Total posts (all statuses): ${allPosts || 0}`)

  // Count by privacy
  const { count: publicPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('privacy', 'public')

  console.log(`Public posts: ${publicPosts || 0}`)

  const { count: privatePosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('privacy', 'private')

  console.log(`Private posts: ${privatePosts || 0}`)

  // Count deleted
  const { count: deletedPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .not('deleted_at', 'is', null)

  console.log(`Deleted posts: ${deletedPosts || 0}`)

  // Get a sample of posts
  const { data: samplePosts } = await supabase
    .from('posts')
    .select('id, content, privacy, created_at, deleted_at')
    .limit(5)

  console.log('\nSample posts:')
  if (samplePosts && samplePosts.length > 0) {
    samplePosts.forEach((p, i) => {
      console.log(`${i + 1}. ${p.id} - ${p.privacy} - ${p.created_at}`)
      console.log(`   Content: ${p.content?.substring(0, 50)}...`)
      console.log(`   Deleted: ${p.deleted_at ? 'Yes' : 'No'}`)
    })
  } else {
    console.log('No posts found')
  }

  // Check if users exist
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  console.log(`\nTotal users: ${userCount || 0}`)
}

checkPosts()
