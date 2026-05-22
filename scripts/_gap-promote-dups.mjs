import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const toPromote = [
  { name: 'Meet Vegano', country: 'Spain' },
  { name: 'La Sociedad Herbívora', country: 'Spain' },
  { name: 'Mapa Verde', country: 'Spain' },
  { name: 'Dolcezza', country: 'Italy' },
  { name: 'NektaR', country: 'Greece' },
  { name: 'Falavela', country: 'Greece' },
  { name: 'T - Veg', country: 'Greece' },
  { name: 'Collina Bakery', country: 'Italy' },
  { name: 'Sensi Restaurant', country: 'Italy' },
  { name: 'Soul Kitchen', country: 'Italy' },
]
let ok=0
for (const t of toPromote) {
  const { data } = await sb.from('places').select('id,name,vegan_level').eq('country',t.country).ilike('name', t.name).is('archived_at',null)
  if (!data?.length) { console.log(`  no match: ${t.name}`); continue }
  for (const p of data) {
    const { error } = await sb.from('places').update({
      vegan_level: 'fully_vegan', verification_level: 2,
      verification_method: 'gap-cities-2026-05-15', last_verified_at: new Date().toISOString(),
    }).eq('id', p.id)
    if (!error) { ok++; console.log(`  + ${p.name} (was ${p.vegan_level})`) }
  }
}
console.log(`Promoted ${ok}`)
