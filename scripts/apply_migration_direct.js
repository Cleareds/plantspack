#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function executeSQLFile() {
  console.log('📦 Reading migration file...\n')

  const sql = fs.readFileSync('supabase/migrations/20260209000000_production_hardening.sql', 'utf8')

  // Split into individual statements (simplified approach)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^--/))

  console.log(`Found ${statements.length} statements\n`)

  // For Supabase, we need to execute via a custom function or use the SQL editor
  // Let's try executing key parts
  console.log('Executing migration via Supabase admin client...\n')

  // Execute the full migration as one query
  try {
    // Try executing the full SQL (may not work for all statements)
    const { error } = await supabase.rpc('exec', { sql: sql })

    if (error) {
      console.log('Direct execution not available. Testing if functions exist...\n')

      // Test if functions already exist
      const testUserId = '00000000-0000-0000-0000-000000000001'
      const { data: postLimitData, error: postLimitError } = await supabase
        .rpc('check_rate_limit_posts', { p_user_id: testUserId })

      if (!postLimitError) {
        console.log('✅ Migration already applied! Functions exist.')
        console.log('Test result:', postLimitData)
        process.exit(0)
      } else {
        console.log('⚠️  Migration needs to be applied manually.\n')
        console.log('Please run:')
        console.log('  1. Copy the SQL from supabase/migrations/20260209000000_production_hardening.sql')
        console.log('  2. Go to Supabase Dashboard > SQL Editor')
        console.log('  3. Paste and execute the SQL\n')
        console.log('  OR run: supabase db push\n')
      }
    } else {
      console.log('✅ Migration executed successfully!')
    }
  } catch (e) {
    console.log('Manual migration required.\n')
    console.log('SQL file location: supabase/migrations/20260209000000_production_hardening.sql')
    console.log('Execute in Supabase SQL Editor or run: supabase db push')
  }
}

executeSQLFile().catch(console.error)
