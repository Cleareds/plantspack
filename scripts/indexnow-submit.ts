/**
 * One-shot bulk submission of every indexable URL on plantspack.com to
 * IndexNow (api.indexnow.org, which fans out to Bing + Yandex + others).
 *
 * Pulls URLs directly from the DB + the tiered sitemap build logic so the
 * submission matches what Google sees. Sends in batches of up to 10,000
 * (IndexNow per-request limit) with a short delay between batches to stay
 * polite.
 *
 * Re-run after bulk imports, major URL-structure changes, or whenever we
 * want to remind Bing that something has updated. Idempotent — Bing
 * dedupes on their end.
 *
 * USAGE:
 *   tsx scripts/indexnow-submit.ts --dry-run
 *   tsx scripts/indexnow-submit.ts --submit
 *   tsx scripts/indexnow-submit.ts --submit --limit 100       # quick sanity check
 *   tsx scripts/indexnow-submit.ts --submit --host plantspack.com --key <other>
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const args = process.argv.slice(2)
function flagValue(name: string): string | undefined {
  const idx = args.indexOf(name)
  return idx >= 0 ? args[idx + 1] : undefined
}

const DRY_RUN = !args.includes('--submit')
const LIMIT_STR = flagValue('--limit')
const LIMIT = LIMIT_STR ? parseInt(LIMIT_STR, 10) : Infinity
const HOST = flagValue('--host') || 'www.plantspack.com'
const KEY = flagValue('--key') || '8f272b2ec2734bccb066c813264d61d4'
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`
const ENDPOINT = 'https://api.indexnow.org/indexnow'
const BATCH_SIZE = 10_000
const BATCH_DELAY_MS = 2_000
// IndexNow requires every URL's hostname to match the `host` field exactly.
// Vercel 307-redirects apex → www, so use the www-prefixed host consistently
// for both the urlList entries AND the keyLocation.
const SITE_URL = `https://${HOST}`

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function slugify(s: string): string {
  return (s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function collectUrls(): Promise<string[]> {
  const urls = new Set<string>()

  // Static routes we always want indexed
  for (const path of [
    '', '/map', '/vegan-places', '/recipes', '/events', '/packs',
    '/city-ranks', '/blog', '/support', '/about', '/contact',
    '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/guidelines',
  ]) {
    urls.add(`${SITE_URL}${path}`)
  }

  // Places — paginate since Supabase caps at 1000 per query.
  console.log('  [places]')
  let offset = 0
  while (true) {
    const { data, error } = await sb.from('places')
      .select('slug, city, country')
      .is('archived_at', null)
      .not('slug', 'is', null)
      .range(offset, offset + 999)
    if (error) { console.error('  places error:', error.message); break }
    if (!data?.length) break
    for (const p of data as any[]) {
      if (p.slug) urls.add(`${SITE_URL}/place/${p.slug}`)
      if (p.country) {
        const cs = slugify(p.country)
        if (cs) urls.add(`${SITE_URL}/vegan-places/${cs}`)
        if (p.city) {
          const ct = slugify(p.city)
          if (ct && cs) urls.add(`${SITE_URL}/vegan-places/${cs}/${ct}`)
        }
      }
    }
    if (data.length < 1000) break
    offset += 1000
  }

  // Posts (articles, recipes, events, social)
  console.log('  [posts]')
  offset = 0
  while (true) {
    const { data, error } = await sb.from('posts')
      .select('slug, category')
      .eq('privacy', 'public')
      .is('deleted_at', null)
      .not('slug', 'is', null)
      .range(offset, offset + 999)
    if (error) { console.error('  posts error:', error.message); break }
    if (!data?.length) break
    for (const p of data as any[]) {
      if (!p.slug) continue
      if (p.category === 'recipe') urls.add(`${SITE_URL}/recipe/${p.slug}`)
      else if (p.category === 'event') urls.add(`${SITE_URL}/event/${p.slug}`)
      else if (p.category === 'article') urls.add(`${SITE_URL}/blog/${p.slug}`)
      else urls.add(`${SITE_URL}/post/${p.slug}`)
    }
    if (data.length < 1000) break
    offset += 1000
  }

  // Packs
  console.log('  [packs]')
  const { data: packs } = await sb.from('packs')
    .select('slug').eq('is_published', true).not('slug', 'is', null)
  for (const p of (packs || []) as any[]) {
    if (p.slug) urls.add(`${SITE_URL}/packs/${p.slug}`)
  }

  // Public user profiles — helpful but not essential. Skip if too many.
  console.log('  [profiles]')
  const { data: users } = await sb.from('users')
    .select('username').eq('is_banned', false).limit(5000)
  for (const u of (users || []) as any[]) {
    if (u.username) urls.add(`${SITE_URL}/profile/${u.username}`)
  }

  return Array.from(urls)
}

async function submitBatch(urls: string[]): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls,
    }),
  })
  const text = await res.text().catch(() => '')
  return { ok: res.ok, status: res.status, text }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : '*** LIVE SUBMIT ***'}`)
  console.log(`Host: ${HOST}`)
  console.log(`Key file: ${KEY_LOCATION}`)
  if (LIMIT !== Infinity) console.log(`Limit: first ${LIMIT} URLs`)

  console.log('\n=== Collecting URLs ===')
  const all = await collectUrls()
  const urls = all.slice(0, LIMIT)
  console.log(`Total URLs: ${all.length} (submitting ${urls.length})`)

  if (DRY_RUN) {
    console.log('\nSample (first 10):')
    urls.slice(0, 10).forEach(u => console.log(`  ${u}`))
    console.log('\nRe-run with --submit to send.')
    return
  }

  // Pre-flight: verify the key file resolves.
  const keyCheck = await fetch(KEY_LOCATION).catch(() => null)
  if (!keyCheck || !keyCheck.ok) {
    console.error(`\nABORT: key file not reachable at ${KEY_LOCATION}`)
    console.error('Deploy the /{KEY}.txt file first (it must live at the exact URL above).')
    process.exit(1)
  }
  const keyText = (await keyCheck.text()).trim()
  if (keyText !== KEY) {
    console.error(`\nABORT: key file content mismatch. Expected "${KEY}", got "${keyText}"`)
    process.exit(1)
  }
  console.log(`\n✓ Key file verified at ${KEY_LOCATION}`)

  // Batch submit.
  const batches = Math.ceil(urls.length / BATCH_SIZE)
  console.log(`\n=== Submitting ${urls.length} URLs in ${batches} batch(es) of ${BATCH_SIZE} ===`)
  let ok = 0, fail = 0
  for (let i = 0; i < batches; i++) {
    const batch = urls.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    process.stdout.write(`  batch ${i + 1}/${batches} (${batch.length} urls)… `)
    const r = await submitBatch(batch)
    console.log(`status=${r.status} ${r.ok ? '✓' : '✗'} ${r.text?.slice(0, 140) || ''}`)
    if (r.ok || r.status === 202) ok += batch.length
    else fail += batch.length
    if (i + 1 < batches) await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
  }

  console.log(`\nDone. Accepted: ${ok}, Failed: ${fail}`)
  console.log(`IndexNow fans out to Bing + Yandex + other participants automatically.`)
  console.log(`Check Bing Webmaster Tools in 24-48h for crawl activity.`)
}

main().catch(e => { console.error(e); process.exit(1) })
