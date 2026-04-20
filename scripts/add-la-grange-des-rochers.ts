#!/usr/bin/env tsx
/**
 * One-off: add "La Grange DesRochers" — a 100% vegan bed & breakfast and
 * wellness retreat near Fontainebleau, France.
 *
 * Data scraped from https://www.lagrangedesrochers.com on 2026-04-20.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

async function main() {
  const dry = !process.argv.includes('--commit')
  console.log(`Mode: ${dry ? 'DRY-RUN' : 'COMMIT'}`)

  const row = {
    name: 'La Grange DesRochers',
    description:
      'A renovated 1800s French barn near Fontainebleau offering organic vegan accommodations, ' +
      'plant-based cuisine, and wellness activities. 100% vegan bed & breakfast and retreat center.',
    address: 'Paley, 77970',
    city: 'Paley',
    country: 'France',
    latitude: 48.24252,
    longitude: 2.8596,
    phone: '+33 7 67 25 15 74',
    website: 'https://www.lagrangedesrochers.com',
    main_image_url: 'https://static.wixstatic.com/media/2bf22e_b1cd5af9965d48618b53e8b54ac3a167~mv2.jpg',
    vegan_level: 'fully_vegan' as const,
    category: 'hotel' as const,
    categorization_note: 'site:bed_and_breakfast_wellness_retreat',
    source: 'manual-import-2026-04-20',
    source_id: 'lagrangedesrochers.com',
    tags: ['100% vegan', 'retreat', 'bed-and-breakfast', 'wellness', 'organic', 'manually-added'],
    is_verified: true,
    verification_status: 'admin_verified',
    created_by: ADMIN_USER_ID,
  }

  console.log('Place to insert:')
  console.log(JSON.stringify(row, null, 2))

  if (dry) {
    console.log('\n(dry-run — rerun with --commit to insert)')
    return
  }

  const { data, error } = await supabase.from('places').insert(row).select('id, slug').single()
  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }
  console.log(`\nInserted: id=${data.id}  slug=${data.slug}`)
  console.log(`URL: https://www.plantspack.com/place/${data.slug || data.id}`)
}

main().catch(e => { console.error(e); process.exit(1) })
