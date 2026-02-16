import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function fixStorageLimit() {
  console.log('Fixing storage bucket file size limit...\n')

  const supabase = createAdminClient()

  try {
    // Update the bucket configuration directly via SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        UPDATE storage.buckets
        SET file_size_limit = 268435456
        WHERE id = 'media';
      `
    })

    if (error) {
      // Try alternative approach - direct table update
      const { error: updateError } = await supabase
        .from('storage.buckets')
        .update({ file_size_limit: 268435456 })
        .eq('id', 'media')

      if (updateError) {
        console.error('Error updating bucket:', updateError)
        process.exit(1)
      }
    }

    console.log('✅ Storage bucket limit updated successfully!')
    console.log('\nNew configuration:')
    console.log('- File size limit: 256MB (268,435,456 bytes)')
    console.log('- Premium users can now upload videos up to 256MB')

    // Verify the change
    const { data: bucket } = await supabase
      .from('storage.buckets')
      .select('*')
      .eq('id', 'media')
      .single()

    if (bucket) {
      const limitMB = bucket.file_size_limit / (1024 * 1024)
      console.log(`\n✓ Verified: Current limit is ${limitMB}MB`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixStorageLimit()
