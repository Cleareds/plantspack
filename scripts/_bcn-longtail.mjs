import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const candidates = [
  { name: 'Morgentau', city: 'Barcelona', vegan_level: 'fully_vegan', address: 'C/ de la Llacuna 114, Barcelona, Spain', notes: 'Poblenou; fully plant-based brunch' },
  { name: 'Veganashi', city: 'Barcelona', vegan_level: 'fully_vegan', address: 'Barcelona, Spain', notes: 'Japanese vegan sushi + ramen' },
  { name: 'Quinoa Vegan Street Food', city: 'Barcelona', vegan_level: 'fully_vegan', address: 'Barcelona, Spain', notes: 'Gràcia; vegan street food' },
  { name: 'La PerraVerde', city: 'Barcelona', vegan_level: 'fully_vegan', address: 'Barcelona, Spain', notes: 'Gràcia; vegan-friendly cafe' },
  { name: 'Blu Bar Barcelona', city: 'Barcelona', vegan_level: 'fully_vegan', address: 'Rambla del Poblenou, Barcelona, Spain', notes: 'Poblenou; vegan tapas, pizza, burgers' },
  { name: 'Amma Gelato', city: 'Barcelona', vegan_level: 'fully_vegan', address: 'Barcelona, Spain', notes: 'Vegan gelato; Italian-style' },
]

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
const { data: bcn } = await sb.from('places').select('id,name,vegan_level').eq('country', 'Spain').eq('city', 'Barcelona').is('archived_at', null)
const ourBy = new Map()
for (const r of bcn || []) ourBy.set(norm(r.name), r)

const toImport = []
for (const c of candidates) {
  const cn = norm(c.name)
  const cnStripped = cn.replace(/\bbarcelona\b/g, '').trim()
  const hit = bcn.find(r => {
    const rn = norm(r.name)
    return rn === cn || (cnStripped.length >= 5 && (rn.includes(cnStripped) || cnStripped.includes(rn)))
  })
  if (hit) {
    console.log(`SKIP ${c.name} → already as ${hit.name} (${hit.vegan_level})`)
  } else {
    toImport.push(c)
  }
}

console.log(`\nImporting ${toImport.length} new...`)
for (const c of toImport) {
  const payload = { ...c, country: 'Spain', country_code: 'es', category: 'eat', description: c.notes, tags: ['user_recommended', 'barcelona_longtail'] }
  delete payload.notes
  await new Promise(resolve => {
    const child = spawn('npx', ['tsx', 'scripts/add-place.ts', '--imported', '--force-vegan-level'], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', d => { out += d; process.stdout.write(d.toString().split('\n').filter(l => /Inserted|Public URL|✗|Error|⚠/i.test(l)).join('\n') + '\n') })
    child.stderr.on('data', d => {})
    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
    setTimeout(() => { child.kill('SIGTERM'); resolve() }, 60000)
    child.on('exit', () => resolve())
  })
}
