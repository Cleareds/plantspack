import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

config({ path: '.env.local' })

const cols = 'id, slug, name, city, country, vegan_level, category, website, phone, address, description, main_image_url, images, opening_hours, review_count, average_rating, latitude, longitude, verification_level, verification_method, verification_status, last_verified_at, source, admin_notes'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await sb
    .from('places')
    .select(cols)
    .ilike('country', 'Belgium')
    .is('archived_at', null)
    .limit(3000)
  if (error) throw error
  const snapshot = {
    country: 'Belgium',
    captured_at: new Date().toISOString(),
    count: data?.length ?? 0,
    places: data ?? [],
  }
  const outDir = join(process.cwd(), 'src/data/snapshots')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'belgium-dq.json')
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2))
  console.log(`Wrote ${snapshot.count} places to ${outPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
