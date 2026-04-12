import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const emailToDelete = 'ak.papasoft@gmail.com'

async function deleteUserCompletely() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables')
    process.exit(1)
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log(`\nDeleting user: ${emailToDelete}`)

  // Find user in users table
  const { data: userProfile } = await adminClient
    .from('users')
    .select('id, username')
    .eq('email', emailToDelete)
    .maybeSingle()

  if (!userProfile) {
    console.log(`❌ No profile found for ${emailToDelete}`)
    return
  }

  console.log(`Found user: ${userProfile.username} (ID: ${userProfile.id})`)

  const userId = userProfile.id

  // Delete all related data in order (respecting foreign key constraints)

  // 1. Delete comment reactions
  const { error: commentReactionsError } = await adminClient
    .from('comment_reactions')
    .delete()
    .eq('user_id', userId)

  if (commentReactionsError) {
    console.error('Error deleting comment reactions:', commentReactionsError)
  } else {
    console.log('✅ Deleted comment reactions')
  }

  // 2. Delete post reactions
  const { error: postReactionsError } = await adminClient
    .from('post_reactions')
    .delete()
    .eq('user_id', userId)

  if (postReactionsError) {
    console.error('Error deleting post reactions:', postReactionsError)
  } else {
    console.log('✅ Deleted post reactions')
  }

  // 3. Delete post likes
  const { error: postLikesError } = await adminClient
    .from('post_likes')
    .delete()
    .eq('user_id', userId)

  if (postLikesError) {
    console.error('Error deleting post likes:', postLikesError)
  } else {
    console.log('✅ Deleted post likes')
  }

  // 4. Delete comments
  const { error: commentsError } = await adminClient
    .from('comments')
    .delete()
    .eq('user_id', userId)

  if (commentsError) {
    console.error('Error deleting comments:', commentsError)
  } else {
    console.log('✅ Deleted comments')
  }

  // 5. Delete post mentions
  const { error: postMentionsError } = await adminClient
    .from('post_mentions')
    .delete()
    .eq('user_id', userId)

  if (postMentionsError) {
    console.error('Error deleting post mentions:', postMentionsError)
  } else {
    console.log('✅ Deleted post mentions')
  }

  // 6. Delete post hashtags (for posts owned by user)
  const { data: userPosts } = await adminClient
    .from('posts')
    .select('id')
    .eq('user_id', userId)

  if (userPosts && userPosts.length > 0) {
    const postIds = userPosts.map(p => p.id)

    const { error: postHashtagsError } = await adminClient
      .from('post_hashtags')
      .delete()
      .in('post_id', postIds)

    if (postHashtagsError) {
      console.error('Error deleting post hashtags:', postHashtagsError)
    } else {
      console.log('✅ Deleted post hashtags')
    }
  }

  // 7. Delete posts
  const { error: postsError } = await adminClient
    .from('posts')
    .delete()
    .eq('user_id', userId)

  if (postsError) {
    console.error('Error deleting posts:', postsError)
  } else {
    console.log('✅ Deleted posts')
  }

  // 8. Delete follows (both following and followers)
  const { error: followsError1 } = await adminClient
    .from('follows')
    .delete()
    .eq('follower_id', userId)

  const { error: followsError2 } = await adminClient
    .from('follows')
    .delete()
    .eq('following_id', userId)

  if (followsError1 || followsError2) {
    console.error('Error deleting follows:', followsError1 || followsError2)
  } else {
    console.log('✅ Deleted follows')
  }

  // 9. Delete favorite places
  const { error: favoritePlacesError } = await adminClient
    .from('favorite_places')
    .delete()
    .eq('user_id', userId)

  if (favoritePlacesError) {
    console.error('Error deleting favorite places:', favoritePlacesError)
  } else {
    console.log('✅ Deleted favorite places')
  }

  // 10. Delete from users table
  const { error: profileDeleteError } = await adminClient
    .from('users')
    .delete()
    .eq('id', userId)

  if (profileDeleteError) {
    console.error('❌ Failed to delete profile:', profileDeleteError)
    return
  }

  console.log('✅ Deleted profile from users table')

  // 11. Delete from auth.users
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)

  if (authDeleteError) {
    console.error('❌ Failed to delete auth user:', authDeleteError)
    return
  }

  console.log('✅ Deleted from auth system')
  console.log(`\n✅ User ${emailToDelete} and all associated data completely removed`)
}

deleteUserCompletely().catch(console.error)
