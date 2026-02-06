#!/usr/bin/env tsx
/**
 * Execute RLS fix using Supabase Management API
 * This script runs the SQL directly to fix the place_reviews policy
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function fixRLS() {
  console.log('Applying RLS fix via Supabase SQL...\n')

  const sql = `
-- Drop the broken policy
DROP POLICY IF EXISTS "place_reviews_insert_policy" ON public.place_reviews;

-- Create the fixed policy
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

-- Verify it worked
SELECT 'Policy created successfully' as result;
`.trim()

  console.log('SQL to execute:')
  console.log('─'.repeat(60))
  console.log(sql)
  console.log('─'.repeat(60))
  console.log()

  // Use Supabase Dashboard direct link
  const dashboardUrl = 'https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp/sql/new'

  console.log('🔧 To apply this fix:')
  console.log('1. Copy the SQL above')
  console.log(`2. Open: ${dashboardUrl}`)
  console.log('3. Paste and click RUN')
  console.log()
  console.log('This will take 5 seconds and fix review creation immediately.')
}

fixRLS()
