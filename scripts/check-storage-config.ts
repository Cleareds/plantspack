import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function checkStorageConfig() {
  console.log('Checking storage bucket configuration...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing SUPABASE credentials in .env.local')
    process.exit(1)
  }

  try {
    // Get bucket configuration
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket/media`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Error fetching bucket:', error)
      process.exit(1)
    }

    const bucket = await response.json()
    console.log('Current bucket configuration:')
    console.log(JSON.stringify(bucket, null, 2))

    const limitMB = bucket.file_size_limit ? bucket.file_size_limit / (1024 * 1024) : 'No limit'
    console.log(`\nFile size limit: ${limitMB}MB`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkStorageConfig()
