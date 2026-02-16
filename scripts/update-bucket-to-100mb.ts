import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

async function updateBucketLimit() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials')
    process.exit(1)
  }

  console.log('Updating media bucket limit to 100MB...\n')

  // Update bucket via REST API
  const response = await fetch(`${supabaseUrl}/storage/v1/bucket/media`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey
    },
    body: JSON.stringify({
      public: true,
      file_size_limit: 104857600, // 100MB in bytes
      allowed_mime_types: ['image/*', 'video/*']
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Error:', error)
    process.exit(1)
  }

  const result = await response.json()
  console.log('✅ Bucket updated successfully!')
  console.log(`File size limit: ${result.file_size_limit / (1024 * 1024)}MB`)
  console.log('\nPremium users can now upload videos up to 100MB')
  console.log('(matches Supabase Free tier limit)')
}

updateBucketLimit()
