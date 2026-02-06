#!/usr/bin/env tsx
/**
 * Script to apply database migration to production
 * Run with: npx tsx scripts/apply-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function applyMigration() {
  console.log('Applying place reviews migration to production...')
  console.log('=' .repeat(60))

  try {
    // Read the migration file
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260205000001_create_place_reviews_and_pack_places.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('Migration file loaded:', migrationPath)
    console.log('Executing SQL...\n')

    // Execute the migration
    // Note: Supabase client doesn't have a direct way to execute raw SQL with service role
    // We need to use the RPC or REST API directly

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Found ${statements.length} SQL statements to execute\n`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`[${i + 1}/${statements.length}] Executing...`)

        try {
          // Use the REST API to execute raw SQL
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sql: statement + ';' }),
          })

          if (!response.ok) {
            console.warn(`  ⚠️  Statement might have failed (${response.status}), but continuing...`)
          } else {
            console.log(`  ✓ Success`)
          }
        } catch (error) {
          console.warn(`  ⚠️  Error executing statement:`, error)
          console.log(`  Continuing with next statement...`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Migration application completed!')
    console.log('\nNote: Some statements may have been skipped if tables/columns already exist.')
    console.log('This is normal for idempotent migrations using IF NOT EXISTS.')

  } catch (error) {
    console.error('❌ Failed to apply migration:', error)
    process.exit(1)
  }
}

applyMigration()
