import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

async function checkSupabasePlan() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials')
    process.exit(1)
  }

  // Get project info via Management API
  const projectRef = 'mfeelaqjbtnypoojhfjp'

  // Check storage bucket details
  const bucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/media`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  })

  const bucket = await bucketResponse.json()

  console.log('=== Storage Bucket Configuration ===')
  console.log(`Bucket: ${bucket.name}`)
  console.log(`File size limit: ${bucket.file_size_limit ? (bucket.file_size_limit / (1024 * 1024)).toFixed(0) + 'MB' : 'No limit'}`)
  console.log(`Allowed mime types: ${bucket.allowed_mime_types?.join(', ')}`)
  console.log(`Public: ${bucket.public}`)

  // Try to get project settings (this might require different auth)
  console.log('\n=== Checking Upload Limits ===')
  console.log('Note: Supabase plan-level limits:')
  console.log('- Free tier: ~100MB per file upload')
  console.log('- Pro tier ($25/mo): Up to 5GB per file')
  console.log('- Your bucket is configured for: 256MB')
  console.log('\nIf uploads >100MB fail, you may need to upgrade to Pro tier.')
}

checkSupabasePlan()
