import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function cleanupDatabase() {
  const supabase = createAdminClient()

  console.log('Starting database cleanup...')

  try {
    // Step 1: Delete all reactions and interactions
    console.log('Deleting reactions...')
    await supabase.from('comment_reactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('post_reactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('place_review_reactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Step 2: Delete comments
    console.log('Deleting comments...')
    await supabase.from('comments').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Step 3: Delete pack-related data
    console.log('Deleting pack-related data...')
    await supabase.from('pack_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('pack_places').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('pack_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Step 4: Delete posts and media
    console.log('Deleting posts...')
    await supabase.from('post_media').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Step 5: Delete place-related data
    console.log('Deleting place-related data...')
    await supabase.from('place_reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('place_owners').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('place_claim_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('favorite_places').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('places').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Step 6: Delete packs
    console.log('Deleting packs...')
    await supabase.from('packs').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Step 7: Delete notifications
    console.log('Deleting notifications...')
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Step 8: Delete user subscriptions
    console.log('Deleting user subscriptions...')
    await supabase.from('user_subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Step 9: Get all auth users and delete them (this will cascade to users table)
    console.log('Deleting auth users...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
    } else if (users) {
      console.log(`Found ${users.length} users to delete`)
      for (const user of users) {
        const { error } = await supabase.auth.admin.deleteUser(user.id)
        if (error) {
          console.error(`Error deleting user ${user.id}:`, error)
        } else {
          console.log(`Deleted user: ${user.email}`)
        }
      }
    }

    // Step 10: Delete any remaining user profiles
    console.log('Deleting remaining user profiles...')
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    console.log('✅ Database cleanup completed successfully!')
    console.log('All user-generated content has been removed.')
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

cleanupDatabase()
