// Take a JSON file of [{slug, url}] pairs, curl each url, extract og:image,
// attach to the slug. Stats reported at end. Idempotent — skips slugs that
// already have an image.
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const FILE = process.argv[2] || '/tmp/br-attach-queue.json'
const pairs = JSON.parse(readFileSync(FILE, 'utf-8'))
console.log(`Queue: ${pairs.length}`)

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

let attached = 0, skipped = 0, failed = 0
for (let i = 0; i < pairs.length; i++) {
  const { slug, url } = pairs[i]
  process.stdout.write(`[${i+1}/${pairs.length}] ${slug.slice(0,40).padEnd(40)} `)
  const { data: place } = await sb.from('places').select('main_image_url').eq('slug', slug).maybeSingle()
  if (!place) { console.log('not found'); failed++; continue }
  if (place.main_image_url) { console.log('already has image'); skipped++; continue }
  const html = await curlOne(url)
  if (html.length < 500) { console.log('fetch failed'); failed++; continue }
  const og = extractOg(html, url)
  if (!og) { console.log('no og:image'); failed++; continue }
  const r = await attach(slug, og)
  if (r.ok) { attached++; console.log(`✓ ${og.slice(0,55)}`) }
  else { failed++; console.log(`✗ ${r.output.split('\n').filter(Boolean).pop()?.slice(0,60)}`) }
  await new Promise(r => setTimeout(r, 300))
}
console.log(`\n${attached} attached, ${skipped} already-had, ${failed} failed`)
