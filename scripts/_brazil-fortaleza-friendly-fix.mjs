import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-fortaleza-friendly-fix-2026-05-21'

// PROMOTE Rango Verde — confirmed fully vegan per Sabores da Cidade + Facebook/IG name "Comida Vegana"
const { error: e1 } = await sb.from('places').update({
  vegan_level: 'fully_vegan',
  address: 'Rua João Gentil, 207, Benfica, Fortaleza - CE, Brazil',
  phone: '+55 85 98848-1578',
  description: 'Fully vegan canteen in Benfica since 2017. Daily-changing menu of affordable vegan dishes (vegetable pancakes, chickpea stroganoff, coxinhas) at R$8-11. 4.8/5 on Restaurant Guru.',
  verification_method: TAG,
  verification_level: 3,
  last_verified_at: NOW,
}).eq('slug','rango-verde')
console.log(e1?`✗ Rango Verde: ${e1.message}`:'✓ Rango Verde → fully_vegan')

// DOWNGRADE Bacio di Latte — Italian gelateria, mostly dairy, only "vegan-friendly flavors"
const { error: e2 } = await sb.from('places').update({
  vegan_level: 'vegan_options',
  description: 'Italian gelateria with a few vegan/sorbet flavors among the traditional dairy line. Not a fully vegan venue.',
  verification_method: TAG,
  last_verified_at: NOW,
}).eq('slug','bacio-di-latte-fortaleza')
console.log(e2?`✗ Bacio: ${e2.message}`:'✓ Bacio di Latte → vegan_options')

// DOWNGRADE Crocobeach — beach bar with seafood + meat + sushi + grill
const { error: e3 } = await sb.from('places').update({
  vegan_level: 'vegan_options',
  description: 'Beach bar/restaurant complex with mixed cuisine (seafood, sushi, pasta, grill, salads). Some plant-based options on the salad/sushi menu but not vegan-focused.',
  verification_method: TAG,
  last_verified_at: NOW,
}).eq('slug','crocobeach')
console.log(e3?`✗ Croco: ${e3.message}`:'✓ Crocobeach → vegan_options')

// Descoberta + Veglivre + Café Santa Clara stay at vegan_friendly (cafeteria with veg focus but evidence weak for FV)
console.log('  Descoberta, Veglivre, Café Santa Clara: kept at vegan_friendly (no FV evidence)')

const { count: fz } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('city','Fortaleza').is('archived_at',null)
const { count: fzFv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('city','Fortaleza').eq('vegan_level','fully_vegan').is('archived_at',null)
console.log(`\nFortaleza now: ${fz} places, ${fzFv} FV`)
