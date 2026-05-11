import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Match by exact "Starbucks" or "Starbucks <anything>" / "<anything> Starbucks"
  // — case-insensitive. Exclude already-archived.
  const { data, error, count } = await sb
    .from('places')
    .select('id, slug, name, city, country, category, vegan_level, verification_method, is_verified, source, created_at, archived_at', { count: 'exact' })
    .or('name.ilike.starbucks,name.ilike.starbucks %,name.ilike.% starbucks,name.ilike.% starbucks %,name.ilike.starbucks coffee%,name.ilike.starbucks reserve%')
    .is('archived_at', null)
    .limit(1000)

  if (error) { console.error(error); return }

  console.log('Total active Starbucks rows:', count)
  console.log('Rows returned:', data?.length)

  // Group by vegan_level
  const byLevel: Record<string, number> = {}
  for (const p of data || []) byLevel[p.vegan_level ?? 'null'] = (byLevel[p.vegan_level ?? 'null'] ?? 0) + 1
  console.log('\nby vegan_level:', byLevel)

  const byCategory: Record<string, number> = {}
  for (const p of data || []) byCategory[p.category ?? 'null'] = (byCategory[p.category ?? 'null'] ?? 0) + 1
  console.log('by category:', byCategory)

  const byCountry: Record<string, number> = {}
  for (const p of data || []) byCountry[p.country ?? 'null'] = (byCountry[p.country ?? 'null'] ?? 0) + 1
  console.log('top countries:')
  console.table(Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 15))

  const bySource: Record<string, number> = {}
  for (const p of data || []) bySource[p.source ?? 'null'] = (bySource[p.source ?? 'null'] ?? 0) + 1
  console.log('by source tag:', bySource)

  // Any tagged as fully_vegan or mostly_vegan? Those are objectively wrong.
  const wrongTier = (data || []).filter(p => p.vegan_level === 'fully_vegan' || p.vegan_level === 'mostly_vegan')
  console.log('\n!!! Starbucks rows tagged fully_vegan / mostly_vegan (must fix):', wrongTier.length)
  for (const p of wrongTier.slice(0, 25)) {
    console.log(`  - ${p.name} | ${p.city}, ${p.country} | ${p.vegan_level} | source=${p.source} | /place/${p.slug}`)
  }

  // Tagged vegan_friendly — debatable. Coffee chain Platonic form is plant-based
  // so per chain policy they could stay as vegan_options, but vegan_friendly
  // overstates the menu reality.
  const friendly = (data || []).filter(p => p.vegan_level === 'vegan_friendly')
  console.log('\nStarbucks tagged vegan_friendly:', friendly.length)
}
main()
