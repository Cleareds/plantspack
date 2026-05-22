// Direct-URL probe approach to grab og:image for imageless Brazilian FV.
// For each place, try a small set of predictable URL patterns on
// Restaurant Guru, Wheree, abillion, Spinach, HappyCow. First hit with a
// valid og:image wins. Skip Instagram/Facebook (blocked or templated).
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { spawn } from 'node:child_process'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '500')
const APPLY = process.argv.includes('--apply')
console.log(`Mode: ${APPLY ? 'APPLY' : 'dry-run'} | Limit: ${LIMIT}`)

const { data: places } = await sb.from('places').select('id,slug,name,city')
  .eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url',null)
  .order('id').limit(LIMIT)
console.log(`Pool: ${places.length}\n`)

// Slug normalization helpers (Restaurant Guru style)
function rgSlug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-zA-Z0-9 -]/g,'').trim()
    .replace(/\s+/g,'-')
}
function lowerNoSpace(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-zA-Z0-9]/g,'').toLowerCase()
}

function candidateUrls(name, city) {
  const n = rgSlug(name)
  const c = rgSlug(city)
  const nl = lowerNoSpace(name)
  const cl = lowerNoSpace(city)
  return [
    `https://restaurantguru.com/${n}-${c}`,
    `https://restaurantguru.com.br/${n}-${c}`,
    `https://restaurantguru.com/${n}-${c}-2`,
    `https://${nl}.wheree.com/`,
    `https://${nl}-${cl}.wheree.com/`,
  ]
}

function curlOne(url) {
  return new Promise(resolve => {
    const child = spawn('curl', ['-fsSL','--max-time','12','-A','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', url], { stdio:['ignore','pipe','ignore'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    const t = setTimeout(() => { child.kill('SIGTERM'); resolve('') }, 13000)
    child.on('close', () => { clearTimeout(t); resolve(out) })
  })
}

function extractOg(html, base) {
  const m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  if (!m) return null
  let u = m[1].trim()
  if (u.startsWith('//')) u = 'https:' + u
  else if (!u.startsWith('http')) { try { u = new URL(u, base).href } catch { return null } }
  // Filter junk: site-wide logos, placeholders, tiny images
  if (/\/(logo|placeholder|default|veganizze\.jpg|happycow.+logo)/i.test(u)) return null
  if (/wheree-share-fallback|search-thumb|favicon|defaultOGImage|default_og/i.test(u)) return null
  return u
}

function attach(slug, url) {
  return new Promise(resolve => {
    const child = spawn('npx', ['tsx', 'scripts/attach-place-image.ts', '--slug', slug, '--url', url], { stdio:['ignore','pipe','pipe'] })
    let out = '', err = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', d => { err += d })
    child.on('exit', code => resolve({ ok: code === 0, output: out + err }))
  })
}

let attached = 0, scanned = 0
for (const p of places) {
  scanned++
  process.stdout.write(`[${scanned}/${places.length}] ${p.slug.slice(0,45).padEnd(45)} `)
  const urls = candidateUrls(p.name, p.city)
  let img = null
  let from = null
  for (const u of urls) {
    const html = await curlOne(u)
    if (html.length < 1000) continue
    const og = extractOg(html, u)
    if (og) { img = og; from = u; break }
  }
  if (!img) { console.log('no og:image'); continue }
  if (!APPLY) { console.log(`would attach ${img.slice(0,55)} (from ${from.slice(0,40)})`); continue }
  const r = await attach(p.slug, img)
  if (r.ok) { attached++; console.log(`✓ ${img.slice(0,55)}`) }
  else console.log(`✗ ${r.output.split('\n').filter(Boolean).pop()?.slice(0,80)||'err'}`)
  await new Promise(r => setTimeout(r, 400))
}
console.log(`\nDone. ${attached}/${scanned} attached`)
