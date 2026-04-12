import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function setAdminRole() {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.log('Usage: npx tsx scripts/set-admin-role.ts <email>')
    console.log('Example: npx tsx scripts/set-admin-role.ts admin@example.com')
    process.exit(1)
  }

  const email = args[0]
  const supabase = createAdminClient()

  console.log('Setting admin role...\n')

  try {
    // Find the user
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, username, role')
      .eq('email', email)
      .single()

    if (findError || !user) {
      console.error(`User not found: ${email}`)
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
    console.log(`Email: ${email}`)
    console.log('Role: admin')
    console.log('\nUser can now access /admin')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

setAdminRole()
