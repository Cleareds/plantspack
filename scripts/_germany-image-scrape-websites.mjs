// Scrape og:image / twitter:image from each FV place's own website.
// Calls scripts/attach-place-image.ts to download + rehost on Supabase.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { spawn } from 'node:child_process'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: places } = await sb.from('places').select('id,slug,name,city,website')
  .eq('country','Germany').eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url',null)
  .not('website','is',null).order('id')
const targets = places.filter(p => /^https?:\/\//.test(p.website))
console.log(`Targets with website: ${targets.length}`)

function curlOne(url) {
  return new Promise(resolve => {
    const child = spawn('curl', ['-fsSL', '--max-time', '15', '-A',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      url], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    const t = setTimeout(() => { child.kill('SIGTERM'); resolve('') }, 16000)
    child.on('close', () => { clearTimeout(t); resolve(out) })
  })
}

function extractImage(html, base) {
  const og = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  if (og && og[1]) return absolute(og[1], base)
  const tw = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
  if (tw && tw[1]) return absolute(tw[1], base)
  // First reasonable <img>
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
  for (const m of imgs) {
    const u = absolute(m[1], base)
    if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(u) && !/logo|favicon|sprite|icon|emoji|placeholder|avatar/i.test(u)) return u
  }
  return null
}
function absolute(u, base) {
  if (u.startsWith('//')) return 'https:' + u
  if (u.startsWith('http')) return u
  try { return new URL(u, base).href } catch { return u }
}

function attach(slug, url) {
  return new Promise(resolve => {
    const child = spawn('npx', ['tsx', 'scripts/attach-place-image.ts', '--slug', slug, '--url', url], { stdio:['ignore','pipe','pipe'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    child.on('exit', code => resolve(code === 0))
  })
}

let ok = 0, miss = 0
for (let i = 0; i < targets.length; i++) {
  const p = targets[i]
  process.stdout.write(`[${i+1}/${targets.length}] ${p.name.slice(0,30).padEnd(30)} `)
  const html = await curlOne(p.website)
  if (html.length < 200) { miss++; console.log('fetch✗'); continue }
  const img = extractImage(html, p.website)
  if (!img) { miss++; console.log('no img'); continue }
  const success = await attach(p.slug, img)
  if (success) { ok++; console.log(`✓ ${img.slice(0,60)}`) } else { miss++; console.log('attach✗') }
}
console.log(`\nDone. ${ok}/${targets.length} attached, ${miss} missed.`)
