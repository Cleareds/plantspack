import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const APPLY = process.argv.includes('--apply')
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function geocode(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=en&q=${encodeURIComponent(q)}`,
    { headers: { 'User-Agent': 'plantspack-events/1.0 (anton.kravchuk@vaimo.com)' } })
  if (!r.ok) return null
  const j = await r.json()
  return j[0] ? { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon) } : null
}

const { data } = await sb.from('posts').select('id, slug, event_data').eq('category', 'event')
let done = 0, skip = 0, fail = 0
for (const p of data) {
  const ed = p.event_data || {}
  if (ed.latitude != null && ed.longitude != null) { skip++; continue }
  // Online / worldwide events have no place on a map: never give them coordinates.
  if (/\b(online|worldwide|virtual)\b/i.test(`${ed.location || ''} ${ed.city || ''}`)) { skip++; continue }
  // Prefer the full location string, fall back to "city, country".
  // A venue name alone ("Dry Clean Only", "Avalon Ballroom") matches places in
  // other countries, so always append the city and country it lacks.
  const loc = ed.location && /[a-z]/i.test(ed.location) ? ed.location : ''
  const lower = loc.toLowerCase()
  const q = [loc, ed.city && !lower.includes(String(ed.city).toLowerCase()) ? ed.city : '', ed.country && !lower.includes(String(ed.country).toLowerCase()) ? ed.country : '']
    .filter(Boolean).join(', ')
  if (!q) { fail++; continue }
  const g = await geocode(q)
  await sleep(1100) // Nominatim: max 1 req/sec
  if (!g) {
    // retry with city,country if location string failed
    const alt = [ed.city, ed.country].filter(Boolean).join(', ')
    const g2 = alt && alt !== q ? await geocode(alt) : null
    await sleep(1100)
    if (!g2) { console.log(`  ✗ ${ed.title || p.slug}: "${q}"`); fail++; continue }
    Object.assign(ed, { latitude: g2.lat, longitude: g2.lon, geocoded_from: 'city' })
  } else {
    Object.assign(ed, { latitude: g.lat, longitude: g.lon, geocoded_from: 'location' })
  }
  if (APPLY) {
    const { error } = await sb.from('posts').update({ event_data: ed }).eq('id', p.id)
    if (error) { console.log(`  DB err ${p.slug}: ${error.message}`); fail++; continue }
  }
  done++
  if (done % 10 === 0) console.log(`  geocoded ${done}...`)
}
console.log(`\n${APPLY ? 'APPLIED' : 'DRY'} — geocoded ${done}, already had ${skip}, failed ${fail}`)
