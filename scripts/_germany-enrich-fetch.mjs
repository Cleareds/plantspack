// Bulk-enrich Germany P1 records by parallel-curling their official URLs
// and regex-extracting phone, address (German format), and opening hours.
// Updates the DB only where the field is currently NULL.
//
// Regexes target Belgian/German postal address conventions (5-digit postcode,
// "Straße/Str./Platz" street suffix) and Schema.org / openingHours JSON-LD.
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'germany-p1-enrich-2026-05-19'

const enrich = JSON.parse(fs.readFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_p1_to_enrich.json'))
const withUrl = enrich.filter(r => r.official_url && !r.official_url.includes('google.com'))
console.log(`Will fetch ${withUrl.length} URLs in parallel batches of 8...`)

function curlOne(url) {
  return new Promise(resolve => {
    const child = spawn('curl', ['-fsSL', '--max-time', '15', '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36', url], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve('') }, 16000)
    child.on('close', () => { clearTimeout(timer); resolve(out) })
  })
}

function extract(html) {
  // Phone: German pattern +49 or 0XXX
  const phoneMatches = [
    /\+49[\s\-\.]?\(?\d[\d\s\-\.\/]{5,}\d/g,
    /\b0\d{2,4}[\s\-\.]?\d[\d\s\-\.\/]{4,}\d/g,
  ]
  let phone = null
  for (const re of phoneMatches) {
    const m = html.match(re)
    if (m?.length) { phone = m[0].replace(/[\s\.\/]+/g, ' ').replace(/\s+/g, ' ').trim(); break }
  }
  // Address: 5-digit German postcode + street pattern
  const addrMatches = html.match(/[A-ZÄÖÜ][a-zäöüß\.\-\s]{2,}(?:str(?:aße|\.)|platz|allee|weg|gasse|ring)[\s,]+\d+[a-z]?(?:[,\s]+\d{5}\s+[A-ZÄÖÜ][a-zäöüß\-]+)?/g)
  let address = null
  if (addrMatches?.length) address = addrMatches[0].replace(/\s+/g, ' ').trim()
  // Email
  const email = (html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g) || []).find(e => !/sentry|google|cloudflare|wp\-/i.test(e)) || null
  // Opening hours via Schema.org JSON-LD
  const ohMatch = html.match(/"openingHours"\s*:\s*(\[?[^\]]+?\]?)/)
  let opening_hours = null
  if (ohMatch) {
    try {
      const raw = ohMatch[1].replace(/&quot;/g, '"')
      const parsed = JSON.parse(raw.startsWith('[') ? raw : `[${raw}]`)
      if (Array.isArray(parsed) && parsed.length) opening_hours = parsed.join('; ')
    } catch {}
  }
  return { phone, address, email, opening_hours }
}

// Fetch in parallel batches of 8
const CONCURRENCY = 8
const results = []
let idx = 0
async function worker() {
  while (idx < withUrl.length) {
    const i = idx++
    const r = withUrl[i]
    const html = await curlOne(r.official_url)
    if (html.length < 200) { results.push({ ...r, fetched: false }); continue }
    const data = extract(html)
    results.push({ ...r, fetched: true, ...data })
    if (i % 25 === 0) process.stdout.write(`[${i}/${withUrl.length}]`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
console.log(`\nFetched ${results.filter(r => r.fetched).length} pages`)

// Pull current DB state
const ids = withUrl.map(r => r.id).filter(Boolean)
const dbRows = []
for (let i = 0; i < ids.length; i += 500) {
  const { data } = await sb.from('places').select('id,slug,website,phone,opening_hours,address').in('id', ids.slice(i, i+500)).is('archived_at', null)
  dbRows.push(...(data||[]))
}
const byId = Object.fromEntries(dbRows.map(r => [r.id, r]))

let updated = 0, untouched = 0
for (const r of results) {
  const db = byId[r.id]
  if (!db || !r.fetched) { untouched++; continue }
  const patch = {}
  if (!db.website && r.official_url) patch.website = r.official_url
  if (!db.phone && r.phone) patch.phone = r.phone
  if (!db.opening_hours && r.opening_hours) patch.opening_hours = r.opening_hours
  if (!db.address && r.address) patch.address = r.address
  if (Object.keys(patch).length === 0) { untouched++; continue }
  patch.verification_method = TAG
  patch.last_verified_at = NOW
  const { error } = await sb.from('places').update(patch).eq('id', r.id)
  if (!error) { updated++; if (updated % 25 === 0) process.stdout.write('.') }
}
console.log(`\n  Updated: ${updated} | Untouched (no new data): ${untouched}`)
