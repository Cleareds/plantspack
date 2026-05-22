import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Lemmy post was 29 days ago → roughly 2026-04-23
const SINCE = '2026-04-23'

// 1. Downgrades + dedup-archives since the post
const { data: downgrades } = await sb.from('places').select('id,country,vegan_level,verification_method').gte('last_verified_at', SINCE).is('archived_at',null)
const byCountry = {}
let total = 0
for (const r of downgrades || []) {
  const c = r.country
  if (!byCountry[c]) byCountry[c] = 0
  byCountry[c]++
  total++
}

// 2. FV totals and L3 counts now (key audit narrative)
const countries = ['Germany','Brazil','Belgium','Croatia','Portugal','Spain','Italy','Greece','Turkey']
console.log('AS-OF audit numbers (current state):')
for (const c of countries) {
  const { count: t } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country',c).is('archived_at',null)
  const { count: fv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country',c).eq('vegan_level','fully_vegan').is('archived_at',null)
  const { count: l3 } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country',c).eq('vegan_level','fully_vegan').is('archived_at',null).eq('verification_level',3)
  const { count: arch } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country',c).not('archived_at','is',null).gte('archived_at', SINCE)
  console.log(`  ${c.padEnd(12)} | ${String(t).padStart(5)} active | ${String(fv).padStart(4)} FV | ${String(l3).padStart(4)} L3 | ${String(arch).padStart(3)} archived since post`)
}

// 3. Specific downgrade actions tagged in verification_method since the post
const { count: gerBulk } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Germany').like('verification_method','germany-bulk-downgrade%')
const { count: gerWebVerify } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Germany').like('verification_method','germany-fv-verify%')
const { count: gerRescue } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Germany').like('verification_method','germany-fv-rescue%')
const { count: brVfBulk } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').like('verification_method','brazil-vf-bulk%')
const { count: brVfAudit } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').like('verification_method','brazil-vf-%')
const { count: brCrossborder } = await sb.from('places').select('*',{count:'exact',head:true}).like('verification_method','brazil-crossborder%')
const { count: gerCrossborder } = await sb.from('places').select('*',{count:'exact',head:true}).like('verification_method','germany-crossborder%')

console.log('\nSpecific action counts since Lemmy post:')
console.log(`  Germany bulk-downgrade (false-FV regex): ${gerBulk}`)
console.log(`  Germany web-verify FV pass: ${gerWebVerify}`)
console.log(`  Germany FV rescue (restore false-positives): ${gerRescue}`)
console.log(`  Brazil vegan_friendly bulk reclass: ${brVfBulk}`)
console.log(`  Brazil vegan_friendly all audits: ${brVfAudit}`)
console.log(`  Brazil cross-border (moved out): ${brCrossborder}`)
console.log(`  Germany cross-border (moved out): ${gerCrossborder}`)

// 4. Total platform stats
const { count: platTotal } = await sb.from('places').select('*',{count:'exact',head:true}).is('archived_at',null)
const { count: platFv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('vegan_level','fully_vegan').is('archived_at',null)
const { count: platL3 } = await sb.from('places').select('*',{count:'exact',head:true}).eq('vegan_level','fully_vegan').is('archived_at',null).eq('verification_level',3)
console.log(`\nPlatform totals (current): ${platTotal} places, ${platFv} FV, ${platL3} at L3`)
