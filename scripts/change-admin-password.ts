import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function changeAdminPassword() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/change-admin-password.ts <email> <new-password>')
    console.log('Example: npx tsx scripts/change-admin-password.ts admin@example.com newpass123')
    process.exit(1)
  }

  const [email, newPassword] = args

  const supabase = createAdminClient()

  try {
    // Find user by email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      process.exit(1)
    }

    const user = users?.find(u => u.email === email)

    if (!user) {
      console.error(`User not found: ${email}`)
      process.exit(1)
    }

    console.log(`Found user: ${user.email}`)
    console.log('Changing password...')

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      process.exit(1)
    }

    console.log('✅ Password updated successfully!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

changeAdminPassword()
