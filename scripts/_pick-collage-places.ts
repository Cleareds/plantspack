import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // Pull 30 admin-reviewed fully_vegan places with images, varied countries
  // (filter out social/CDN URLs that 404 over time)
  const { data } = await sb.from('places')
    .select('name, slug, city, country, category, main_image_url')
    .is('archived_at', null)
    .eq('vegan_level','fully_vegan')
    .gte('verification_level', 3)
    .not('main_image_url', 'is', null)
    .not('main_image_url','like','%fbcdn%')
    .not('main_image_url','like','%scontent%')
    .not('main_image_url','like','%cdninstagram%')
    .limit(80)
  // Pick a varied set: spread across categories + countries
  const byKey = new Map<string, any>()
  for (const r of data || []) {
    const k = `${r.country}|${r.category}`
    if (!byKey.has(k)) byKey.set(k, r)
  }
  const picks = [...byKey.values()].slice(0, 12)
  console.log('Candidate variety pool:')
  for (const p of picks) console.log(`  ${p.name.padEnd(28)} ${p.city.padEnd(15)} ${p.country.padEnd(15)} ${p.category.padEnd(12)} ${p.main_image_url.slice(0, 80)}`)
}
main()
