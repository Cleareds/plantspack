/**
 * HappyCow Import Pipeline - Imports scraped JSONL data into Supabase places table
 *
 * Usage: npx tsx scripts/import-happycow.ts <jsonl-file>
 * Example: npx tsx scripts/import-happycow.ts scripts/data/happycow-new-york-city.jsonl
 *
 * Reads a JSONL file produced by scrape-happycow.ts, validates entries,
 * and batch-inserts them into the `places` table with source='happycow'.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HappyCowRecord {
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  description: string
  cuisine_types: string[]
  vegan_level: 'fully_vegan' | 'vegan_friendly' | 'vegan_options'
  images: string[]
  website: string | null
  phone: string | null
  source_id: string
}

interface PlaceInsert {
  name: string
  address: string
  latitude: number
  longitude: number
  description: string | null
  category: 'restaurant'
  cuisine_types: string[]
  vegan_level: string
  images: string[]
  website: string | null
  phone: string | null
  source: 'happycow'
  source_id: string
  created_by: string
  is_pet_friendly: boolean
}

interface ImportStats {
  total: number
  inserted: number
  skipped: number
  duplicates: number
  errors: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500
const IMPORT_USERNAME = 'happycow-import'
const IMPORT_EMAIL = 'happycow-import@system.plantspack.com'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('Missing environment variables. Ensure .env.local contains:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL')
    console.error('  SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// System user management
// ---------------------------------------------------------------------------

async function getOrCreateSystemUser(supabase: SupabaseClient): Promise<string> {
  // Look up existing system user by username
  const { data: existingUser, error: lookupError } = await supabase
    .from('users')
    .select('id')
    .eq('username', IMPORT_USERNAME)
    .maybeSingle()

  if (lookupError) {
    console.error(`Error looking up system user: ${lookupError.message}`)
    process.exit(1)
  }

  if (existingUser) {
    console.log(`Using existing system user: ${existingUser.id}`)
    return existingUser.id
  }

  // Create a new system user via Supabase Auth admin API, then insert profile
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: IMPORT_EMAIL,
    email_confirm: true,
    user_metadata: { username: IMPORT_USERNAME, is_system: true },
  })

  if (authError) {
    console.error(`Error creating auth user: ${authError.message}`)
    process.exit(1)
  }

  const userId = authUser.user.id

  // Insert the profile row (the trigger may handle this, but be explicit)
  const { error: profileError } = await supabase.from('users').upsert(
    {
      id: userId,
      email: IMPORT_EMAIL,
      username: IMPORT_USERNAME,
      first_name: 'HappyCow',
      last_name: 'Import',
      bio: 'System account for HappyCow data imports',
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    console.error(`Error creating user profile: ${profileError.message}`)
    process.exit(1)
  }

  console.log(`Created system user: ${userId}`)
  return userId
}

// ---------------------------------------------------------------------------
// Data loading & validation
// ---------------------------------------------------------------------------

function loadRecords(filePath: string): HappyCowRecord[] {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`)
    process.exit(1)
  }

  const lines = fs.readFileSync(absolutePath, 'utf-8').split('\n').filter(Boolean)
  const records: HappyCowRecord[] = []

  for (const line of lines) {
    try {
      records.push(JSON.parse(line) as HappyCowRecord)
    } catch {
      // Skip malformed lines
    }
  }

  return records
}

function isValid(record: HappyCowRecord): boolean {
  if (!record.name || record.name.trim().length === 0) return false
  if (!record.address || record.address.trim().length === 0) return false
  return true
}

function toPlaceInsert(record: HappyCowRecord, createdBy: string): PlaceInsert {
  return {
    name: record.name.trim(),
    address: record.address.trim(),
    latitude: record.latitude ?? 0,
    longitude: record.longitude ?? 0,
    description: record.description?.trim() || null,
    category: 'restaurant',
    cuisine_types: record.cuisine_types,
    vegan_level: record.vegan_level,
    images: record.images,
    website: record.website,
    phone: record.phone,
    source: 'happycow',
    source_id: record.source_id,
    created_by: createdBy,
    is_pet_friendly: false,
  }
}

// ---------------------------------------------------------------------------
// Batch insert
// ---------------------------------------------------------------------------

async function batchInsert(
  supabase: SupabaseClient,
  records: PlaceInsert[],
  stats: ImportStats
): Promise<void> {
  // Use upsert with the unique (source, source_id) index for dedup
  const { data, error } = await supabase
    .from('places')
    .upsert(records, {
      onConflict: 'source,source_id',
      ignoreDuplicates: true,
    })
    .select('id')

  if (error) {
    console.error(`  Batch insert error: ${error.message}`)
    stats.errors += records.length
    return
  }

  const insertedCount = data?.length ?? 0
  const duplicateCount = records.length - insertedCount
  stats.inserted += insertedCount
  stats.duplicates += duplicateCount
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: npx tsx scripts/import-happycow.ts <jsonl-file>')
    console.error('Example: npx tsx scripts/import-happycow.ts scripts/data/happycow-new-york-city.jsonl')
    process.exit(1)
  }

  console.log('--- HappyCow Import Pipeline ---')
  console.log(`Input file: ${filePath}`)
  console.log('')

  const supabase = getSupabaseClient()

  // Get or create the system user
  console.log('Setting up system user...')
  const systemUserId = await getOrCreateSystemUser(supabase)
  console.log('')

  // Load and validate records
  console.log('Loading records...')
  const rawRecords = loadRecords(filePath)
  console.log(`Loaded ${rawRecords.length} raw records`)

  const stats: ImportStats = {
    total: rawRecords.length,
    inserted: 0,
    skipped: 0,
    duplicates: 0,
    errors: 0,
  }

  // Validate and transform
  const validInserts: PlaceInsert[] = []
  for (const record of rawRecords) {
    if (!isValid(record)) {
      stats.skipped++
      continue
    }
    validInserts.push(toPlaceInsert(record, systemUserId))
  }

  console.log(`Valid records: ${validInserts.length}`)
  console.log(`Skipped (invalid): ${stats.skipped}`)
  console.log('')

  // Batch insert
  const totalBatches = Math.ceil(validInserts.length / BATCH_SIZE)
  console.log(`Inserting in ${totalBatches} batches of up to ${BATCH_SIZE}...`)

  for (let i = 0; i < validInserts.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const batch = validInserts.slice(i, i + BATCH_SIZE)

    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} records)...`)
    await batchInsert(supabase, batch, stats)
  }

  // Summary
  console.log('')
  console.log('=== Import Summary ===')
  console.log(`Total records:  ${stats.total}`)
  console.log(`Inserted:       ${stats.inserted}`)
  console.log(`Duplicates:     ${stats.duplicates}`)
  console.log(`Skipped:        ${stats.skipped}`)
  console.log(`Errors:         ${stats.errors}`)
  console.log('')

  if (stats.errors > 0) {
    console.log('Some records failed to import. Check the error messages above.')
    process.exit(1)
  }

  console.log('Import complete!')
}

main()
