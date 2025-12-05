/**
 * Apply packs migration to Supabase database
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = 'https://mfeelaqjbtnypoojhfjp.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZWVsYXFqYnRueXBvb2poZmpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzM5MTIyNCwiZXhwIjoyMDY4OTY3MjI0fQ.oyVwmdmgLVh_ELfBgVFQZjmzcImAVQw8tGe-jAE3SwU'

const supabase = createClient(supabaseUrl, serviceKey)

async function applyMigration() {
  console.log('🚀 Applying Packs System Migration...\n')
  console.log('=' .repeat(60))

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20251204000001_create_packs_system.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration file loaded')
    console.log(`   Size: ${migrationSQL.length} characters\n`)

    // Execute the migration
    // Note: Supabase doesn't support direct SQL execution via the JS client for DDL
    // This migration needs to be run in the Supabase SQL Editor

    console.log('⚠️  IMPORTANT: This migration contains DDL statements')
    console.log('   that need to be run in the Supabase SQL Editor.\n')
    console.log('📋 Steps to apply:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp/sql/new')
    console.log('   2. Copy the contents of: supabase/migrations/20251204000001_create_packs_system.sql')
    console.log('   3. Paste into the SQL editor')
    console.log('   4. Click "Run"\n')

    // Instead, let's verify the tables don't exist yet
    console.log('🔍 Checking if migration is needed...\n')

    const { data: existingTables, error } = await supabase
      .from('packs')
      .select('id')
      .limit(1)

    if (error && error.message.includes('relation "public.packs" does not exist')) {
      console.log('✅ Migration is needed - packs table does not exist')
      console.log('\n📖 Migration will create:')
      console.log('   ✓ packs table')
      console.log('   ✓ pack_members table')
      console.log('   ✓ pack_posts table')
      console.log('   ✓ pack_follows table')
      console.log('   ✓ Indexes for performance')
      console.log('   ✓ RLS policies for security')
      console.log('   ✓ Triggers for automation\n')
    } else if (!error) {
      console.log('⚠️  packs table already exists!')
      console.log('   Migration may have been applied already.\n')
    } else {
      console.log('❌ Error checking tables:', error.message)
    }

    console.log('=' .repeat(60))
    console.log('\n💡 To manually apply the migration:')
    console.log('   cat supabase/migrations/20251204000001_create_packs_system.sql | \\')
    console.log('   pbcopy  # This copies to clipboard on Mac')
    console.log('\n   Then paste into Supabase SQL Editor and run.\n')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

applyMigration()
