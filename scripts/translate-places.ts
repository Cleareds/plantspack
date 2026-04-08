/**
 * Translate non-English place names and descriptions to English
 *
 * Uses free Google Translate (unofficial) with rate limiting.
 * Only translates text that appears to be non-English/non-Latin.
 *
 * Usage:
 *   npx tsx scripts/translate-places.ts
 *   npx tsx scripts/translate-places.ts --dry-run
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import * as fs from 'fs'

const INPUT = 'scripts/import-ready-places.json'
const DRY_RUN = process.argv.includes('--dry-run')

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Detect if text contains non-Latin characters (CJK, Cyrillic, Arabic, Thai, etc.)
function hasNonLatinChars(text: string): boolean {
  // Match CJK, Cyrillic, Arabic, Thai, Devanagari, Korean, Japanese
  return /[\u0400-\u04FF\u0600-\u06FF\u0E00-\u0E7F\u0900-\u097F\u3000-\u9FFF\uAC00-\uD7AF\u3040-\u309F\u30A0-\u30FF\u1100-\u11FF\uFE30-\uFE4F]/.test(text)
}

// Detect if text is likely English already
function isLikelyEnglish(text: string): boolean {
  if (!text || text.length < 5) return true
  // If more than 80% is ASCII letters/basic Latin, consider it English/Latin enough
  const latinChars = text.replace(/[^a-zA-Z\u00C0-\u024F]/g, '').length
  const totalLetters = text.replace(/[^a-zA-Z\u0080-\uFFFF]/g, '').length
  if (totalLetters === 0) return true
  return latinChars / totalLetters > 0.7
}

// Free translation via Google Translate (unofficial endpoint)
async function translateText(text: string, targetLang: string = 'en'): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    clearTimeout(timer)

    if (!resp.ok) return null

    const data = await resp.json()
    // Response is nested arrays: [[["translated text","original text",...],...],...]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0].map((segment: any[]) => segment[0]).join('')
      const detectedLang = data[2] // source language code
      // Don't "translate" if already English
      if (detectedLang === 'en') return null
      return translated
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  console.log('🌐 Place Translation Pipeline')
  console.log('==============================\n')

  const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'))
  const places = data.places as any[]
  console.log(`Loaded ${places.length} places`)

  // Find places needing translation
  const needsTranslation: { index: number; field: 'name' | 'description'; text: string }[] = []

  for (let i = 0; i < places.length; i++) {
    const p = places[i]

    // Check description
    if (p.description && !isLikelyEnglish(p.description) && p.description.length > 10) {
      needsTranslation.push({ index: i, field: 'description', text: p.description })
    }

    // Check name (only if non-Latin — we keep Latin-script names like "Café Végétal" as-is)
    if (p.name && hasNonLatinChars(p.name)) {
      needsTranslation.push({ index: i, field: 'name', text: p.name })
    }
  }

  console.log(`Found ${needsTranslation.length} fields to translate`)

  if (DRY_RUN) {
    console.log('\nDry run — showing first 10:')
    for (const item of needsTranslation.slice(0, 10)) {
      const p = places[item.index]
      console.log(`  ${p.country} | ${item.field}: "${item.text.slice(0, 60)}..."`)
    }
    return
  }

  if (needsTranslation.length === 0) {
    console.log('Nothing to translate!')
    return
  }

  let translated = 0
  let failed = 0
  const startTime = Date.now()

  for (let i = 0; i < needsTranslation.length; i++) {
    const item = needsTranslation[i]
    const place = places[item.index]

    const result = await translateText(item.text)

    if (result && result !== item.text) {
      if (item.field === 'name') {
        // Store original name, set English name
        place.name_original = place.name
        place.name = result
      } else {
        // Replace description with English translation
        place.description_original = place.description
        place.description = result
      }
      translated++
    } else {
      failed++
    }

    // Progress
    if (i % 20 === 0 && i > 0) {
      const elapsed = (Date.now() - startTime) / 1000
      const rate = i / elapsed
      const eta = Math.round((needsTranslation.length - i) / rate)
      process.stdout.write(
        `\r  Progress: ${i}/${needsTranslation.length} (${translated} translated, ${failed} skipped) — ETA ${Math.floor(eta / 60)}m${eta % 60}s   `
      )
    }

    // Rate limit: ~2 req/sec to avoid getting blocked
    await sleep(500)
  }

  console.log(`\n\n  Translated: ${translated}`)
  console.log(`  Skipped/failed: ${failed}`)

  // Write output
  data.metadata.translatedAt = new Date().toISOString()
  data.metadata.translatedCount = translated
  fs.writeFileSync(INPUT, JSON.stringify(data, null, 2))
  console.log(`\n✅ Updated ${INPUT}`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
