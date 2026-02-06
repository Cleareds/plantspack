#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function applyRLSFix() {
  console.log('Applying RLS policy fix for place_reviews...\n')

  const migrationSQL = fs.readFileSync(
    path.resolve(__dirname, '../supabase/migrations/20260206000001_fix_place_reviews_rls.sql'),
    'utf8'
  )

  console.log('Migration SQL:')
  console.log('='.repeat(60))
  console.log(migrationSQL)
  console.log('='.repeat(60))
  console.log()

  // Create admin client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: {
        schema: 'public'
      }
    }
  )

  // Execute the SQL using rpc if available, otherwise show manual instructions
  console.log('⚠️  To apply this fix, please:')
  console.log()
  console.log('1. Go to: https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp/sql/new')
  console.log('2. Copy the SQL above')
  console.log('3. Paste and click "Run"')
  console.log()
  console.log('OR run: supabase db push (if you have CLI configured)')
}

applyRLSFix()
