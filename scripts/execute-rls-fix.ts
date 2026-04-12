#!/usr/bin/env tsx
import { Client } from 'pg'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function executeRLSFix() {
  console.log('Connecting to Supabase database...\n')

  // Construct connection string from Supabase URL and service key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const projectRef = 'mfeelaqjbtnypoojhfjp'
  const dbPassword = process.env.SUPABASE_DB_PASSWORD

  if (!dbPassword) {
    console.log('⚠️  SUPABASE_DB_PASSWORD not found in .env.local')
    console.log('Please add: SUPABASE_DB_PASSWORD=your_db_password')
    return
  }

  const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.resolve(__dirname, '../supabase/migrations/20260206000001_fix_place_reviews_rls.sql'),
      'utf8'
    )

    console.log('Executing migration SQL...\n')

    // Execute the SQL
    const result = await client.query(migrationSQL)

    console.log('✅ Migration executed successfully!')
    console.log('Result:', result.command)

    // Test that reviews can now be created
    console.log('\nVerifying fix...')
    const testQuery = `
      SELECT
        polname AS policy_name,
        polcmd AS command
      FROM pg_policy
      WHERE polrelid = 'public.place_reviews'::regclass
        AND polname = 'place_reviews_insert_policy';
    `

    const testResult = await client.query(testQuery)
    if (testResult.rows.length > 0) {
      console.log('✅ Policy exists and is active!')
      console.log('Policy:', testResult.rows[0])
    } else {
      console.log('⚠️  Policy not found - may need manual verification')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
  } finally {
    await client.end()
    console.log('\n✅ Connection closed')
  }
}

executeRLSFix()
