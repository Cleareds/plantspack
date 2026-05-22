import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

console.log('=== Coverage boost 2026-05-15 — final state ===\n')
for (const country of ['Croatia','Portugal','Turkey']) {
  const { count: total } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('country',country).eq('vegan_level','fully_vegan').is('archived_at',null)
  const { count: ver } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('country',country).eq('vegan_level','fully_vegan').eq('is_verified', true).is('archived_at',null)
  const { count: withImg } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('country',country).eq('vegan_level','fully_vegan').not('main_image_url','is',null).is('archived_at',null)
  console.log(`${country}: ${total} fully_vegan (${ver} verified, ${withImg} with image)`)
}
console.log('\n--- Coverage-boost imports ---')
const { count: ib } = await sb.from('places').select('id', { count: 'exact', head: true }).eq('source','coverage-boost-2026-05-15')
console.log(`Imported via coverage-boost-2026-05-15: ${ib}`)
const { count: hcPromoted } = await sb.from('places').select('id', { count: 'exact', head: true }).eq('verification_method','happycow-vegan-tag-2026-05-15')
console.log(`Promoted via happycow-vegan-tag-2026-05-15: ${hcPromoted}`)
