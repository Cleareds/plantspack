#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function fixReviewRLS() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('Checking users table for is_banned column...\n')

  // Check if is_banned column exists
  const { data: columns, error: columnsError } = await supabase
    .from('users')
    .select('is_banned')
    .limit(1)

  if (columnsError) {
    console.log('is_banned column does not exist:', columnsError.message)
    console.log('\nThe RLS policy needs to be updated.\n')
  } else {
    console.log('✓ is_banned column exists')
  }

  console.log('Fixing the RLS policy...\n')

  // Drop the old policy and create a fixed one
  const fixSQL = `
-- Drop the problematic policy
DROP POLICY IF EXISTS "place_reviews_insert_policy" ON public.place_reviews;

-- Create a corrected policy
-- The issue was: (is_banned = true OR is_banned IS NOT NULL)
-- This would block users where is_banned = false (since IS NOT NULL would be true)
-- Fixed to only check if is_banned = true

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

  console.log('SQL to execute:')
  console.log(fixSQL)
  console.log('\n⚠️  Please run this SQL in Supabase Dashboard SQL Editor:')
  console.log('https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp/sql/new')
}

fixReviewRLS()
