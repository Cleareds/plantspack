/**
 * Import verified vegan places to Supabase
 *
 * Reads scripts/import-ready-places.json and upserts into the places table.
 * No feed posts are created — places are discoverable via map/search/country pages.
 *
 * Usage:
 *   npx tsx scripts/import-to-supabase.ts
 *   npx tsx scripts/import-to-supabase.ts --dry-run
 *   npx tsx scripts/import-to-supabase.ts --batch-size=100
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const INPUT = 'scripts/import-ready-places.json'
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '50')
const DRY_RUN = process.argv.includes('--dry-run')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Opening hours parser: OSM format → JSONB ───────────────────────────

function parseOpeningHours(osmHours: string | null): Record<string, string> | null {
  if (!osmHours) return null

  const dayMap: Record<string, string> = {
    'Mo': 'monday', 'Tu': 'tuesday', 'We': 'wednesday',
    'Th': 'thursday', 'Fr': 'friday', 'Sa': 'saturday', 'Su': 'sunday',
  }

  const result: Record<string, string> = {}

  try {
    // Handle common OSM patterns like "Mo-Fr 09:00-18:00; Sa 10:00-16:00"
    const rules = osmHours.split(';').map(r => r.trim()).filter(Boolean)

    for (const rule of rules) {
      // Match "Mo-Fr 09:00-18:00" or "Sa,Su 10:00-14:00" or "Mo 09:00-18:00"
      const match = rule.match(/^([A-Za-z,\-\s]+?)\s+([\d:]+\s*-\s*[\d:]+.*)$/)
      if (!match) {
        // Try "24/7" or just time
        if (rule.includes('24/7')) {
          Object.values(dayMap).forEach(d => { result[d] = '00:00-24:00' })
        }
        continue
      }

      const [, dayPart, timePart] = match
      const time = timePart.trim()

      // Expand day ranges
      const daySegments = dayPart.split(',').map(s => s.trim())
      for (const seg of daySegments) {
        const rangeMatch = seg.match(/^(\w{2})\s*-\s*(\w{2})$/)
        if (rangeMatch) {
          const dayKeys = Object.keys(dayMap)
          const startIdx = dayKeys.indexOf(rangeMatch[1])
          const endIdx = dayKeys.indexOf(rangeMatch[2])
          if (startIdx >= 0 && endIdx >= 0) {
            for (let i = startIdx; i <= (endIdx >= startIdx ? endIdx : endIdx + 7); i++) {
              const key = dayKeys[i % 7]
              result[dayMap[key]] = time
            }
          }
        } else if (dayMap[seg]) {
          result[dayMap[seg]] = time
        }
      }
    }
  } catch {
    // If parsing fails, store raw string as a note
    return { raw: osmHours }
  }

  return Object.keys(result).length > 0 ? result : { raw: osmHours }
}

// ─── Get or create system import user ────────────────────────────────────

async function getOrCreateImportUser(): Promise<string> {
  const importEmail = 'osm-import@plantspack.system'

  // Check if system user exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', importEmail)
    .single()

  if (existing) return existing.id

  // Create system user via auth admin
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: importEmail,
    password: `system-${Date.now()}-${Math.random().toString(36)}`,
    email_confirm: true,
    user_metadata: { name: 'OSM Import', is_system: true },
  })

  if (authError) {
    // If user exists in auth but not in users table, find it
    const { data: users } = await supabase.auth.admin.listUsers()
    const found = users?.users?.find(u => u.email === importEmail)
    if (found) return found.id
    throw new Error(`Failed to create import user: ${authError.message}`)
  }

  // Ensure users row exists
  const userId = authUser.user.id
  await supabase.from('users').upsert({
    id: userId,
    email: importEmail,
    name: 'OSM Import',
    username: 'osm-import',
  }, { onConflict: 'id' })

  return userId
}

// ─── Main import ─────────────────────────────────────────────────────────

interface ImportPlace {
  name: string
  description: string | null
  category: string
  address: string
  latitude: number
  longitude: number
  city: string | null
  country: string
  website: string | null
  phone: string | null
  is_pet_friendly: boolean
  images: string[]
  tags: string[]
  source: string
  source_id: string
  opening_hours: string | null
  cuisine_types: string[]
  vegan_level: string
  confidence_score?: number
  google_place_id?: string
  google_maps_url?: string
}

async function main() {
  console.log('🌿 Supabase Import — Verified Vegan Places')
  console.log('============================================')
  console.log(`Input: ${INPUT}`)
  console.log(`Batch size: ${BATCH_SIZE}`)
  console.log(`Dry run: ${DRY_RUN}\n`)

  // Load places
  const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'))
  const places: ImportPlace[] = data.places
  console.log(`Loaded ${places.length} places`)

  if (DRY_RUN) {
    console.log('\n⏭️  Dry run — showing first 3 mapped records:\n')
    for (const p of places.slice(0, 3)) {
      console.log(JSON.stringify(mapPlace(p, 'dry-run-user-id'), null, 2))
      console.log('---')
    }
    console.log(`\nWould insert/update ${places.length} places`)
    return
  }

  // Get import user
  console.log('\n📋 Setting up import user...')
  const importUserId = await getOrCreateImportUser()
  console.log(`  Import user ID: ${importUserId}`)

  // Upsert in batches
  console.log(`\n📦 Importing ${places.length} places in batches of ${BATCH_SIZE}...`)

  let inserted = 0
  let updated = 0
  let errors = 0
  const startTime = Date.now()

  for (let i = 0; i < places.length; i += BATCH_SIZE) {
    const batch = places.slice(i, i + BATCH_SIZE)
    const records = batch.map(p => mapPlace(p, importUserId))

    const { data: result, error } = await supabase
      .from('places')
      .insert(records)
      .select('id')

    if (error) {
      console.error(`\n  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${error.message}`)
      errors += batch.length
    } else {
      inserted += (result?.length || 0)
    }

    const done = Math.min(i + BATCH_SIZE, places.length)
    const elapsed = (Date.now() - startTime) / 1000
    const rate = done / elapsed
    const eta = Math.round((places.length - done) / rate)
    process.stdout.write(
      `\r  Progress: ${done}/${places.length} (${(done / places.length * 100).toFixed(1)}%) — ${rate.toFixed(0)}/s — ETA ${eta}s   `
    )
  }
  console.log()

  // Update PostGIS geometry for imported places
  console.log('\n🌍 Updating PostGIS geometry...')
  const { error: geomError } = await supabase.rpc('exec_sql' as never, {
    sql: `UPDATE places SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE source = 'openstreetmap' AND geom IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;`
  })

  if (geomError) {
    // Fallback: run raw SQL if RPC doesn't exist
    console.log('  (RPC not available, geometry will be set by trigger or manual migration)')
  } else {
    console.log('  ✅ Geometry updated')
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('\n═══ IMPORT COMPLETE ═══')
  console.log(`  Total processed: ${places.length}`)
  console.log(`  Inserted/updated: ${inserted}`)
  console.log(`  Errors: ${errors}`)
  console.log(`  Time: ${elapsed}s`)
  console.log(`\n✅ Done! Places are now discoverable via map, search, and country pages.`)
  console.log(`   No feed posts were created — the feed stays organic.`)
}

function mapPlace(place: ImportPlace, createdBy: string) {
  return {
    name: place.name,
    description: place.description,
    category: place.category as 'eat' | 'hotel' | 'store',
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    city: place.city,
    country: place.country,
    website: place.website,
    phone: place.phone,
    is_pet_friendly: place.is_pet_friendly || false,
    images: place.images || [],
    main_image_url: place.images?.[0] || null,
    source: place.source || 'openstreetmap',
    source_id: place.source_id,
    cuisine_types: place.cuisine_types || [],
    vegan_level: place.vegan_level === 'fully_vegan' ? 'fully_vegan' : 'vegan_friendly',
    opening_hours: parseOpeningHours(place.opening_hours),
    created_by: createdBy,
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
