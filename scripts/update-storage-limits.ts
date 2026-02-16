import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function updateStorageLimits() {
  console.log('Updating storage bucket limits...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing SUPABASE credentials in .env.local')
    process.exit(1)
  }

  try {
    // Update bucket configuration via REST API
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket/media`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        public: true,
        file_size_limit: 268435456, // 256MB in bytes (256 * 1024 * 1024)
        allowed_mime_types: ['image/*', 'video/*']
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Error updating bucket:', error)
      process.exit(1)
    }

    const result = await response.json()
    console.log('✅ Storage bucket updated successfully!')
    console.log('\nBucket configuration:')
    console.log(`- File size limit: 256MB`)
    console.log(`- Allowed types: Images and Videos`)
    console.log(`- Public access: Yes`)
    console.log('\nPremium users can now upload videos up to 256MB')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

updateStorageLimits()
