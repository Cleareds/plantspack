import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Current FV counts per city
const cities = ['Berlin','Hamburg','Munich','Nuremberg','Leipzig','Cologne','Dresden']
console.log('CURRENT FV COUNTS:')
for (const c of cities) {
  const { count } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Germany').eq('city',c).eq('vegan_level','fully_vegan').is('archived_at',null)
  console.log(`  ${c.padEnd(12)} ${count}`)
}

// Check each "Don't miss" place
const mentions = [
  // Hamburg
  ['The Vegan Eagle','Hamburg'],['Bodhi Vegan Living','Hamburg'],['Vincent','Hamburg'],['TA Vegan House','Hamburg'],['HappenPappen','Hamburg'],
  // Munich
  ['Bodhi','Munich'],['Doctor Drooly','Munich'],['Secret Garden','Munich'],['Soy Vegan','Munich'],['Akimy','Munich'],
  // Nuremberg
  ['Veganoven','Nuremberg'],['Vegöner','Nuremberg'],['Vegoner','Nuremberg'],['Kaspar Schmauser','Nuremberg'],['Pure Food','Nuremberg'],['My Hao','Nuremberg'],['Bodhi','Nuremberg'],
  // Leipzig
  ['Symbiose','Leipzig'],['Vleischerei','Leipzig'],['Zest','Leipzig'],['BABA','Leipzig'],['Pizza LAB','Leipzig'],['GAO Vegan','Leipzig'],['Katzentempel','Leipzig'],
  // Cologne
  ['Cotell','Cologne'],['sushi green','Cologne'],['Trash Chic','Cologne'],['Virtuous Pie','Cologne'],['Vegan Junk Food Bar','Cologne'],['Hempies','Cologne'],['Vevi','Cologne'],['Maki Maki','Cologne'],['Sattgrün','Cologne'],
  // Dresden
  ['Der Dicke Schmidt','Dresden'],['Dicke Schmidt','Dresden'],['Steffenhagen','Dresden'],['Falscher Hase','Dresden'],['Vegan House','Dresden'],['V-Cake','Dresden'],['Alua','Dresden'],
]
console.log('\nPLACE LOOKUPS:')
for (const [n,c] of mentions) {
  const { data } = await sb.from('places').select('slug,name,vegan_level').eq('country','Germany').eq('city',c).ilike('name',`%${n}%`).is('archived_at',null).limit(3)
  const hit = data?.[0]
  console.log(`  ${(hit?'✓':' ').padEnd(2)} ${n.padEnd(22)} ${c.padEnd(12)} ${hit ? `${hit.slug} (${hit.vegan_level})` : '— NOT FOUND'}`)
}
