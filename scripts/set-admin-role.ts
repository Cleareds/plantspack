import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const ADMIN_EMAIL = 'anton.kravchuk@cleareds.com'

async function setAdminRole() {
  const supabase = createAdminClient()

  console.log('Setting admin role...\n')

  try {
    // Find the admin user
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, username, role')
      .eq('email', ADMIN_EMAIL)
      .single()

    if (findError || !user) {
      console.error(`Admin user not found: ${ADMIN_EMAIL}`)
      process.exit(1)
    }

    console.log(`Found user: ${user.username} (${user.email})`)
    console.log(`Current role: ${user.role || 'null'}`)

    // Update role to admin
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating role:', updateError)
      process.exit(1)
    }

    console.log('✅ Admin role set successfully!')
    console.log(`Email: ${ADMIN_EMAIL}`)
    console.log('Role: admin')
    console.log('\nYou can now access /admin')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

setAdminRole()
