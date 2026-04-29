import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await sb
    .from('places')
    .select('id, name, slug, address, vegan_level, source, website, latitude, longitude, description, cuisine_types, created_at')
    .eq('city', 'Santiago')
    .eq('country', 'Chile')
    .order('vegan_level', { ascending: true })
  if (error) { console.error(error); process.exit(1) }
  if (!data) return

  console.log(`Santiago, Chile total: ${data.length}`)
  const lvl = new Map<string, number>()
  const src = new Map<string, number>()
  let noAddr = 0, noWeb = 0, noDesc = 0
  for (const p of data) {
    lvl.set(p.vegan_level ?? 'NULL', (lvl.get(p.vegan_level ?? 'NULL') ?? 0) + 1)
    src.set(p.source ?? 'NULL', (src.get(p.source ?? 'NULL') ?? 0) + 1)
    if (!p.address || p.address.trim() === '' || p.address === 'Unknown') noAddr++
    if (!p.website) noWeb++
    if (!p.description) noDesc++
  }
  console.log('\nBy vegan_level:')
  for (const [k, v] of [...lvl.entries()].sort((a,b)=>b[1]-a[1])) console.log(`  ${v.toString().padStart(4)}  ${k}`)
  console.log('\nBy source:')
  for (const [k, v] of [...src.entries()].sort((a,b)=>b[1]-a[1])) console.log(`  ${v.toString().padStart(4)}  ${k}`)
  console.log(`\nMissing address: ${noAddr}/${data.length}`)
  console.log(`Missing website: ${noWeb}/${data.length}`)
  console.log(`Missing description: ${noDesc}/${data.length}`)

  console.log('\n=== fully_vegan sample (first 15) ===')
  const fv = data.filter(p => p.vegan_level === 'fully_vegan').slice(0, 15)
  for (const p of fv) console.log(`  ${p.name}  |  addr=${p.address || '∅'}  |  web=${p.website ? 'y' : '∅'}  |  src=${p.source ?? '∅'}`)

  console.log('\n=== Places with NO address (first 20) ===')
  const noAddrList = data.filter(p => !p.address || p.address === 'Unknown').slice(0, 20)
  for (const p of noAddrList) console.log(`  [${p.vegan_level}]  ${p.name}  |  src=${p.source ?? '∅'}  |  web=${p.website ?? '∅'}`)
}
main()
