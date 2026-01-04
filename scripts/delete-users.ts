import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const emailsToDelete = [
  'anton.kravchuk@vaimo.com',
  'anton.kravchuk23@gmail.com'
]

async function deleteUsers() {
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

  for (const email of emailsToDelete) {
    console.log(`\nProcessing: ${email}`)

    // Find user in users table
    const { data: userProfile } = await adminClient
      .from('users')
      .select('id, username')
      .eq('email', email)
      .maybeSingle()

    if (!userProfile) {
      console.log(`  ❌ No profile found for ${email}`)
      continue
    }

    console.log(`  Found profile: ${userProfile.username} (ID: ${userProfile.id})`)

    // Delete from users table
    const { error: profileDeleteError } = await adminClient
      .from('users')
      .delete()
      .eq('id', userProfile.id)

    if (profileDeleteError) {
      console.error(`  ❌ Failed to delete profile:`, profileDeleteError)
      continue
    }

    console.log(`  ✅ Deleted profile from users table`)

    // Delete from auth.users
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
      userProfile.id
    )

    if (authDeleteError) {
      console.error(`  ❌ Failed to delete auth user:`, authDeleteError)
      continue
    }

    console.log(`  ✅ Deleted from auth system`)
    console.log(`  ✅ User ${email} completely removed`)
  }

  console.log('\n✅ Deletion complete')
}

deleteUsers().catch(console.error)
