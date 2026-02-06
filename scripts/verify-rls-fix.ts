#!/usr/bin/env tsx
/**
 * Verify that the RLS policy fix is working
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function verifyRLSFix() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const projectRef = 'mfeelaqjbtnypoojhfjp'

  console.log('Checking RLS policy for place_reviews...\n')

  try {
    // Query the policy definition
    const response = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            SELECT
              polname AS policy_name,
              pg_get_expr(polqual, polrelid) AS using_expression,
              pg_get_expr(polwithcheck, polrelid) AS with_check_expression
            FROM pg_policy
            WHERE polrelid = 'public.place_reviews'::regclass
              AND polname = 'place_reviews_insert_policy';
          `
        })
      }
    )

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Policy found:')
      console.log(JSON.stringify(result, null, 2))
      console.log('\n')

      // Check if the policy has the correct condition
      const policyData = JSON.stringify(result)
      if (policyData.includes('is_banned = true') && !policyData.includes('IS NOT NULL')) {
        console.log('✅ RLS policy is FIXED! Reviews should work now.\n')
      } else if (policyData.includes('IS NOT NULL')) {
        console.log('❌ RLS policy still has the bug (contains IS NOT NULL check)\n')
        console.log('Please run the migration manually in Supabase SQL Editor:\n')
        console.log('https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp/sql/new\n')
      }
    } else {
      const errorText = await response.text()
      console.log(`⚠️  Could not query policy: ${response.status}`)
      console.log(`Response: ${errorText}\n`)

      // Try alternative method - just check if table is accessible
      console.log('Trying alternative verification method...\n')

      const testResponse = await fetch(
        `https://${projectRef}.supabase.co/rest/v1/place_reviews?select=id&limit=1`,
        {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
          }
        }
      )

      if (testResponse.ok) {
        console.log('✅ place_reviews table is accessible\n')
        console.log('The RLS policy might be fixed, but could not verify the exact condition.')
        console.log('\nTo manually verify, run this in Supabase SQL Editor:')
        console.log('https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp/sql/new\n')
        console.log(`
SELECT
  polname,
  pg_get_expr(polwithcheck, polrelid) AS with_check
FROM pg_policy
WHERE polrelid = 'public.place_reviews'::regclass
  AND polname = 'place_reviews_insert_policy';
        `)
      } else {
        console.log('❌ Could not access place_reviews table\n')
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }

  console.log('\n─'.repeat(60))
  console.log('\n📋 If RLS policy is NOT fixed, run this SQL manually:\n')
  console.log('https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp/sql/new\n')
  console.log(`
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
  `)
  console.log('─'.repeat(60))
}

verifyRLSFix()
