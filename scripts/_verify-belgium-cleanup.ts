/**
 * Post-cleanup verification for the Belgium audit run (2026-05-08).
 * Counts vegan-level distribution, image coverage, archived merges,
 * and spot-checks 3 of the upgraded fully_vegan rows.
 */
import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  // Vegan-level distribution
  const { data: levels } = await sb.from('places').select('vegan_level').eq('country', 'Belgium').is('archived_at', null)
  const counts: Record<string, number> = {}
  for (const r of levels || []) counts[r.vegan_level || 'null'] = (counts[r.vegan_level || 'null'] || 0) + 1
  console.log('Belgium active vegan_level distribution:')
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(16)} ${v}`)

  // Image coverage
  const { count: total } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', 'Belgium').is('archived_at', null)
  const { count: withImg } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', 'Belgium').is('archived_at', null).not('main_image_url', 'is', null)
  console.log(`\nBelgium image coverage: ${withImg} / ${total} (${((withImg!/total!)*100).toFixed(1)}%)`)

  // Archived merges
  const { count: archived } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', 'Belgium').not('archived_at', 'is', null).like('archived_reason', '%2026-05-08%')
  console.log(`Belgium rows archived in this run: ${archived}`)

  // Spot-check FV upgrades
  const { data: fv } = await sb.from('places').select('name, slug, vegan_level, verification_level, verification_method')
    .in('id', ['e828dd7d-27be-4c86-9e0d-256bdac2ee24','4eff813e-53df-454f-a609-13592c798bdb','35a03560-4776-470d-822c-3453bc7b3a80','79c968a6-ac33-4a31-a35b-a66015e6102e'])
  console.log('\nLeuven FV upgrades:')
  for (const r of fv || []) console.log(`  ${r.name.padEnd(15)} ${r.vegan_level}  L${r.verification_level} (${r.verification_method})`)

  // Sample descriptions
  const { data: sampleDesc } = await sb.from('places').select('name, description').eq('country','Belgium').in('id', ['7ef33e61-4d24-4b49-9680-bff11c2adab8','c6847c05-6638-42b0-8865-d0c9e0899672','3bf32bbc-b3f3-4ab7-9a3f-92257d66acd4'])
  console.log('\nSample descriptions:')
  for (const r of sampleDesc || []) console.log(`  ${r.name}: ${r.description}`)
}
main().catch(e => { console.error(e); process.exit(1) })
