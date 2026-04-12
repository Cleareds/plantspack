import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function manageSubscription() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/manage-subscription.ts <email> <tier>')
    console.log('Tiers: free, medium, premium')
    console.log('Example: npx tsx scripts/manage-subscription.ts user@example.com premium')
    process.exit(1)
  }

  const [email, tier] = args

  if (!['free', 'medium', 'premium'].includes(tier)) {
    console.error('Invalid tier. Must be: free, medium, or premium')
    process.exit(1)
  }

  const supabase = createAdminClient()

  try {
    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, username, email, subscription_tier')
      .eq('email', email)
      .single()

    if (findError || !user) {
      console.error(`User not found: ${email}`)
      process.exit(1)
    }

    console.log(`Found user: ${user.username} (${user.email})`)
    console.log(`Current tier: ${user.subscription_tier}`)
    console.log(`Updating to: ${tier}`)

    // Update subscription tier
    const { error: updateError } = await supabase
      .from('users')
      .update({ subscription_tier: tier })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      process.exit(1)
    }

    console.log('✅ Subscription updated successfully!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

manageSubscription()
