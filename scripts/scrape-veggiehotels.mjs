// VeggieHotels.com scrape - ~700 vegan/vegetarian hotels worldwide.
//
// Phases:
//   1. enumerate: crawl /4-N-Hotels.html and /4-N-Vegan-Hotels.html to get
//      all hotel IDs + their 100%-vegan flag. Saves to state file.
//   2. fetch:     for each ID, GET the detail page, parse name, address,
//      country, phone, image, website redirect. Saves to state file
//      every 25 entries for resumability.
//   3. import:    push to Plants Pack via shared lib (separate script).
//
// Usage:
//   node scripts/scrape-veggiehotels.mjs enumerate
//   node scripts/scrape-veggiehotels.mjs fetch
//   node scripts/scrape-veggiehotels.mjs fetch --resume
//   node scripts/scrape-veggiehotels.mjs import --apply

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { runImport } from './_directory-import-lib.mjs'

const OUT = 'scripts/seo-out/veggiehotels-2026-05-24'
mkdirSync(OUT, { recursive: true })

const HOST = 'https://www.veggie-hotels.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Plants Pack-Directory/1.0'

function curlOne(url) {
  return new Promise(resolve => {
    const child = spawn('curl', ['-fsSL', '--max-time', '15', '-A', UA, url], { stdio: ['ignore','pipe','ignore'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    const t = setTimeout(() => { child.kill('SIGTERM'); resolve('') }, 16000)
    child.on('close', () => { clearTimeout(t); resolve(out) })
  })
}

// HEAD with redirect follow - returns final URL after redirects
function resolveRedirect(url) {
  return new Promise(resolve => {
    const child = spawn('curl', ['-fsILA', UA, '-o', '/dev/null', '-w', '%{url_effective}', '--max-time', '12', url], { stdio: ['ignore','pipe','ignore'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    const t = setTimeout(() => { child.kill('SIGTERM'); resolve(null) }, 13000)
    child.on('close', () => { clearTimeout(t); resolve(out.trim() || null) })
  })
}

// Probe ID range 1..MAX to find valid hotels. Invalid IDs return the home
// page (title "VeggieHotels") - valid ones have a real H1 like "Hotel
// Nicolay 1881". Throttled at 400ms per request.
async function enumerateAll() {
  console.log('Probing hotel IDs from VeggieHotels...')
  const MAX_ID = parseInt(process.env.VH_MAX_ID || '2000')
  const ids = []
  let consecutiveBlanks = 0

  for (let id = 1; id <= MAX_ID; id++) {
    const url = `${HOST}/11-0-${id}.html`
    const html = await curlOne(url)
    const h1Match = html.match(/<h1>([^<]+)<\/h1>/)
    const title = h1Match?.[1].trim()
    // Skip if no h1 or if it's the generic home page H1
    if (!title || /^VeggieHotels$|^Welcome/i.test(title)) {
      consecutiveBlanks++
      // Early-exit after 50 consecutive misses past the last hit
      if (consecutiveBlanks > 100 && ids.length > 100) {
        console.log(`  > 100 consecutive blanks past id ${id}, stopping`)
        break
      }
    } else {
      ids.push(String(id))
      consecutiveBlanks = 0
      if (ids.length % 25 === 0) {
        console.log(`  id ${id}: ${title.slice(0, 50)} (${ids.length} found so far)`)
      }
    }
    if (id % 50 === 0) {
      writeFileSync(`${OUT}/enumerate.json`, JSON.stringify({ total: ids.length, ids, probed_up_to: id }, null, 2))
    }
    await new Promise(r => setTimeout(r, 400))
  }

  writeFileSync(`${OUT}/enumerate.json`, JSON.stringify({ total: ids.length, ids, probed_up_to: MAX_ID }, null, 2))
  console.log(`\nEnumerated ${ids.length} hotels. Saved to ${OUT}/enumerate.json`)
}

function parseDetail(html, id, isVegan) {
  // Strip script/style for safer regex matching
  const cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')

  const name = (cleaned.match(/<h1>([^<]+)<\/h1>/) || [])[1]?.trim()
  const locLine = (cleaned.match(/<h2>([^<]+)<\/h2>/) || [])[1]?.trim()  // "City, State/Country"
  const ogImage = (html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/) || [])[1]

  // Contact block: "Adresse / Kontakt ... Telefon: ..."
  const contactMatch = cleaned.match(/(Adresse[^:]*:|Kontakt|Adresse \/ Kontakt)([\s\S]{0,1500})/)
  let address = null, country = null, phone = null
  if (contactMatch) {
    const block = contactMatch[2].replace(/<[^>]+>/g, ' ').replace(/&shy;/g, '').replace(/\s+/g, ' ').trim()
    // Phone
    const ph = block.match(/Tel(?:efon|\.)?\s*:?\s*([+()\d\s./-]{7,30})/)
    if (ph) phone = ph[1].replace(/\s+/g, ' ').trim()
    // Country = last word-block before "Telefon"
    const before = block.split(/Tel(?:efon|\.)?/)[0]
    // address parse: typically "STREET NUM ZIP CITY COUNTRY"
    const tokens = before.split(/\s+/).filter(Boolean)
    if (tokens.length >= 4) {
      country = tokens[tokens.length - 1]
      address = tokens.join(' ')
    } else {
      address = before.trim()
    }
  }

  // Country mapping (German names -> English)
  const COUNTRY_MAP = {
    'Deutschland': 'Germany', 'Österreich': 'Austria', 'Schweiz': 'Switzerland',
    'Italien': 'Italy', 'Spanien': 'Spain', 'Frankreich': 'France',
    'Niederlande': 'Netherlands', 'Belgien': 'Belgium', 'Großbritannien': 'United Kingdom',
    'Vereinigtes Königreich': 'United Kingdom', 'England': 'United Kingdom',
    'Schottland': 'United Kingdom', 'Wales': 'United Kingdom',
    'Portugal': 'Portugal', 'Griechenland': 'Greece', 'Schweden': 'Sweden',
    'Norwegen': 'Norway', 'Dänemark': 'Denmark', 'Finnland': 'Finland',
    'Polen': 'Poland', 'Tschechien': 'Czechia', 'Tschechische': 'Czechia',
    'Ungarn': 'Hungary', 'Kroatien': 'Croatia', 'Slowenien': 'Slovenia',
    'Türkei': 'Turkey', 'Bulgarien': 'Bulgaria', 'Rumänien': 'Romania',
    'USA': 'United States', 'Kanada': 'Canada', 'Mexiko': 'Mexico',
    'Brasilien': 'Brazil', 'Argentinien': 'Argentina', 'Chile': 'Chile',
    'Australien': 'Australia', 'Neuseeland': 'New Zealand',
    'Indien': 'India', 'Thailand': 'Thailand', 'Indonesien': 'Indonesia',
    'Sri Lanka': 'Sri Lanka', 'Nepal': 'Nepal', 'Vietnam': 'Vietnam',
    'Marokko': 'Morocco', 'Ägypten': 'Egypt', 'Südafrika': 'South Africa',
    'Israel': 'Israel', 'Costa Rica': 'Costa Rica',
  }
  if (country && COUNTRY_MAP[country]) country = COUNTRY_MAP[country]

  // City from locLine ("City, State" or "City, Country")
  let city = null
  if (locLine) {
    const parts = locLine.split(',').map(s => s.trim())
    if (parts[0]) city = parts[0]
  }

  // Room count + price
  const rooms = (cleaned.match(/Anzahl Zimmer:\s*(\d+)/) || cleaned.match(/Number of rooms:\s*(\d+)/) || [])[1]
  const priceFrom = (cleaned.match(/Preis pro Zimmer ab:\s*([\d.,]+\s*[€$£])/) || cleaned.match(/Price per room from:\s*([\d.,]+\s*[€$£])/) || [])[1]

  return {
    id, isVegan,
    name, city, country,
    address, phone,
    image: ogImage,
    rooms: rooms ? parseInt(rooms) : null,
    priceFrom,
    detailUrl: `${HOST}/11-0-${id}.html`,
  }
}

async function fetchAll(resume = false) {
  const enumPath = `${OUT}/enumerate.json`
  if (!existsSync(enumPath)) {
    console.error('Run `enumerate` first.')
    process.exit(1)
  }
  const enumData = JSON.parse(readFileSync(enumPath, 'utf-8'))
  const ids = enumData.ids

  const detailsPath = `${OUT}/details.json`
  let details = resume && existsSync(detailsPath) ? JSON.parse(readFileSync(detailsPath, 'utf-8')) : []
  const done = new Set(details.map(d => d.id))

  console.log(`Fetching details for ${ids.length} hotels (${details.length} already done)...`)

  // To detect 100% vegan vs vegetarian-with-vegan, we also crawl the
  // /4-1-Vegan-Hotels-100-vegan-kitchen.qdjE9MQ.html filter page once.
  // Hotels that appear there are 100% vegan kitchens.
  const veganFilterHtml = await curlOne(`${HOST}/4-1-Vegan-Hotels-100-vegan-kitchen.qdjE9MQ.html`)
  const veganIds = new Set(
    [...veganFilterHtml.matchAll(/href="\.\/11-0-(\d+)-/g)].map(m => m[1])
  )
  console.log(`  100%-vegan filter set: ${veganIds.size} ids`)

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    if (done.has(id)) continue
    const url = `${HOST}/11-0-${id}.html`
    const html = await curlOne(url)
    if (!html || html.length < 3000) {
      console.log(`  ${i+1}/${ids.length} id=${id}: fetch failed`)
      continue
    }
    const parsed = parseDetail(html, id, veganIds.has(id))
    details.push(parsed)
    if ((i + 1) % 25 === 0) {
      writeFileSync(detailsPath, JSON.stringify(details, null, 2))
      console.log(`  ${i+1}/${ids.length} (${details.length} parsed total) - ${parsed.name} | ${parsed.city}, ${parsed.country}${parsed.isVegan ? ' [100% vegan]' : ''}`)
    }
    await new Promise(r => setTimeout(r, 700))
  }

  writeFileSync(detailsPath, JSON.stringify(details, null, 2))
  console.log(`\nFetched ${details.length} hotel details. Saved to ${detailsPath}`)
}

async function importAll(apply) {
  const detailsPath = `${OUT}/details.json`
  if (!existsSync(detailsPath)) { console.error('Run `fetch` first.'); process.exit(1) }
  const details = JSON.parse(readFileSync(detailsPath, 'utf-8'))

  // Resolve websites (one HEAD per hotel). Skip if already resolved.
  const websitesPath = `${OUT}/websites.json`
  let websites = existsSync(websitesPath) ? JSON.parse(readFileSync(websitesPath, 'utf-8')) : {}
  for (const d of details) {
    if (websites[d.id]) continue
    const finalUrl = await resolveRedirect(`${HOST}/external/?-50b76ac51ac9e-vh_${d.id}`)
    if (finalUrl && !finalUrl.includes('veggie-hotels')) {
      websites[d.id] = finalUrl
    }
    if (Object.keys(websites).length % 25 === 0) {
      writeFileSync(websitesPath, JSON.stringify(websites, null, 2))
    }
    await new Promise(r => setTimeout(r, 500))
  }
  writeFileSync(websitesPath, JSON.stringify(websites, null, 2))

  // Build candidates
  const candidates = []
  for (const d of details) {
    if (!d.name || !d.country || !d.city) continue
    // Vegan level: marked vegan from filter -> fully_vegan, otherwise mostly_vegan
    // (the platform lists vegan + vegetarian properties; non-flagged = vegetarian).
    const vegan_level = d.isVegan ? 'fully_vegan' : 'mostly_vegan'
    candidates.push({
      name: d.name,
      city: d.city,
      country: d.country,
      address: d.address,
      phone: d.phone,
      website: websites[d.id] || null,
      main_image_url: d.image,
      category: 'hotel',
      subcategory: 'hotel',
      vegan_level,
      tags: ['vegan_hotel', 'veggiehotels_sourced', 'non_food', ...(d.isVegan ? ['100_percent_vegan'] : ['vegetarian'])],
      description: `${d.name} - ${d.isVegan ? '100% vegan' : 'vegetarian/vegan-friendly'} accommodation in ${d.city}, ${d.country}.${d.rooms ? ` ${d.rooms} rooms.` : ''}${d.priceFrom ? ` From ${d.priceFrom}/night.` : ''}`,
      source_attribution: 'veggie-hotels.com',
    })
  }

  console.log(`${candidates.length} candidates ready (${candidates.filter(c => c.vegan_level === 'fully_vegan').length} marked 100% vegan)`)

  const stats = await runImport({
    name: 'veggiehotels',
    sourceTag: 'veggiehotels-import-2026-05-24',
    candidates,
    dryRun: !apply,
  })
  console.log('\nDONE:', JSON.stringify(stats, (k, v) => k === 'errors' || k === 'inserted_slugs' ? `[${(v||[]).length} items]` : v, 2))
}

const phase = process.argv[2]
const flags = new Set(process.argv.slice(3))
if (phase === 'enumerate') await enumerateAll()
else if (phase === 'fetch') await fetchAll(flags.has('--resume'))
else if (phase === 'import') await importAll(flags.has('--apply'))
else {
  console.log('Usage: node scripts/scrape-veggiehotels.mjs <enumerate|fetch|import> [flags]')
  console.log('  enumerate:  crawl listing pages, save hotel IDs to enumerate.json')
  console.log('  fetch:      fetch each hotel detail page, save to details.json')
  console.log('              add --resume to skip already-fetched IDs')
  console.log('  import:     dry-run by default. Pass --apply to write to DB.')
}
