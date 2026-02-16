import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkBucketConfig() {
  try {
    console.log('\n🔍 Checking storage bucket configuration...\n')

    // Use raw SQL query to access storage.buckets table
    const { data, error } = await supabase.rpc('exec', {
      sql: `SELECT id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at
            FROM storage.buckets
            WHERE id = 'media'`
    })

    if (error) {
      console.error('❌ Error querying buckets table:', error.message)
      console.log('\nTrying alternative method...\n')

      // Try using the storage API directly
      const response = await fetch(`${supabaseUrl}/storage/v1/bucket/media`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      })

      const buckets = await response.json()
      console.log('Storage API response:', JSON.stringify(buckets, null, 2))
      return
    }

    const buckets = data?.[0]

    if (buckets) {
      console.log('📦 Media Bucket Configuration:')
      console.log('─'.repeat(60))
      console.log(`ID: ${buckets.id}`)
      console.log(`Name: ${buckets.name || 'N/A'}`)
      console.log(`Public: ${buckets.public}`)
      console.log(`File size limit: ${buckets.file_size_limit?.toLocaleString() || 'N/A'} bytes`)
      console.log(`In MB: ${buckets.file_size_limit ? (buckets.file_size_limit / (1024 * 1024)).toFixed(2) : 'N/A'} MB`)
      console.log(`Allowed MIME types: ${buckets.allowed_mime_types?.join(', ') || 'All'}`)
      console.log(`Created at: ${buckets.created_at}`)
      console.log(`Updated at: ${buckets.updated_at}`)
      console.log('─'.repeat(60))

      // Check if limit is what we expect
      const expectedLimit = 104857600 // 100MB
      if (buckets.file_size_limit !== expectedLimit) {
        console.log(`\n⚠️  WARNING: Expected limit is ${expectedLimit} bytes (100MB)`)
        console.log(`   Current limit is ${buckets.file_size_limit} bytes`)
      } else {
        console.log('\n✅ Bucket limit is correctly set to 100MB')
      }
    } else {
      console.log('❌ Media bucket not found')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkBucketConfig()
