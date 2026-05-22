import fs from 'node:fs'
import { spawn } from 'node:child_process'

const coords = {
  'Paphos': [34.7720, 32.4297],
  'Limassol': [34.6841, 33.0379],
  'Nicosia': [35.1856, 33.3823],
  'Valletta': [35.8997, 14.5147],
  'Gżira': [35.9056, 14.4901],
  'Ljubljana': [46.0569, 14.5058],
  'Bled': [46.3683, 14.1144],
  'Piran': [45.5285, 13.5683],
  'Sofia': [42.6977, 23.3219],
  'Dubrovnik': [42.6507, 18.0944],
  'Zadar': [44.1194, 15.2314],
  'Istanbul': [41.0082, 28.9784],
  'Bodrum': [37.0344, 27.4302],
  'Antalya': [36.8969, 30.7133],
  'Kaş': [36.2018, 29.6386],
  'Çıralı': [36.4159, 30.4886],
}

const codeFor = { Cyprus: 'cy', Malta: 'mt', Slovenia: 'si', Bulgaria: 'bg', Croatia: 'hr', Turkey: 'tr' }

const candidates = JSON.parse(fs.readFileSync('scripts/seo-out/summer-hub-2026-05-16/candidates.json'))
const log = 'scripts/seo-out/summer-hub-2026-05-16/import-results-retry.jsonl'
fs.writeFileSync(log, '')

let ok = 0, fail = 0
for (let i = 0; i < candidates.length; i++) {
  const c = candidates[i]
  const ll = coords[c.city]
  if (!ll) { console.log(`  no coords for ${c.city}`); continue }
  const payload = {
    name: c.name,
    city: c.city,
    country: c.country,
    country_code: codeFor[c.country] || 'us',
    category: 'eat',
    vegan_level: c.vegan_level,
    address: c.address,
    latitude: ll[0],
    longitude: ll[1],
    description: c.notes,
    tags: ['summer_hub_2026_05']
  }
  process.stdout.write(`  [${i + 1}/${candidates.length}] ${c.city.padEnd(15)} ${c.name.slice(0, 35).padEnd(35)} `)
  const r = await new Promise(resolve => {
    const child = spawn('npx', ['tsx', 'scripts/add-place.ts', '--imported', '--force-vegan-level'], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', () => {})
    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve({ ok: false }) }, 60000)
    child.on('exit', code => {
      clearTimeout(timer)
      const ok = /Public URL/.test(out) && code === 0
      const url = out.match(/Public URL:\s*(\S+)/)?.[1]
      resolve({ ok, url })
    })
  })
  if (r.ok) { ok++; console.log(`✓`) } else { fail++; console.log('✗') }
  fs.appendFileSync(log, JSON.stringify({ ...c, ...r }) + '\n')
}
console.log(`\nDone. ${ok} ok, ${fail} failed`)
