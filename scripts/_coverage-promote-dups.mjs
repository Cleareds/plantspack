// Promote duplicates currently below fully_vegan up to fully_vegan when HappyCow tagged them as vegan-only.
// Uses verification_method='happycow-vegan-tag-2026-05-15', level=2, is_verified=false (admin confirms later).
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const dups = JSON.parse(readFileSync('scripts/seo-out/coverage-boost-2026-05-15/duplicates.json','utf8'))
const toPromote = dups.filter(d => d.dbLevel !== 'fully_vegan')
console.log(`Promoting ${toPromote.length} places to fully_vegan…`)
let ok = 0, fail = 0
for (const d of toPromote) {
  const { error } = await sb.from('places').update({
    vegan_level: 'fully_vegan',
    verification_level: 2,
    verification_method: 'happycow-vegan-tag-2026-05-15',
    last_verified_at: new Date().toISOString(),
  }).eq('id', d.dbId)
  if (error) { fail++; console.log(`  FAIL ${d.dbName}: ${error.message}`) }
  else { ok++ }
}
console.log(`\nPromotion done: ${ok} ok, ${fail} fail.`)
