import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const email = 'ak.papasoft@gmail.com'

async function updateToPremium() {
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

  console.log(`\nUpdating to Premium: ${email}`)

  const { data: user } = await adminClient
    .from('users')
    .select('id, subscription_tier')
    .eq('email', email)
    .single()

  if (!user) {
    console.error('❌ User not found')
    return
  }

  console.log(`Current tier: ${user.subscription_tier}`)

  const { error } = await adminClient
    .from('users')
    .update({
      subscription_tier: 'premium',
      subscription_status: 'active',
      subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log('✅ Updated to Premium!')
}

updateToPremium().catch(console.error)
