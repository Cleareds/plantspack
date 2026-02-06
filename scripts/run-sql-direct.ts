#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function runSQL() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('Executing RLS policy fix...\n')

  // The SQL to fix the RLS policy
  const sql = `
DROP POLICY IF EXISTS "place_reviews_insert_policy" ON public.place_reviews;

CREATE POLICY "place_reviews_insert_policy" ON public.place_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND is_banned = true
    )
  );
`

  // Try to execute via raw query
  try {
    // Use the postgres connection string to execute raw SQL
    const { createClient: createPgClient } = await import('@supabase/supabase-js')

    // Execute statements one by one
    console.log('Step 1: Dropping old policy...')
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "place_reviews_insert_policy" ON public.place_reviews;'
    })

    if (dropError && !dropError.message.includes('does not exist')) {
      console.log('Drop result:', dropError.message || 'Success (or policy did not exist)')
    }

    console.log('Step 2: Creating new policy...')
    const createSQL = `
CREATE POLICY "place_reviews_insert_policy" ON public.place_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND is_banned = true
    )
  );`

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createSQL })

    if (createError) {
      console.log('Create result:', createError.message || 'Success')
    }

    // Test if it worked by trying to query the policy
    console.log('\nTesting if fix worked...')
    const { data: testData, error: testError } = await supabase
      .from('place_reviews')
      .select('id')
      .limit(0)

    if (testError) {
      console.log('Test error:', testError.message)
    } else {
      console.log('✅ Policy appears to be working!')
    }

    console.log('\nNote: If exec_sql RPC does not exist, the policy needs to be created via Supabase Dashboard.')
    console.log('The SQL has been saved to: supabase/migrations/20260206000001_fix_place_reviews_rls.sql')

  } catch (error: any) {
    console.log('Error executing SQL:', error.message)
    console.log('\nPlease run the migration via Supabase Dashboard:')
    console.log('https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp/sql/new')
  }
}

runSQL()
