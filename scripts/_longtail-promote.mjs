import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const promos = JSON.parse(readFileSync('scripts/seo-out/longtail-overnight-2026-05-16/promotions.json','utf8'))
let ok=0
for (const p of promos) {
  const { error } = await sb.from('places').update({
    vegan_level: p.to, verification_level: 2,
    verification_method: 'longtail-overnight-2026-05-16',
    last_verified_at: new Date().toISOString(),
  }).eq('id', p.id)
  if (!error) { ok++; console.log(`+ ${p.name}: ${p.from} -> ${p.to}`) }
  else console.log(`FAIL ${p.name}: ${error.message}`)
}
console.log(`\nPromoted ${ok}/${promos.length}`)
