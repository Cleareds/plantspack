import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-vf-audit-batch3-2026-05-21'

const decisions = [
  { slug: 'pitza-1780', new_level: 'vegan_options', reason: 'Pizzeria with 3 vegan pizzas out of full menu; mostly traditional cheese pizzas' },
  { slug: 'el-guaton', new_level: 'vegan_options', reason: 'Chilean restaurant with meat dishes (cazuela, pastel de choclo); not vegan-focused' },
  { slug: 'estacao-do-guarana', new_level: 'vegan_options', reason: 'Casual dining 19+ years; salads/juices/açaí; vegan wrap may be removed' },
]
for (const dec of decisions) {
  const { error } = await sb.from('places').update({ vegan_level: dec.new_level, verification_method: TAG, last_verified_at: NOW }).eq('slug', dec.slug).eq('country','Brazil')
  console.log(error?`✗ ${dec.slug}: ${error.message}`:`↓ ${dec.slug} → ${dec.new_level}`)
}

// Final stats
const { count: total } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').is('archived_at',null)
const { count: fv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null)
const { count: mv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','mostly_vegan').is('archived_at',null)
const { count: vf } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','vegan_friendly').is('archived_at',null)
const { count: vo } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','vegan_options').is('archived_at',null)
console.log(`\nBRAZIL FINAL: ${total} active`)
console.log(`  fully_vegan      ${fv}`)
console.log(`  mostly_vegan     ${mv}`)
console.log(`  vegan_friendly   ${vf}`)
console.log(`  vegan_options    ${vo}`)
