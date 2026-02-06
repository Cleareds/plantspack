#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function checkTables() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('Checking if migration tables exist...\n')

  const { data: reviews, error: reviewsError } = await supabase
    .from('place_reviews')
    .select('id')
    .limit(1)

  if (reviewsError) {
    console.log('❌ place_reviews table:', reviewsError.message)
  } else {
    console.log('✓ place_reviews table exists!')
  }

  const { data: reactions, error: reactionsError } = await supabase
    .from('place_review_reactions')
    .select('id')
    .limit(1)

  if (reactionsError) {
    console.log('❌ place_review_reactions table:', reactionsError.message)
  } else {
    console.log('✓ place_review_reactions table exists!')
  }

  const { data: packPlaces, error: packPlacesError } = await supabase
    .from('pack_places')
    .select('id')
    .limit(1)

  if (packPlacesError) {
    console.log('❌ pack_places table:', packPlacesError.message)
  } else {
    console.log('✓ pack_places table exists!')
  }

  if (reviewsError || reactionsError || packPlacesError) {
    console.log('\n⚠️  Migration needs to be applied!')
    console.log('\nPlease run the migration manually through Supabase Dashboard:')
    console.log('1. Go to https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp/sql/new')
    console.log('2. Copy contents from: supabase/migrations/20260205000001_create_place_reviews_and_pack_places.sql')
    console.log('3. Paste and click Run')
  } else {
    console.log('\n✅ All migration tables exist!')
  }
}

checkTables()
