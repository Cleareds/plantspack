import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const candidates = [
  'Salad Days','Sushimar Vegano','Astronauta','Pop Vegan Food','Loving Hut Vila Mariana','Loving Hut','Mount Zion','Pizza Youth','Padoca Vegan','Vaca Verde','Curry Natural','Bao Story','Novos Veganos','Sr Chau','Taste and See','Tofu com Alecrim','Veg To Go','Vegano SP','Veg Brown','Bendita Jaca','Fulana Vegana','Gourangui','di.caju','di caju','NATUREVENDAS','Afeto à Mesa','Tâmaras e doces Samira','Naturellen','Maria Quitéria','Maria fuê','LA MAIN COZINHA','Bio Café','YUCAFÉ','Yucafe'
]
for (const q of candidates) {
  const { data } = await sb.from('places').select('slug,name,vegan_level,archived_at').eq('country','Brazil').eq('city','São Paulo').ilike('name',`%${q}%`)
  const active = data?.filter(r=>!r.archived_at) || []
  console.log(`${active.length?'HAVE':'NEW '} ${q.padEnd(28)} ${active.length?`(${active[0].vegan_level})`:''}`)
}
