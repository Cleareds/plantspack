import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const lists = {
  'Porto Alegre': ['Vida Leve Marmitas','Planta Libertária','O.V.N.I','Vegan4all','Miss Veg Quicheria','Le Chocolat','Kokonut','Mai Cake Veg'],
  'Rio de Janeiro': ['Deleite Vegan','Conflor','Rede i-tal','A Vegana Real','PaVeg','JaButi','Veg In Box','Formiga Vegana','Kantan Cozinha Vegetal','Bardana','Vida Bistrô','Vida Bistro'],
  'Curitiba': ['MelkyVeg','Semente de girassol','Miraflores Gastro','Maki Vegan','Multiverso Doce','VegannA','Mix Coxinha Veg','Mucunã Veg','Pé de Cajú','Veg Urano'],
  'Belo Horizonte': ['Vegas','Mona Café','Dan Costa','Casa Umbigo','Veggie Roots','Viveg','uai veganices','Harmonia Vegan','Chocolovers Vegan','Camaradería','Camaraderia','Docevegan','Easy Vegan','Casa Maia Mazzoni','Kalapa Chocolate','Luvitá'],
  'Brasília': ['Cannelle','Apetit Natural','Ateliê Vegan','Cozinha Cultural','Mel de Engenho','Naturis','Vegan-se','Vegan se','Os Clássicos','Os Classicos','Mandacaru','TUDO VEG','Viva Vegan','Sabor na Mesa','Casinha café','Casinha cafe'],
  'Salvador': ['Ânima Cozinha','Anima Cozinha','Vegan Joy','Veganas Baianas','B-Vegan','BVegan','Rango Vegan','Vegantino','Tudo Vegano'],
}
// Also accept English/diacritic alternates already in DB
const cityAliases = { 'Brasília': ['Brasília','Brasilia'] }

const results = {}
for (const [city, names] of Object.entries(lists)) {
  results[city] = { have: [], newOnes: [] }
  for (const n of names) {
    const cities = cityAliases[city] || [city]
    let found = null
    for (const c of cities) {
      const { data } = await sb.from('places').select('slug,name,vegan_level,archived_at').eq('country','Brazil').eq('city',c).ilike('name',`%${n.split(' ')[0]}%`)
      const active = data?.filter(r=>!r.archived_at) || []
      // Tight check: name contains the candidate fragment
      const cand = n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
      for (const r of active) {
        const rn = (r.name||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
        if (rn.includes(cand.split(' ')[0]) && (cand.length<6 || rn.includes(cand.slice(0,5)))) { found = r; break }
      }
      if (found) break
    }
    if (found) results[city].have.push({ cand:n, db:found.slug, level:found.vegan_level })
    else results[city].newOnes.push(n)
  }
}
for (const [city, r] of Object.entries(results)) {
  console.log(`\n=== ${city} ===`)
  console.log(`HAVE (${r.have.length}):`)
  for (const h of r.have) console.log(`  ${h.cand.padEnd(28)} → ${h.db} (${h.level})`)
  console.log(`NEW (${r.newOnes.length}):`)
  for (const n of r.newOnes) console.log(`  ${n}`)
}
