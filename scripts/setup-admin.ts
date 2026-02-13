import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const ADMIN_EMAIL = 'anton.kravchuk@cleareds.com'
const ADMIN_PASSWORD = 'Blonska#1'
const ADMIN_USERNAME = 'admin'

async function setupAdmin() {
  const supabase = createAdminClient()

  console.log('Setting up admin user...\n')

  try {
    // Step 1: Delete all existing auth users
    console.log('Step 1: Deleting all existing users...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      throw listError
    }

    if (users && users.length > 0) {
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

    // Step 2: Clean up any remaining user profiles
    console.log('\nStep 2: Cleaning up user profiles...')
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log('User profiles cleaned')

    // Step 3: Create admin auth user
    console.log('\nStep 3: Creating admin auth user...')
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: ADMIN_USERNAME,
        first_name: 'Anton',
        last_name: 'Kravchuk',
      }
    })

    if (createError || !authData.user) {
      console.error('Error creating admin user:', createError)
      throw createError
    }

    console.log(`Admin auth user created: ${authData.user.id}`)

    // Step 4: Create admin profile
    console.log('\nStep 4: Creating admin profile...')
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: ADMIN_EMAIL,
        username: ADMIN_USERNAME,
        first_name: 'Anton',
        last_name: 'Kravchuk',
        bio: 'PlantsPack founder and admin. Originally from Ukraine, based in Belgium. Follow for platform updates and announcements.',
        subscription_tier: 'premium',
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error creating admin profile:', profileError)
      throw profileError
    }

    console.log('Admin profile created')

    console.log('\n✅ Admin setup complete!')
    console.log(`Email: ${ADMIN_EMAIL}`)
    console.log(`Username: ${ADMIN_USERNAME}`)
    console.log('Password: [hidden for security]')
    console.log('\nYou can now sign in with these credentials.')
  } catch (error) {
    console.error('❌ Error during admin setup:', error)
    process.exit(1)
  }
}

setupAdmin()
