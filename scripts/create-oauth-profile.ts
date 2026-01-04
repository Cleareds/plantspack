import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

// User ID from the error logs
const userId = '805ec8b6-0c3d-4b10-a1b5-d3d10fe9d926'

async function createProfile() {
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

  // Check if profile exists
  const { data: existing } = await adminClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (existing) {
    console.log('Profile already exists:', existing)
    return
  }

  // Get user data from auth
  const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId)

  if (authError || !authUser) {
    console.error('Failed to get auth user:', authError)
    process.exit(1)
  }

  console.log('Auth user:', authUser.user)

  const userMetadata = authUser.user.user_metadata || {}
  const email = authUser.user.email || ''

  // Generate username
  const baseUsername = userMetadata.preferred_username ||
                      userMetadata.user_name ||
                      userMetadata.username ||
                      email.split('@')[0] ||
                      `user_${userId.slice(0, 8)}`

  // Check if username exists
  const { data: usernameCheck } = await adminClient
    .from('users')
    .select('username')
    .eq('username', baseUsername)
    .maybeSingle()

  const finalUsername = usernameCheck ? `${baseUsername}${Date.now()}` : baseUsername

  // Create profile
  const { data: newProfile, error: createError} = await adminClient
    .from('users')
    .insert({
      id: userId,
      email: email,
      username: finalUsername,
      first_name: userMetadata.given_name || userMetadata.first_name || userMetadata.name?.split(' ')[0] || '',
      last_name: userMetadata.family_name || userMetadata.last_name || userMetadata.name?.split(' ')[1] || '',
      avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
      bio: '',
    })
    .select()
    .single()

  if (createError) {
    console.error('Failed to create profile:', createError)
    process.exit(1)
  }

  console.log('✅ Profile created successfully:', newProfile)
}

createProfile().catch(console.error)
