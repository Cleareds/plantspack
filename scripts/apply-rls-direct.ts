#!/usr/bin/env tsx
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function applyRLSDirect() {
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
`.trim()

  console.log('Attempting to apply RLS fix via Supabase Management API...\n')

  try {
    // Use Supabase Management API to execute SQL
    const response = await fetch(
      `https://api.supabase.com/v1/projects/mfeelaqjbtnypoojhfjp/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.log('❌ API call failed:', response.status, error)
      console.log('\nPlease apply the fix manually via the dashboard.')
    } else {
      const result = await response.json()
      console.log('✅ RLS policy fix applied successfully!')
      console.log(result)
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message)
    console.log('\nPlease apply the fix manually:')
    console.log('1. Go to: https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp/sql/new')
    console.log('2. Run this SQL:')
    console.log(sql)
  }
}

applyRLSDirect()
