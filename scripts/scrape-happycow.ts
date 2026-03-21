/**
 * HappyCow Scraper - Playwright-based scraper for vegan/vegetarian restaurant listings
 *
 * Usage: npx tsx scripts/scrape-happycow.ts <city-or-region>
 * Example: npx tsx scripts/scrape-happycow.ts "new-york-city"
 *
 * Output: scripts/data/happycow-<city>.jsonl
 */

import { chromium, type Browser, type Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HappyCowPlace {
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  description: string
  cuisine_types: string[]
  vegan_level: 'fully_vegan' | 'vegan_friendly' | 'vegan_options'
  images: string[]
  website: string | null
  phone: string | null
  source_id: string
}

interface ScrapeProgress {
  city: string
  lastPageIndex: number
  totalScraped: number
  lastUpdated: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'https://www.happycow.net'
const DELAY_MS = 2000
const MAX_RETRIES = 3
const DATA_DIR = path.join(__dirname, 'data')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function getOutputPath(city: string): string {
  return path.join(DATA_DIR, `happycow-${city}.jsonl`)
}

function getProgressPath(city: string): string {
  return path.join(DATA_DIR, `happycow-${city}.progress.json`)
}

function loadProgress(city: string): ScrapeProgress {
  const progressPath = getProgressPath(city)
  if (fs.existsSync(progressPath)) {
    const raw = fs.readFileSync(progressPath, 'utf-8')
    return JSON.parse(raw) as ScrapeProgress
  }
  return {
    city,
    lastPageIndex: 0,
    totalScraped: 0,
    lastUpdated: new Date().toISOString(),
  }
}

function saveProgress(progress: ScrapeProgress): void {
  progress.lastUpdated = new Date().toISOString()
  fs.writeFileSync(getProgressPath(progress.city), JSON.stringify(progress, null, 2))
}

function appendRecord(outputPath: string, record: HappyCowPlace): void {
  fs.appendFileSync(outputPath, JSON.stringify(record) + '\n')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function inferVeganLevel(text: string): HappyCowPlace['vegan_level'] {
  const lower = text.toLowerCase()
  if (lower.includes('vegan restaurant') || lower.includes('100% vegan') || lower.includes('fully vegan')) {
    return 'fully_vegan'
  }
  if (lower.includes('vegan-friendly') || lower.includes('vegan friendly')) {
    return 'vegan_friendly'
  }
  return 'vegan_options'
}

// ---------------------------------------------------------------------------
// Scraper logic
// ---------------------------------------------------------------------------

async function scrapeListingPage(page: Page, url: string): Promise<string[]> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForSelector('.venue-list, .search-result, [class*="venue"], [class*="listing"]', { timeout: 10_000 }).catch(() => {
    // Selector may differ; fall back to links
  })

  // Collect detail page links from the listing
  const links = await page.$$eval(
    'a[href*="/reviews/"]',
    (anchors) =>
      anchors
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href, idx, arr) => arr.indexOf(href) === idx)
  )

  return links
}

async function scrapeDetailPage(page: Page, url: string): Promise<HappyCowPlace | null> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  // Wait for key content
  await page.waitForSelector('h1', { timeout: 10_000 }).catch(() => {})

  const data = await page.evaluate(() => {
    const getText = (sel: string): string => {
      const el = document.querySelector(sel)
      return el?.textContent?.trim() ?? ''
    }

    const name = getText('h1')

    // Address
    const addressEl =
      document.querySelector('[class*="address"]') ??
      document.querySelector('[itemprop="address"]') ??
      document.querySelector('.address')
    const address = addressEl?.textContent?.trim() ?? ''

    // Description
    const descEl =
      document.querySelector('[class*="description"]') ??
      document.querySelector('[itemprop="description"]') ??
      document.querySelector('.entry-content')
    const description = descEl?.textContent?.trim() ?? ''

    // Cuisine / category tags
    const tagEls = document.querySelectorAll(
      '[class*="tag"], [class*="cuisine"], [class*="category-label"], .venue-tags span'
    )
    const cuisine_types = Array.from(tagEls)
      .map((el) => el.textContent?.trim() ?? '')
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)

    // Vegan level from category badges or meta
    const categoryText =
      document.querySelector('[class*="vegan-level"], [class*="venue-type"], .venue-category')?.textContent ?? ''

    // Images
    const imgEls = document.querySelectorAll(
      '[class*="gallery"] img, [class*="photo"] img, [class*="venue-image"] img, .carousel img'
    )
    const images = Array.from(imgEls)
      .map((img) => (img as HTMLImageElement).src)
      .filter((src) => src && !src.includes('placeholder') && !src.includes('data:'))
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 10)

    // Website
    const websiteEl =
      document.querySelector('a[href*="website"], a[class*="website"], [itemprop="url"]') as HTMLAnchorElement | null
    const website = websiteEl?.href ?? null

    // Phone
    const phoneEl =
      document.querySelector('[itemprop="telephone"], [class*="phone"], a[href^="tel:"]')
    let phone = phoneEl?.textContent?.trim() ?? null
    if (!phone && phoneEl) {
      phone = (phoneEl as HTMLAnchorElement).href?.replace('tel:', '') ?? null
    }

    // Lat/lng from embedded map or structured data
    let latitude: number | null = null
    let longitude: number | null = null
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    scripts.forEach((script) => {
      try {
        const json = JSON.parse(script.textContent ?? '')
        if (json.geo) {
          latitude = parseFloat(json.geo.latitude) || null
          longitude = parseFloat(json.geo.longitude) || null
        }
      } catch {
        // ignore
      }
    })
    // Also try meta tags
    if (!latitude) {
      const latMeta = document.querySelector('meta[property="place:location:latitude"]')
      const lngMeta = document.querySelector('meta[property="place:location:longitude"]')
      if (latMeta && lngMeta) {
        latitude = parseFloat(latMeta.getAttribute('content') ?? '') || null
        longitude = parseFloat(lngMeta.getAttribute('content') ?? '') || null
      }
    }

    return {
      name,
      address,
      description,
      cuisine_types,
      categoryText,
      images,
      website,
      phone,
      latitude,
      longitude,
    }
  })

  if (!data.name) {
    return null
  }

  // Extract source_id from the URL path
  const urlObj = new URL(url)
  const pathSegments = urlObj.pathname.split('/').filter(Boolean)
  const source_id = pathSegments[pathSegments.length - 1] ?? url

  return {
    name: data.name,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    description: data.description.slice(0, 2000),
    cuisine_types: data.cuisine_types,
    vegan_level: inferVeganLevel(data.categoryText || data.cuisine_types.join(' ')),
    images: data.images,
    website: data.website,
    phone: data.phone,
    source_id: `happycow-${source_id}`,
  }
}

async function scrapeWithRetry(
  page: Page,
  url: string,
  retries: number = MAX_RETRIES
): Promise<HappyCowPlace | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await scrapeDetailPage(page, url)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`  [attempt ${attempt}/${retries}] Error scraping ${url}: ${message}`)
      if (attempt < retries) {
        await sleep(DELAY_MS * attempt)
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const city = process.argv[2]
  if (!city) {
    console.error('Usage: npx tsx scripts/scrape-happycow.ts <city-or-region>')
    console.error('Example: npx tsx scripts/scrape-happycow.ts new-york-city')
    process.exit(1)
  }

  ensureDataDir()

  const outputPath = getOutputPath(city)
  const progress = loadProgress(city)

  console.log(`--- HappyCow Scraper ---`)
  console.log(`City/region: ${city}`)
  console.log(`Output:      ${outputPath}`)
  console.log(`Resuming from page: ${progress.lastPageIndex}`)
  console.log(`Previously scraped: ${progress.totalScraped} records`)
  console.log('')

  let browser: Browser | null = null

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down gracefully...')
    saveProgress(progress)
    if (browser) {
      await browser.close().catch(() => {})
    }
    console.log(`Progress saved. Total scraped: ${progress.totalScraped}`)
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const page = await context.newPage()

    let pageIndex = progress.lastPageIndex
    let consecutiveEmptyPages = 0
    const MAX_EMPTY_PAGES = 3

    while (consecutiveEmptyPages < MAX_EMPTY_PAGES) {
      pageIndex++
      const listUrl = `${BASE_URL}/searchmap?s=1&location=${encodeURIComponent(city)}&pg=${pageIndex}`
      console.log(`[Page ${pageIndex}] Fetching listing: ${listUrl}`)

      let detailLinks: string[] = []
      try {
        detailLinks = await scrapeListingPage(page, listUrl)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`  Error loading listing page ${pageIndex}: ${message}`)
        consecutiveEmptyPages++
        await sleep(DELAY_MS)
        continue
      }

      if (detailLinks.length === 0) {
        console.log(`  No listings found on page ${pageIndex}`)
        consecutiveEmptyPages++
        await sleep(DELAY_MS)
        continue
      }

      consecutiveEmptyPages = 0
      console.log(`  Found ${detailLinks.length} detail links`)

      for (const link of detailLinks) {
        console.log(`  Scraping: ${link}`)
        const record = await scrapeWithRetry(page, link)

        if (record) {
          appendRecord(outputPath, record)
          progress.totalScraped++
          console.log(`    -> ${record.name} (${record.vegan_level})`)
        } else {
          console.log(`    -> Skipped (no data extracted)`)
        }

        await sleep(DELAY_MS)
      }

      progress.lastPageIndex = pageIndex
      saveProgress(progress)
      console.log(`  Progress saved (page ${pageIndex}, total: ${progress.totalScraped})`)
      await sleep(DELAY_MS)
    }

    console.log(`\nScraping complete!`)
    console.log(`Total records: ${progress.totalScraped}`)
    console.log(`Output file:   ${outputPath}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Fatal error: ${message}`)
    saveProgress(progress)
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}

main()
