#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function runMigration() {
  console.log('Applying production hardening migration...\n')

  // Read migration SQL
  const sql = fs.readFileSync('supabase/migrations/20260209000000_production_hardening.sql', 'utf8')

  // Execute via raw SQL (this won't work directly, need to use psql or supabase cli)
  console.log('Migration SQL prepared. Use one of these methods:')
  console.log('\nMethod 1 - Supabase CLI (recommended):')
  console.log('  supabase db push\n')
  console.log('Method 2 - Manual execution:')
  console.log('  Copy SQL from supabase/migrations/20260209000000_production_hardening.sql')
  console.log('  Paste into Supabase SQL Editor\n')

  // Test if functions exist
  console.log('Testing if rate limit functions exist...')

  try {
    const testUserId = '00000000-0000-0000-0000-000000000001'
    const { data, error } = await supabase.rpc('check_rate_limit_posts', { p_user_id: testUserId })

    if (error) {
      console.log('⚠️  Functions not yet created. Please run migration first.')
      console.log('Error:', error.message)
    } else {
      console.log('✅ Rate limit functions already exist!')
      console.log('Test result:', data)
    }
  } catch (e) {
    console.log('⚠️  Could not test functions:', e.message)
  }
}

runMigration()
