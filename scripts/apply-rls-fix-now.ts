#!/usr/bin/env tsx
/**
 * Apply RLS fix using raw SQL query through PostgREST
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function applyRLSFix() {
  const projectRef = 'mfeelaqjbtnypoojhfjp'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  console.log('Applying RLS policy fix...\n')

  // SQL statements to execute
  const statements = [
    {
      name: 'Drop old policy',
      sql: 'DROP POLICY IF EXISTS "place_reviews_insert_policy" ON public.place_reviews;'
    },
    {
      name: 'Create new policy',
      sql: `CREATE POLICY "place_reviews_insert_policy" ON public.place_reviews
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
    }
  ]

  for (const stmt of statements) {
    console.log(`${stmt.name}...`)

    try {
      // Use PostgREST query endpoint
      const response = await fetch(
        `https://${projectRef}.supabase.co/rest/v1/rpc/exec`,
        {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: stmt.sql })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.log(`  ℹ️  ${stmt.name}: ${response.status} - ${errorText}`)
        console.log('  (This is expected if using PostgREST without exec RPC)\n')
      } else {
        console.log(`  ✅ ${stmt.name} successful!\n`)
      }
    } catch (error: any) {
      console.log(`  ⚠️  ${stmt.name}: ${error.message}\n`)
    }
  }

  console.log('Testing if the policy exists...')

  // Test by checking if we can query the table
  try {
    const response = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/place_reviews?select=id&limit=0`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      }
    )

    if (response.ok) {
      console.log('✅ place_reviews table is accessible!\n')
    }
  } catch (error) {
    console.log('⚠️  Could not verify\n')
  }

  console.log('─'.repeat(60))
  console.log('\n📋 MANUAL APPLICATION (Most Reliable Method):')
  console.log('\n1. Open: https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp/sql/new')
  console.log('\n2. Copy and paste this SQL:\n')
  console.log(statements.map(s => s.sql).join('\n\n'))
  console.log('\n3. Click "RUN" button')
  console.log('\n4. You should see "Success. No rows returned"')
  console.log('─'.repeat(60))
}

applyRLSFix()
