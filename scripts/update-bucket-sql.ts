import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

config({ path: resolve(process.cwd(), '.env.local') })

async function updateBucketSQL() {
  const supabase = createAdminClient()

  console.log('Updating bucket limit via SQL...\n')

  // Use raw SQL to update the bucket
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      UPDATE storage.buckets
      SET file_size_limit = 104857600
      WHERE id = 'media';

      SELECT id, name, file_size_limit, file_size_limit / (1024 * 1024) as size_mb
      FROM storage.buckets
      WHERE id = 'media';
    `
  })

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log('✅ Updated successfully!')
  console.log('Bucket limit: 100MB')
}

updateBucketSQL()
