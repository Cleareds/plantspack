import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

// 1. Archive Symbiose Leipzig (closed Aug 2023)
const sym = await sb.from('places').update({
  archived_at: NOW,
  verification_method: 'germany-blog-factcheck-symbiose-closed-2026-05-20',
}).eq('slug','symbiose-leipzig-leipzig').is('archived_at',null).select('slug,name')
console.log('Symbiose Leipzig archive:', sym.data?.length ? `✓ archived ${sym.data[0].slug}` : 'no match / already archived')

// 2. Dedup MakiMaki / sushi-green Cologne — same venue
const { data: dup } = await sb.from('places').select('id,slug,name,city,address,website').in('slug',['sushi-green-cologne-cologne','maki-maki-sushi-green-koln-cologne'])
console.log('\nDup pair:')
for (const r of dup) console.log(`  ${r.slug.padEnd(40)} | ${r.name.padEnd(28)} | ${(r.address||'').slice(0,40)}`)
const keeper = dup.find(r => r.slug === 'maki-maki-sushi-green-koln-cologne')
const loser = dup.find(r => r.slug === 'sushi-green-cologne-cologne')
if (keeper && loser) {
  const { error } = await sb.from('places').update({
    archived_at: NOW,
    verification_method: 'germany-blog-factcheck-dedup-makimaki-2026-05-20',
  }).eq('id', loser.id)
  console.log(error ? `✗ ${error.message}` : `✓ Archived ${loser.slug} (dup of ${keeper.slug})`)
}

// 3. Flag VJFB Cologne for admin review
const { data: vjfb } = await sb.from('places').select('id').eq('slug','vegan-junk-food-bar-cologne-cologne').maybeSingle()
if (vjfb) {
  const { error } = await sb.from('place_corrections').insert({
    place_id: vjfb.id, user_id: ADMIN, status: 'pending',
    corrections: { proposed_action: 'verify_open_status', conflict: 'HappyCow says CLOSED, mit-vergnuegen still lists as open' },
    note: 'CLI-REVIEW germany-blog-factcheck-2026-05-20: status mismatch HappyCow vs other sources. Admin to verify current state.'
  })
  console.log(error ? `✗ VJFB queue: ${error.message}` : `✓ Queued VJFB Cologne for admin review`)
}

// 4. Final counts after fixes
const cities = ['Berlin','Hamburg','Munich','Nuremberg','Leipzig','Cologne','Dresden']
console.log('\nUPDATED FV counts:')
for (const c of cities) {
  const { count } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Germany').eq('city',c).eq('vegan_level','fully_vegan').is('archived_at',null)
  console.log(`  ${c.padEnd(12)} ${count}`)
}
