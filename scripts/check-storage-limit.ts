import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkStorageLimit() {
  try {
    // Query using RPC to get bucket info
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `SELECT id, file_size_limit, public FROM storage.buckets WHERE id = 'media'`
    })

    if (error) {
      console.error('RPC Error, trying direct query:', error.message)

      // Try alternative approach
      const response = await fetch(`${supabaseUrl}/rest/v1/storage.buckets?id=eq.media`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      })

      const buckets = await response.json()
      if (buckets && buckets.length > 0) {
        const bucket = buckets[0]
        console.log('\n📦 Media Bucket Configuration:')
        console.log('─'.repeat(50))
        console.log(`ID: ${bucket.id}`)
        console.log(`File size limit: ${bucket.file_size_limit?.toLocaleString() || 'N/A'} bytes`)
        console.log(`In MB: ${bucket.file_size_limit ? (bucket.file_size_limit / (1024 * 1024)).toFixed(2) : 'N/A'} MB`)
        console.log(`Public: ${bucket.public}`)
        console.log('─'.repeat(50))
      } else {
        console.log('❌ Media bucket not found')
      }
      return
    }

    console.log('Bucket data:', data)
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkStorageLimit()
