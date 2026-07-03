// Audit the *-fv-l3-upgrade-2026-05-25 bulk batch that over-promoted places to
// fully_vegan (No.197 Chiswick Fire Station was a gastropub). Downgrades ONLY
// high-confidence non-vegan names (hotels / pubs / steakhouse-seafood-meat),
// and NEVER touches a place whose name OR description carries a vegan signal.
// Reversible: WHERE verification_method='fv-batch-audit-downgrade-2026-07-03'.
// Dry-run by default; --apply to write.
import { createClient } from '@supabase/supabase-js'; import fs from 'fs'
const APPLY = process.argv.includes('--apply')
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY||env.SERVICE_ROLE_KEY)
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
const VEGAN=/vegan|vegano|vegana|végan|plant[\s-]?based|\bplants?\b|herbivor|seitan|\btofu\b|tempeh|jackfruit|meat[\s-]?free|animal[\s-]?free|🌱|100%\s*plant|fully\s*plant|loving hut|govinda/i
const NONVEG=[
  /\bhotel\b/,/\bhostel\b/,/\bmotel\b/,/\bresort\b/,/guest\s?house/,/bed and breakfast/,/\bb&b\b/,
  /\bpub\b/,/\btavern\b/,/brewery/,/brew\s?house/,/ale\s?house/,/sports bar/,/wine bar/,/cocktail bar/,/fire station/,/firehouse/,/\barms\b/,/\binn\b/,
  /steak\s?house/,/\bsteak\b/,/chop\s?house/,/rotisserie/,/seafood/,/\boyster/,/\bfishery\b/,/fish (and|&) chips/,/smoke\s?house/,/\bmeat\b/
]
let from=0, total=0, candidates=[]
for(;;){
  const { data } = await db.from('places').select('id,name,slug,city,country,description,tags,vegan_level,verification_method').like('verification_method','%-fv-l3-upgrade-2026-05-25').eq('vegan_level','fully_vegan').order('id').range(from,from+999)
  if(!data?.length) break
  for(const p of data){
    total++
    const n=norm(p.name), d=norm(p.description)
    if(VEGAN.test(n)||VEGAN.test(d)) continue          // protect: has a vegan signal
    const hit=NONVEG.find(re=>re.test(n))
    if(hit){ candidates.push({slug:p.slug, name:p.name, city:p.city, country:p.country, hit:String(hit)}) }
  }
  from+=1000; if(data.length<1000) break
}
console.log(`fully_vegan in batch: ${total} | downgrade candidates (non-vegan name, no vegan signal): ${candidates.length}`)
const byCountry={}; candidates.forEach(c=>byCountry[c.country]=(byCountry[c.country]||0)+1)
console.log('by country:', JSON.stringify(byCountry))
console.log('\nsample (first 40):')
candidates.slice(0,40).forEach(c=>console.log(`  ${c.name} — ${c.city}, ${c.country}  [${c.hit}]`))
if(APPLY){
  let n=0
  for(const c of candidates){
    const { data: p } = await db.from('places').select('id,tags').eq('slug',c.slug).single()
    const tags=(p.tags||[]).filter(t=>t!=='websearch_confirmed_vegan')
    const { error } = await db.from('places').update({ vegan_level:'vegan_options', tags, verification_status:'unverified', verification_method:'fv-batch-audit-downgrade-2026-07-03', verification_level:1, updated_at:new Date().toISOString() }).eq('id',p.id)
    if(!error) n++
  }
  console.log(`\nDowngraded ${n} places to vegan_options (reversible via verification_method='fv-batch-audit-downgrade-2026-07-03').`)
} else console.log('\nDRY RUN — pass --apply to downgrade.')
