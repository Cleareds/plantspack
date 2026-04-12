import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function finalCleanup() {
  const supabase = createAdminClient()

  console.log('Running final cleanup...\n')

  try {
    // Delete any remaining orphaned user profiles
    const { data: orphanedUsers } = await supabase
      .from('users')
      .select('id, username, email')

    if (orphanedUsers && orphanedUsers.length > 0) {
      console.log(`Found ${orphanedUsers.length} orphaned user profile(s):`)
      orphanedUsers.forEach(u => console.log(`  - ${u.email || u.username} (${u.id})`))

      // Delete them
      const { error } = await supabase
        .from('users')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        console.error('Error deleting orphaned users:', error)
      } else {
        console.log('✅ Deleted all orphaned user profiles')
      }
    } else {
      console.log('No orphaned users found')
    }

    console.log('\n✅ Final cleanup complete!')
  } catch (error) {
    console.error('❌ Error during final cleanup:', error)
    process.exit(1)
  }
}

finalCleanup()
