/**
 * Promote 4 Leuven places to fully_vegan after WebFetch + WebSearch verification (2026-05-08).
 *   Het Strand  - brugesvegan blog, HappyCow: fully vegan since 2021
 *   Life Bar    - HappyCow + travel blogs: all items vegan
 *   Pepas       - site: "eerste volledig veganistische frituur in Belgie"
 *   Tabi Loo    - site: "an authentic vegan restaurant"
 * Sets verification_level=3, verification_method='admin_review' per add-place convention.
 */
import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const COMMIT = process.argv.includes('--commit')

const ids = [
  ['e828dd7d-27be-4c86-9e0d-256bdac2ee24', 'Het Strand'],
  ['4eff813e-53df-454f-a609-13592c798bdb', 'Life Bar'],
  ['35a03560-4776-470d-822c-3453bc7b3a80', 'Pepas'],
  ['79c968a6-ac33-4a31-a35b-a66015e6102e', 'Tabi Loo'],
]

async function main() {
  const now = new Date().toISOString()
  for (const [id, name] of ids) {
    if (!COMMIT) { console.log('DRY', name); continue }
    const { data, error } = await sb.from('places')
      .update({
        vegan_level: 'fully_vegan',
        verification_level: 3,
        verification_method: 'admin_review',
        last_verified_at: now,
      })
      .eq('id', id).select('name, vegan_level, verification_level').maybeSingle()
    if (error) console.log('ERR', name, error.message)
    else console.log('OK', data)
  }
}
main()
