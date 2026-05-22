import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const slugs = [
  // Hamburg
  'the-vegan-eagle-hamburg','bodhi-vegan-living-hamburg','vincent-vegan-hamburg-2','ta-vegan-house-hamburg','happenpappen-hamburg',
  // Munich
  'bodhi-munich','doctor-drooly-munich','secret-garden-vegan-sushi-munich','soy-vegan-munchen-munich','akimy-munchen',
  // Nuremberg
  'vegoner-johannis-nuremberg','pure-food-nuremberg','my-hao-nurnberg',
  // Leipzig
  'vleischerei-leipzig','zest-leipzig','baba-hand-made-cafe-leipzig','pizza-lab-leipzig','gao-vegan-leipzig','katzentempel-leipzig',
  // Cologne
  'cotell-cologne','maki-maki-sushi-green-koln-cologne','virtuous-pie-cologne','hempies-cologne','vevi-cologne','sattgrun-cologne',
  // Dresden
  'steffenhagen-dresden','falscher-hase-dresden','vegan-house-dresden','v-cake-dresden','alua-vegan-catering-and-cafe-dresden',
]
const { data } = await sb.from('places').select('slug,name,city,main_image_url').in('slug', slugs)
const bySlug = Object.fromEntries(data.map(r => [r.slug, r]))
for (const s of slugs) {
  const r = bySlug[s]
  const hasImg = !!r?.main_image_url
  console.log(`${hasImg ? '🟢' : '⚪'} ${s.padEnd(45)} | ${r?.name?.padEnd(28) || '(missing)'} | ${r?.city?.padEnd(12) || ''}`)
}
