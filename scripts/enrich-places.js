/**
 * Place Enrichment Script
 *
 * 1. Review uncertain places (667) and reclassify
 * 2. Scrape og:image + meta description + pet-friendly from websites
 * 3. Generate descriptions for places without one
 * 4. Reverse geocode missing cities (Nominatim)
 * 5. Output final content-rich import file
 *
 * Usage: node scripts/enrich-places.js [--concurrency=10]
 */

const fs = require('fs');

const args = process.argv.slice(2);
const concurrency = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '10');

const VERIFIED_FILE = 'scripts/verified-places.json';
const UNCERTAIN_FILE = 'scripts/uncertain-places.json';
const OUTPUT_FILE = 'scripts/import-ready-places.json';

const UA = 'PlantsPack-Verifier/1.0 (+https://plantspack.com)';

// ─── Pet-friendly keywords (multi-language) ──────────────────────────────

const PET_FRIENDLY_KEYWORDS = [
  // English
  'dog friendly', 'dog-friendly', 'dogs welcome', 'dogs allowed',
  'pet friendly', 'pet-friendly', 'pets welcome', 'pets allowed',
  'four-legged', 'furry friends', 'bring your dog', 'pup friendly',
  'dog menu', 'water bowl',
  // German
  'hundefreundlich', 'hunde willkommen', 'hunde erlaubt',
  'haustierfreundlich', 'haustiere willkommen', 'vierbeinern',
  'vierbeiner willkommen', 'hundebar', 'mit hund',
  // French
  'chiens acceptés', 'chiens bienvenus', 'animaux acceptés',
  'animaux bienvenus', 'dog friendly',
  // Italian
  'cani ammessi', 'cani benvenuti', 'animali ammessi',
  'pet friendly', 'amici a quattro zampe',
  // Spanish
  'perros bienvenidos', 'mascotas bienvenidas', 'pet friendly',
  'se admiten mascotas', 'se admiten perros',
  // Dutch
  'honden welkom', 'huisdieren welkom', 'hondvriendelijk',
  // Polish
  'psy mile widziane', 'przyjazny psom', 'zwierzęta mile widziane',
  // Swedish
  'hundar välkomna', 'hundvänlig',
  // Finnish
  'koirat tervetulleita', 'lemmikkiystävällinen',
  // Czech
  'psi vítáni', 'zvířata vítána',
];

const PET_NOT_ALLOWED_KEYWORDS = [
  'no dogs', 'no pets', 'keine hunde', 'pas de chiens',
  'no animals', 'keine haustiere', 'no dogs allowed',
  'hunde nicht erlaubt', 'animaux interdits',
];

// ─── Known vegan restaurants for uncertain classification ────────────────

// Patterns indicating a place is likely fully vegan despite mixed signals
const LIKELY_VEGAN_PATTERNS = [
  // Falafel/kebab shops that are fully vegan
  /\bvegan.*kebab/i, /\bvegan.*döner/i, /\bvegan.*doner/i,
  /\bvöner\b/i, /\bvoner\b/i,
  // "Vegan" in the business concept
  /\bplant[\s-]?based\b/i,
  // Known chains
  /\bloving hut\b/i, /\bveganz\b/i, /\bveganista\b/i,
  // Bloom sushi is a vegan sushi chain
  /\bbloom\s+sushi\b/i,
];

// ─── HTTP Utilities ──────────────────────────────────────────────────────

async function scrapeWebsite(url, timeout = 12000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html',
        'Accept-Language': 'en,de,fr,it,es,nl,pl,cs,sv,fi,pt,hu,no,uk,el,ro,hr',
      },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;

    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return null;

    const reader = resp.body.getReader();
    const chunks = [];
    let totalSize = 0;
    const maxBytes = 80 * 1024; // 80KB

    while (totalSize < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalSize += value.length;
    }
    reader.cancel();
    return Buffer.concat(chunks).toString('utf-8');
  } catch {
    return null;
  }
}

function extractEnrichmentData(html, url) {
  if (!html) return null;

  const result = {
    ogImage: null,
    twitterImage: null,
    favicon: null,
    metaDesc: null,
    ogDesc: null,
    pageTitle: null,
    isPetFriendly: null,
    bodySnippet: null,
  };

  // og:image
  const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogImg) {
    let imgUrl = ogImg[1].trim();
    if (imgUrl.startsWith('/')) {
      try { imgUrl = new URL(imgUrl, url).href; } catch {}
    }
    if (imgUrl.startsWith('http') && !imgUrl.includes('placeholder') && !imgUrl.includes('default')) {
      result.ogImage = imgUrl;
    }
  }

  // twitter:image
  const twImg = html.match(/<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:image["']/i);
  if (twImg && !result.ogImage) {
    let imgUrl = twImg[1].trim();
    if (imgUrl.startsWith('/')) {
      try { imgUrl = new URL(imgUrl, url).href; } catch {}
    }
    if (imgUrl.startsWith('http')) result.twitterImage = imgUrl;
  }

  // Favicon / apple-touch-icon (fallback)
  const touchIcon = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
  if (touchIcon) {
    let iconUrl = touchIcon[1].trim();
    if (iconUrl.startsWith('/')) {
      try { iconUrl = new URL(iconUrl, url).href; } catch {}
    }
    if (iconUrl.startsWith('http')) result.favicon = iconUrl;
  }

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  result.pageTitle = titleMatch ? titleMatch[1].replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) : null;

  // Meta description
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
  result.metaDesc = metaMatch ? metaMatch[1].replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : null;

  // OG description
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*property=["']og:description["']/i);
  result.ogDesc = ogDescMatch ? ogDescMatch[1].replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : null;

  // Strip HTML for text analysis
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyText = bodyMatch
    ? bodyMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 15000)
    : '';

  const allText = `${result.pageTitle || ''} ${result.metaDesc || ''} ${result.ogDesc || ''} ${bodyText}`.toLowerCase();

  // Pet-friendly detection
  const petPositive = PET_FRIENDLY_KEYWORDS.some(kw => allText.includes(kw.toLowerCase()));
  const petNegative = PET_NOT_ALLOWED_KEYWORDS.some(kw => allText.includes(kw.toLowerCase()));
  if (petPositive && !petNegative) result.isPetFriendly = true;
  else if (petNegative) result.isPetFriendly = false;

  // Extract a meaningful body snippet for description generation
  // Look for "about" section or first meaningful paragraph
  const aboutMatch = bodyText.match(/(?:about\s+us|über\s+uns|chi\s+siamo|qui\s+sommes|sobre\s+nosotros|who\s+we\s+are)[:\s]*([^.!?]{30,300}[.!?])/i);
  if (aboutMatch) {
    result.bodySnippet = aboutMatch[1].trim();
  } else {
    // Get first substantial sentence
    const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 40 && s.trim().length < 300);
    if (sentences.length > 0) {
      result.bodySnippet = sentences[0].trim() + '.';
    }
  }

  return result;
}

// ─── Description Generation ──────────────────────────────────────────────

function generateDescription(place, enrichData) {
  const parts = [];

  // Use meta/og description if good
  const webDesc = enrichData?.metaDesc || enrichData?.ogDesc;
  if (webDesc && webDesc.length > 20 && webDesc.length < 400 &&
      !webDesc.toLowerCase().includes('cookie') &&
      !webDesc.toLowerCase().includes('javascript') &&
      !webDesc.toLowerCase().includes('404')) {
    return cleanDescription(webDesc);
  }

  // Use body snippet
  if (enrichData?.bodySnippet && enrichData.bodySnippet.length > 20) {
    return cleanDescription(enrichData.bodySnippet);
  }

  // Generate from available data
  const cat = place.category === 'eat' ? 'restaurant' : place.category === 'store' ? 'shop' : 'accommodation';
  const cuisines = (place.cuisine_types || []).filter(c => c.toLowerCase() !== 'vegan').join(', ');
  const city = place.city || '';
  const country = place.country || '';

  if (place.vegan_level === 'fully_vegan') {
    parts.push(`Vegan ${cat}`);
  } else {
    parts.push(`Vegan-focused ${cat}`);
  }

  if (cuisines) {
    parts.push(`serving ${cuisines} cuisine`);
  }

  if (city) {
    parts.push(`in ${city}${country ? ', ' + country : ''}`);
  } else if (country) {
    parts.push(`in ${country}`);
  }

  return parts.join(' ') + '.';
}

function cleanDescription(desc) {
  // Clean up HTML entities and unwanted chars
  return desc
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

// ─── Reverse Geocoding (Nominatim) ──────────────────────────────────────

async function reverseGeocode(lat, lon) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14&addressdetails=1`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = await resp.json();
    const addr = data.address || {};
    return addr.city || addr.town || addr.village || addr.municipality || null;
  } catch {
    return null;
  }
}

// ─── Uncertain Place Review ──────────────────────────────────────────────

function reviewUncertainPlace(place) {
  const v = place.verification;
  const name = place.name || '';
  const reasons = v.reasons || [];

  // Check if it's a known vegan pattern
  if (LIKELY_VEGAN_PATTERNS.some(p => p.test(name))) {
    return { include: true, reason: 'Known vegan pattern in name' };
  }

  // If OSM says diet:vegan=only AND website has vegan signals, include it
  if (place.vegan_level === 'fully_vegan' && v.strong_vegan_signals > 0) {
    return { include: true, reason: 'OSM vegan=only + website confirms vegan' };
  }

  // If website title contains vegan
  if (v.page_title && /\bvegan/i.test(v.page_title)) {
    return { include: true, reason: 'Website title contains vegan' };
  }

  // If OSM says fully_vegan and the "conflict" is just cuisine tagging (common for vegan restaurants that serve vegan versions of traditional food)
  if (place.vegan_level === 'fully_vegan') {
    const nonVeganReasons = reasons.filter(r =>
      r.includes('non-vegan keyword') || r.includes('Cuisine includes meat'));
    const cuisineConflict = nonVeganReasons.some(r =>
      /kebab|burger|döner|doner|sushi|ice_cream|pizza|regional|italian|falafel|tacos|wrap|sandwich|chicken/i.test(r));

    // Vegan kebab, vegan burger, vegan sushi are real categories
    if (cuisineConflict && !nonVeganReasons.some(r => /steakhouse|bbq|butcher|metzger|fish\b(?!.*vegan)/i.test(r))) {
      return { include: true, reason: 'OSM vegan=only, cuisine tags are vegan versions of traditional food' };
    }
  }

  // Website has strong vegan signals despite mixed tags
  if (v.strong_vegan_signals >= 2) {
    return { include: true, reason: 'Multiple strong vegan signals on website' };
  }

  // Score 10+ with weak vegan website signal
  if (v.score >= 10 && v.website_alive) {
    return { include: true, reason: 'Moderate vegan signals, website alive' };
  }

  return { include: false, reason: 'Insufficient evidence' };
}

// ─── Batch Processing ────────────────────────────────────────────────────

async function processBatch(items, fn, batchSize, label) {
  let done = 0;
  const total = items.length;
  const startTime = Date.now();

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
    done += batch.length;

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = done / elapsed;
    const eta = Math.round((total - done) / rate);
    const etaMin = Math.floor(eta / 60);
    const etaSec = eta % 60;
    process.stdout.write(
      `\r  ${label}: ${done}/${total} (${(done/total*100).toFixed(1)}%) — ${rate.toFixed(0)}/s — ETA ${etaMin}m${etaSec}s   `
    );
  }
  console.log();
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌿 Place Enrichment Pipeline');
  console.log('============================\n');

  // Load data
  const verified = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf-8'));
  const uncertain = JSON.parse(fs.readFileSync(UNCERTAIN_FILE, 'utf-8'));
  const importReady = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));

  const importSet = new Set(importReady.places.map(p => p.source_id));
  console.log(`Import-ready: ${importSet.size}`);
  console.log(`Uncertain to review: ${uncertain.places.length}\n`);

  // ═══ Step 1: Review uncertain places ═══
  console.log('═══ STEP 1: Review Uncertain Places ═══');
  let added = 0;
  const reviewResults = { include: [], exclude: [] };

  for (const place of uncertain.places) {
    const result = reviewUncertainPlace(place);
    if (result.include) {
      // Add to import set
      const { verification, ...cleanPlace } = place;
      importReady.places.push(cleanPlace);
      importSet.add(place.source_id);
      added++;
      reviewResults.include.push({ name: place.name, country: place.country, reason: result.reason });
    } else {
      reviewResults.exclude.push({ name: place.name, country: place.country, reason: result.reason });
    }
  }

  console.log(`  Added ${added} places from uncertain review`);
  console.log(`  Excluded ${uncertain.places.length - added} places`);
  console.log(`  New total: ${importReady.places.length}`);

  // Print what was added
  if (reviewResults.include.length > 0) {
    console.log('\n  Added places:');
    for (const r of reviewResults.include.slice(0, 20)) {
      console.log(`    ✅ ${r.name} (${r.country}) — ${r.reason}`);
    }
    if (reviewResults.include.length > 20) {
      console.log(`    ... and ${reviewResults.include.length - 20} more`);
    }
  }

  // ═══ Step 2: Scrape websites for images, descriptions, pet-friendly ═══
  console.log('\n═══ STEP 2: Website Enrichment Scrape ═══');
  const placesWithWebsite = importReady.places.filter(p => p.website);
  console.log(`  Scraping ${placesWithWebsite.length} websites for images, descriptions, pet info...`);

  const enrichmentData = new Map();

  await processBatch(
    placesWithWebsite,
    async (place) => {
      const html = await scrapeWebsite(place.website);
      const data = extractEnrichmentData(html, place.website);
      if (data) enrichmentData.set(place.source_id, data);
    },
    concurrency,
    'Scrape'
  );

  console.log(`  Scraped data from ${enrichmentData.size} sites`);

  // Apply enrichment
  let imagesAdded = 0;
  let descriptionsImproved = 0;
  let petFriendlyFound = 0;
  let petNotAllowed = 0;

  for (const place of importReady.places) {
    const data = enrichmentData.get(place.source_id);

    // Images
    const imageUrl = data?.ogImage || data?.twitterImage;
    if (imageUrl) {
      place.images = [imageUrl];
      imagesAdded++;
    }

    // Description
    const newDesc = generateDescription(place, data);
    if (newDesc && (!place.description || place.description.length < 20 || place.description.startsWith('Cuisine:'))) {
      place.description = newDesc;
      descriptionsImproved++;
    }

    // Pet-friendly
    if (data?.isPetFriendly === true) {
      place.is_pet_friendly = true;
      petFriendlyFound++;
    } else if (data?.isPetFriendly === false && !place.is_pet_friendly) {
      // Only mark as not pet friendly if we found explicit "no pets" language
      petNotAllowed++;
    }
    // If OSM already has pet-friendly, keep it
  }

  console.log(`\n  Images found: ${imagesAdded}`);
  console.log(`  Descriptions improved: ${descriptionsImproved}`);
  console.log(`  Pet-friendly detected: ${petFriendlyFound}`);
  console.log(`  No-pets detected: ${petNotAllowed}`);

  // ═══ Step 3: Fill missing cities via reverse geocoding ═══
  console.log('\n═══ STEP 3: Reverse Geocoding Missing Cities ═══');
  const noCityPlaces = importReady.places.filter(p => !p.city && p.latitude && p.longitude);
  console.log(`  ${noCityPlaces.length} places missing city info`);

  if (noCityPlaces.length > 0) {
    let geocoded = 0;
    // Nominatim rate limit: 1 req/sec, so batch of 1 with delay
    for (let i = 0; i < noCityPlaces.length; i++) {
      const place = noCityPlaces[i];
      const city = await reverseGeocode(place.latitude, place.longitude);
      if (city) {
        place.city = city;
        geocoded++;
      }
      if (i % 50 === 0 && i > 0) {
        process.stdout.write(`\r  Geocoding: ${i}/${noCityPlaces.length} (${geocoded} found)   `);
      }
      // Rate limit: max 1 req/sec for Nominatim
      await new Promise(r => setTimeout(r, 1100));
    }
    console.log(`\n  Geocoded ${geocoded} cities`);
  }

  // ═══ Step 4: Generate descriptions for remaining places ═══
  console.log('\n═══ STEP 4: Generate Missing Descriptions ═══');
  let generated = 0;
  for (const place of importReady.places) {
    if (!place.description || place.description.length < 10 || place.description.startsWith('Cuisine:')) {
      place.description = generateDescription(place, null);
      generated++;
    }
  }
  console.log(`  Generated ${generated} descriptions`);

  // ═══ Step 5: Final quality check & output ═══
  console.log('\n═══ STEP 5: Quality Check & Output ═══');

  // Sort by country, city, name
  importReady.places.sort((a, b) =>
    a.country.localeCompare(b.country) ||
    (a.city || '').localeCompare(b.city || '') ||
    a.name.localeCompare(b.name)
  );

  // Stats
  const stats = {
    total: importReady.places.length,
    withDescription: importReady.places.filter(p => p.description && p.description.length > 10).length,
    withImages: importReady.places.filter(p => p.images && p.images.length > 0).length,
    withWebsite: importReady.places.filter(p => p.website).length,
    withPhone: importReady.places.filter(p => p.phone).length,
    withCity: importReady.places.filter(p => p.city).length,
    withOpeningHours: importReady.places.filter(p => p.opening_hours).length,
    petFriendly: importReady.places.filter(p => p.is_pet_friendly).length,
    byCategory: importReady.places.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {}),
    byCountry: importReady.places.reduce((acc, p) => { acc[p.country] = (acc[p.country] || 0) + 1; return acc; }, {}),
  };

  console.log(`\n  FINAL CONTENT COMPLETENESS:`);
  const fields = [
    ['name', stats.total],
    ['description', stats.withDescription],
    ['images', stats.withImages],
    ['website', stats.withWebsite],
    ['phone', stats.withPhone],
    ['city', stats.withCity],
    ['opening_hours', stats.withOpeningHours],
    ['pet_friendly', stats.petFriendly],
  ];
  for (const [field, count] of fields) {
    const pct = (count / stats.total * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / stats.total * 30));
    console.log(`    ${field.padEnd(16)} ${String(count).padStart(5)} (${pct.padStart(5)}%) ${bar}`);
  }

  console.log(`\n  Categories: ${JSON.stringify(stats.byCategory)}`);
  console.log(`\n  Top countries:`);
  Object.entries(stats.byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([c, n]) => console.log(`    ${c}: ${n}`));

  // Update metadata
  importReady.metadata = {
    generatedAt: new Date().toISOString(),
    totalPlaces: stats.total,
    contentStats: stats,
    byCountry: stats.byCountry,
    byCategory: stats.byCategory,
  };

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(importReady, null, 2));
  const sizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Written ${stats.total} enriched places to ${OUTPUT_FILE} (${sizeMB} MB)`);

  // Write pet-friendly summary
  const petPlaces = importReady.places.filter(p => p.is_pet_friendly);
  console.log(`\n🐕 Pet-friendly places: ${petPlaces.length}`);
  if (petPlaces.length > 0) {
    console.log('  Samples:');
    for (const p of petPlaces.slice(0, 15)) {
      console.log(`    ${p.name} (${p.city || p.country})`);
    }
  }

  console.log('\n✅ Enrichment complete!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
