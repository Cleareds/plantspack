// Try og:image scrape via curl for the 7 imageless FV with findable sources
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { spawn } from 'node:child_process'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const NOW = new Date().toISOString()

// Map slug → candidate image-source URLs (in order of preference)
const targets = [
  // Vêm da Terra Sorocaba has own website
  { slug: 'vem-da-terra-sorocaba-sorocaba', urls: ['https://vemdaterraemporio.com.br/'] },
  // Café com Propósito has restaurantguru
  { slug: 'cafe-com-proposito-londrina', urls: ['https://veganizze.com.br/locais/londrina-pr/cafe-com-proposito'] },
  // Clara Clariôu — cafeviagem article has photos
  { slug: 'clara-clariou-garopaba', urls: ['https://cafeviagem.com/clara-clariou-garopaba/'] },
  // Padaria Verderosa Belém — Restaurant Guru
  { slug: 'padaria-verderosa-belem', urls: ['https://restaurantguru.com/Verderosa-Belem'] },
  // Sr. Shiitake Veg
  { slug: 'sr-shiitake-veg-ribeirao-preto', urls: ['https://sr-shiitake-prudente.goomer.app/','https://veganizze.com.br/locais/ribeirao-preto-sp/sr-shiitake-veg'] },
  // Só Verde already has image from earlier — skip
  // VegRosas — only Veganizze listing
  { slug: 'vegrosas-natal', urls: ['https://veganizze.com.br/locais/natal-rn'] },
]

function curlOne(url) {
  return new Promise(resolve => {
    const child = spawn('curl', ['-fsSL','--max-time','15','-A','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', url], { stdio:['ignore','pipe','ignore'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    const t = setTimeout(() => { child.kill('SIGTERM'); resolve('') }, 16000)
    child.on('close', () => { clearTimeout(t); resolve(out) })
  })
}

function extractOg(html) {
  const m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  return m ? m[1] : null
}

function attach(slug, url) {
  return new Promise(resolve => {
    const child = spawn('npx', ['tsx', 'scripts/attach-place-image.ts', '--slug', slug, '--url', url], { stdio:['ignore','pipe','pipe'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    child.on('exit', code => resolve({ ok: code === 0, output: out }))
  })
}

let ok = 0
for (const t of targets) {
  process.stdout.write(`  ${t.slug.padEnd(38)}: `)
  let image = null
  let sourceUrl = null
  for (const url of t.urls) {
    const html = await curlOne(url)
    if (html.length < 500) continue
    const og = extractOg(html)
    if (og) {
      image = og.startsWith('//') ? 'https:'+og : og.startsWith('http') ? og : new URL(og, url).href
      sourceUrl = url
      break
    }
  }
  if (!image) { console.log('no og:image'); continue }
  const r = await attach(t.slug, image)
  if (r.ok) { console.log(`✓ ${image.slice(0,70)}`); ok++ } else { console.log(`✗ ${r.output.split('\n').pop()}`) }
}

// Flag Mandacaru Brasília for admin review (Veganizze said vegan, Tripadvisor says meat)
const { data: m } = await sb.from('places').select('id').eq('slug','mandacaru-vegan-brasilia-brasilia').maybeSingle()
if (m) {
  await sb.from('places').update({
    vegan_level: 'vegan_options',
    verification_method: 'brazil-mandacaru-misclassification-2026-05-21',
    last_verified_at: NOW,
  }).eq('id', m.id)
  await sb.from('place_corrections').insert({
    place_id: m.id, user_id: ADMIN, status: 'pending',
    corrections: { proposed_action: 'verify_or_archive', evidence: 'Conflicting sources — Veganizze.com.br listed as vegan; Tripadvisor describes Restaurante Mandacaru in Asa Sul as meat-serving Brazilian/Northeastern restaurant.' },
    note: 'CLI-REVIEW brazil-mandacaru-2026-05-21: Conflicting vegan status. Tripadvisor calls it meat-serving; Veganizze listed it as vegan. Provisionally downgraded to vegan_options pending admin verify.'
  })
  console.log('\n✓ Mandacaru Brasília downgraded to vegan_options + flagged for admin verify')
}
console.log(`\nImages attached: ${ok}/${targets.length}`)
