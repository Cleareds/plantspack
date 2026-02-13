import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function verifyCleanup() {
  const supabase = createAdminClient()

  console.log('Verifying database cleanup...\n')

  try {
    // Check users
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    console.log(`Users: ${usersCount}`)

    // Check posts
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
    console.log(`Posts: ${postsCount}`)

    // Check places
    const { count: placesCount } = await supabase
      .from('places')
      .select('*', { count: 'exact', head: true })
    console.log(`Places: ${placesCount}`)

    // Check packs
    const { count: packsCount } = await supabase
      .from('packs')
      .select('*', { count: 'exact', head: true })
    console.log(`Packs: ${packsCount}`)

    // Check comments
    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
    console.log(`Comments: ${commentsCount}`)

    // Check auth users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    console.log(`Auth users: ${users?.length || 0}`)

    console.log('\n✅ Verification complete!')

    if (usersCount === 0 && postsCount === 0 && placesCount === 0 && packsCount === 0 && commentsCount === 0 && (!users || users.length === 0)) {
      console.log('✨ Database is completely clean and ready for launch!')
    } else {
      console.log('⚠️  Some data still exists in the database')
    }
  } catch (error) {
    console.error('❌ Error during verification:', error)
    process.exit(1)
  }
}

verifyCleanup()
