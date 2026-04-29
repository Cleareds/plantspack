import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const sql = readFileSync('supabase/migrations/20260417000000_add_foursquare_columns.sql', 'utf-8')
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
  if (error) {
    console.error('exec_sql rpc failed, trying direct execution via postgres:', error.message)
    // Fallback: split and run statements through a helper
    console.log('Please apply manually via: supabase db push')
    process.exit(1)
  }
  console.log('Migration applied')
}

main().catch(console.error)
