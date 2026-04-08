/**
 * Vegan Place Verification & Classification
 *
 * Phase 1: Website alive check (HTTP HEAD, concurrent x20)
 * Phase 2: Website content scrape (HTTP GET, extract vegan keywords in 10+ languages)
 * Phase 3: Auto-classification based on rules + scraped data
 *
 * Output:
 *   scripts/verified-places.json      — all places with verification data
 *   scripts/import-ready-places.json  — only fully_vegan + primarily_vegan with alive websites
 *   scripts/uncertain-places.json     — places needing manual review
 *
 * Usage:
 *   node scripts/verify-and-classify.js [--skip-website-check] [--skip-scrape] [--concurrency=20]
 *   node scripts/verify-and-classify.js --resume  (resume from checkpoint)
 */

const fs = require('fs');

const args = process.argv.slice(2);
const skipWebsiteCheck = args.includes('--skip-website-check');
const skipScrape = args.includes('--skip-scrape');
const resume = args.includes('--resume');
const concurrency = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '20');

const INPUT = 'scripts/high-confidence-places.json';
const CHECKPOINT = 'scripts/verify-checkpoint.json';
const OUTPUT_ALL = 'scripts/verified-places.json';
const OUTPUT_IMPORT = 'scripts/import-ready-places.json';
const OUTPUT_UNCERTAIN = 'scripts/uncertain-places.json';

// ─── Multi-language vegan keyword dictionaries ───────────────────────────

const VEGAN_STRONG_KEYWORDS = [
  // English
  '100% vegan', 'fully vegan', 'all vegan', 'pure vegan', 'vegan restaurant',
  'vegan cafe', 'vegan café', 'vegan kitchen', 'vegan food', 'vegan bakery',
  'vegan deli', 'vegan bistro', 'vegan bar', 'plant-based restaurant',
  'plant based restaurant', 'entirely vegan', 'exclusively vegan',
  // German
  'rein pflanzlich', '100% pflanzlich', 'rein vegan', 'komplett vegan',
  'veganes restaurant', 'vegan essen', 'vegane küche', 'vegane speisen',
  'alles vegan', 'ausschließlich vegan', 'nur vegan', 'vegane bäckerei',
  'veganer imbiss', 'pflanzliche küche',
  // French
  '100% végétal', 'entièrement végétalien', 'tout végétalien',
  'restaurant végétalien', 'cuisine végétalienne', 'restaurant vegan',
  'cuisine vegan', 'tout est vegan', 'entièrement vegan',
  // Italian
  '100% vegano', 'tutto vegano', 'completamente vegano', 'ristorante vegano',
  'cucina vegana', 'interamente vegano', 'solo vegano',
  // Spanish
  '100% vegano', 'totalmente vegano', 'restaurante vegano', 'comida vegana',
  'cocina vegana', 'completamente vegano', 'todo vegano',
  // Dutch
  '100% plantaardig', 'volledig vegan', 'plantaardig restaurant',
  'veganistisch restaurant', 'alles vegan', 'geheel plantaardig',
  // Polish
  '100% wegański', 'w pełni wegański', 'restauracja wegańska',
  'kuchnia wegańska', 'całkowicie wegański',
  // Czech
  '100% veganský', 'plně veganský', 'veganská restaurace',
  'veganská kuchyně',
  // Swedish
  '100% vegansk', 'helt vegansk', 'vegansk restaurang', 'veganskt kök',
  // Finnish
  '100% vegaani', 'täysin vegaaninen', 'vegaaniravintola',
  // Portuguese
  '100% vegano', 'totalmente vegano', 'restaurante vegano',
  'cozinha vegana', 'comida vegana',
  // Hungarian
  '100% vegán', 'teljesen vegán', 'vegán étterem',
  // Norwegian
  '100% vegansk', 'helt vegansk', 'vegansk restaurant',
  // Ukrainian
  '100% веганський', 'повністю веганський', 'веганський ресторан',
  // Greek
  '100% vegan', 'αποκλειστικά vegan',
  // Romanian
  '100% vegan', 'complet vegan', 'restaurant vegan',
  // Croatian/Serbian
  '100% veganski', 'potpuno veganski',
  // Japanese
  '100%ヴィーガン', 'ヴィーガンレストラン', '完全菜食', 'ビーガン料理', 'ヴィーガン料理',
  // Korean
  '100% 비건', '비건 레스토랑', '비건 카페', '완전 채식',
  // Chinese
  '100%纯素', '纯素餐厅', '素食餐厅', '全素', '纯素食',
  // Thai
  'มังสวิรัติ', 'เจ', 'วีแกน',
  // Hindi
  'शाकाहारी', 'वीगन',
  // Turkish
  '100% vegan', 'tamamen vegan', 'vegan restoran',
  // Hebrew
  'טבעוני', 'מסעדה טבעונית', '100% טבעוני',
  // Arabic
  'نباتي', 'مطعم نباتي',
  // Portuguese (Brazilian)
  'totalmente vegano', 'restaurante vegano', '100% vegano', 'cozinha vegana',
];

const VEGAN_WEAK_KEYWORDS = [
  'vegan', 'plant-based', 'plant based', 'pflanzlich', 'végétal',
  'végétalien', 'vegano', 'vegana', 'plantaardig', 'veganistisch',
  'wegański', 'wegańska', 'veganský', 'vegansk', 'vegaani', 'vegán',
  'веганський', 'рослинний',
];

const NON_VEGAN_KEYWORDS = [
  // Meat/animal indicators
  'steakhouse', 'steak house', 'bbq', 'barbecue', 'grill house',
  'kebab', 'döner', 'doner', 'kebap', 'gyros', 'meat', 'fleisch',
  'viande', 'carne', 'mięso', 'maso', 'kött', 'liha',
  'butcher', 'metzger', 'boucherie', 'macelleria', 'carnicería',
  'fish', 'fisch', 'poisson', 'pesce', 'pescado',
  'sushi', 'seafood', 'meeresfrüchte', 'fruits de mer',
  'chicken', 'hähnchen', 'poulet', 'pollo',
  'pork', 'schwein', 'porc', 'maiale', 'cerdo',
  'burger king', 'mcdonald', 'kfc', 'subway', 'domino', 'pizza hut',
  'taco bell', 'wendy', 'five guys', 'nando',
  // Dairy emphasis
  'cheese shop', 'käseladen', 'fromagerie',
  'ice cream', 'eisdiele', 'gelateria', 'heladería',
];

// Name patterns that strongly suggest fully vegan
const VEGAN_NAME_PATTERNS = [
  /\bvegan\b/i,
  /\bvegano\b/i,
  /\bvegana\b/i,
  /\bvégétalien/i,
  /\bvégétal/i,
  /\bwegański/i,
  /\bwegańska/i,
  /\bplant[\s-]?based\b/i,
  /\bpflanzlich/i,
  /\bplantaardig/i,
  /\bveganistisch/i,
  /\bvegansk/i,
  /\bvegaani/i,
  /\bвеган/i,
];

// Name patterns that strongly suggest NOT vegan
const NON_VEGAN_NAME_PATTERNS = [
  /\bsteak/i, /\bbbq\b/i, /\bbarbecue\b/i, /\bkebab/i, /\bdöner\b/i,
  /\bdoner\b/i, /\bgyros\b/i, /\bmeat\b/i, /\bfleisch/i,
  /\bbutcher/i, /\bmetzger/i, /\bfish\b/i, /\bsushi\b/i,
  /\bchicken\b/i, /\bpollo\b/i, /\bpoulet/i, /\bburger king/i,
  /\bmcdonald/i, /\bkfc\b/i, /\bnando/i, /\bfive guys/i,
];

// Known vegan chains (from training data)
const KNOWN_VEGAN_CHAINS = [
  /\bloving hut\b/i,
  /\bvegan junk food bar\b/i,
  /\bveganista\b/i,
  /\bveganz\b/i,
  /\bby chloe\b/i,
  /\bbeatnic\b/i,
  /\bwicked healthy\b/i,
  /\bvoner\b/i,
  /\bvöner\b/i,
  /\bveggie world\b/i,
  /\bsattgrün\b/i,
  /\bcopenhagen vegan\b/i,
  /\bvegetalia\b/i,
  /\bpure fastfood\b/i,
  /\bsweet bones\b/i,
  /\bvegan yes\b/i,
  /\balma verde\b/i,
  /\bgreen cuisine\b/i,
  /\bplantage\b/i,
  /\bveganerie\b/i,
  /\bvegan nation\b/i,
  /\bthe green\b.*\bkitchen\b/i,
  /\bveggo\b/i,
  /\bveg\s?bar\b/i,
  // Worldwide chains
  /\bveganburg/i,
  /\bveggie grill\b/i,
  /\bnative foods\b/i,
  /\bplant power\b/i,
  /\bgreen monday\b/i,
  /\bgreen common\b/i,
  /\bfalafel[\s-]?vegan\b/i,
  /\bain soph\b/i,
  /\bt['']s tantan\b/i,
  /\bkomaki\b.*\bvegan\b/i,
];

// ─── HTTP Utilities ──────────────────────────────────────────────────────

const UA = 'PlantsPack-Verifier/1.0 (+https://plantspack.com)';

async function httpHead(url, timeout = 8000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const resp = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA },
    });
    clearTimeout(timer);
    return { alive: resp.status >= 200 && resp.status < 400, status: resp.status };
  } catch (e) {
    return { alive: false, status: 0, error: e.code || e.message };
  }
}

async function httpGetContent(url, timeout = 10000) {
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

    // Read only first 50KB to avoid huge pages
    const reader = resp.body.getReader();
    const chunks = [];
    let totalSize = 0;
    const maxBytes = 50 * 1024;

    while (totalSize < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalSize += value.length;
    }
    reader.cancel();

    const html = Buffer.concat(chunks).toString('utf-8');
    return html;
  } catch {
    return null;
  }
}

function extractPageInfo(html) {
  if (!html) return null;

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/[\n\r]+/g, ' ').trim().slice(0, 200) : '';

  // Extract meta description
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
  const metaDesc = metaMatch ? metaMatch[1].trim().slice(0, 500) : '';

  // Extract og:description
  const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i);
  const ogDesc = ogMatch ? ogMatch[1].trim().slice(0, 500) : '';

  // Strip HTML tags for body text analysis (first 10KB)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyText = bodyMatch
    ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 10000)
    : '';

  // Combined text for keyword matching
  const allText = `${title} ${metaDesc} ${ogDesc} ${bodyText}`.toLowerCase();

  // Check for strong vegan indicators
  const strongVeganHits = VEGAN_STRONG_KEYWORDS.filter(kw => allText.includes(kw.toLowerCase()));
  const weakVeganHits = VEGAN_WEAK_KEYWORDS.filter(kw => allText.includes(kw.toLowerCase()));
  const nonVeganHits = NON_VEGAN_KEYWORDS.filter(kw => allText.includes(kw.toLowerCase()));

  // Check for menu-related content
  const hasMenu = /\b(menu|speisekarte|carte|menú|cardápio|meny)\b/i.test(allText);
  // Check for "vegan options" phrasing (suggests not fully vegan)
  const veganOptions = /\b(vegan\s+option|option.*vegan|auch\s+vegan|also\s+vegan|vegan\s+available|vegane?\s+auswahl)\b/i.test(allText);

  return {
    title: title.slice(0, 200),
    metaDesc: metaDesc.slice(0, 300),
    strongVeganHits,
    weakVeganHits: weakVeganHits.length,
    nonVeganHits,
    hasMenu,
    veganOptions,
  };
}

// ─── Classification Logic ────────────────────────────────────────────────

/**
 * Classify a place based on all available data.
 * Returns: { classification, confidence, reasons[] }
 *
 * Classifications:
 *   fully_vegan    — 100% vegan menu
 *   primarily_vegan — 90%+ vegan
 *   vegan_friendly — good vegan options but not primarily vegan → EXCLUDE
 *   not_vegan      — incorrectly tagged → EXCLUDE
 *   closed         — website down, likely not operating → EXCLUDE
 *   uncertain      — needs manual review
 */
function classifyPlace(place) {
  const reasons = [];
  let score = 0; // positive = vegan, negative = not vegan

  const name = place.name || '';
  const cuisine = (place.cuisine_types || []).join(' ').toLowerCase();
  const veganLevel = place.vegan_level;
  const websiteAlive = place._websiteAlive;
  const pageInfo = place._pageInfo;

  // ── Rule 1: OSM diet:vegan=only is a strong signal ──
  if (veganLevel === 'fully_vegan') {
    score += 40;
    reasons.push('OSM diet:vegan=only');
  }

  // ── Rule 2: Name contains "vegan" or similar ──
  if (VEGAN_NAME_PATTERNS.some(p => p.test(name))) {
    score += 30;
    reasons.push('Name contains vegan keyword');
  }

  // ── Rule 3: Known vegan chain ──
  if (KNOWN_VEGAN_CHAINS.some(p => p.test(name))) {
    score += 50;
    reasons.push('Known vegan chain');
  }

  // ── Rule 4: Name contains non-vegan indicators ──
  if (NON_VEGAN_NAME_PATTERNS.some(p => p.test(name))) {
    score -= 40;
    reasons.push('Name contains non-vegan keyword: ' + name);
  }

  // ── Rule 5: Cuisine type analysis ──
  if (/\bvegan\b/i.test(cuisine)) {
    score += 15;
    reasons.push('Cuisine tagged as vegan');
  }
  const meatCuisines = ['steak', 'barbecue', 'bbq', 'kebab', 'fish', 'seafood', 'chicken', 'meat'];
  if (meatCuisines.some(c => cuisine.includes(c))) {
    score -= 25;
    reasons.push('Cuisine includes meat type: ' + cuisine);
  }

  // ── Rule 6: Website content analysis ──
  if (pageInfo) {
    if (pageInfo.strongVeganHits.length > 0) {
      score += 35;
      reasons.push(`Website strong vegan signals: ${pageInfo.strongVeganHits.slice(0, 3).join(', ')}`);
    }
    if (pageInfo.weakVeganHits > 0 && pageInfo.strongVeganHits.length === 0) {
      score += 10;
      reasons.push('Website mentions vegan (weak)');
    }
    if (pageInfo.nonVeganHits.length > 0) {
      score -= 15 * Math.min(pageInfo.nonVeganHits.length, 3);
      reasons.push(`Website non-vegan signals: ${pageInfo.nonVeganHits.slice(0, 3).join(', ')}`);
    }
    if (pageInfo.veganOptions) {
      score -= 20;
      reasons.push('Website says "vegan options" (implies not fully vegan)');
    }
    // Title containing vegan is very strong
    if (/\bvegan/i.test(pageInfo.title)) {
      score += 20;
      reasons.push('Website title contains "vegan"');
    }
  }

  // ── Rule 7: Website alive status ──
  if (websiteAlive === false && place.website) {
    score -= 10;
    reasons.push('Website unreachable');
  }

  // ── Rule 8: Category context ──
  if (place.category === 'store') {
    // Stores are more likely to be vegan shops
    if (/\b(bio|organic|health|reform|natur)\b/i.test(name)) {
      // Organic/health stores often have vegan tag but aren't vegan restaurants
      score -= 10;
      reasons.push('Organic/health shop (may not be exclusively vegan)');
    }
  }

  // ── Determine classification ──
  let classification;
  let confidence;

  if (score >= 60) {
    classification = 'fully_vegan';
    confidence = 'high';
  } else if (score >= 40) {
    classification = 'fully_vegan';
    confidence = 'medium';
  } else if (score >= 20) {
    classification = 'primarily_vegan';
    confidence = 'medium';
  } else if (score >= 0) {
    classification = 'uncertain';
    confidence = 'low';
  } else if (score >= -20) {
    classification = 'vegan_friendly';
    confidence = 'medium';
  } else {
    classification = 'not_vegan';
    confidence = 'high';
  }

  // Override: website down + no other strong signals → closed
  if (place.website && websiteAlive === false && !place.phone && score < 30) {
    classification = 'closed';
    confidence = 'medium';
    reasons.push('No reachable contact info');
  }

  return { classification, confidence, score, reasons };
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

function saveCheckpoint(places, phase) {
  const data = { phase, timestamp: new Date().toISOString(), places };
  fs.writeFileSync(CHECKPOINT, JSON.stringify(data));
  const sizeMB = (fs.statSync(CHECKPOINT).size / 1024 / 1024).toFixed(1);
  console.log(`  💾 Checkpoint saved (phase ${phase}, ${sizeMB} MB)`);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌿 Vegan Place Verification & Classification');
  console.log('=============================================');
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Skip website check: ${skipWebsiteCheck}`);
  console.log(`Skip scrape: ${skipScrape}`);
  console.log();

  let places;

  // Load from checkpoint or input
  if (resume && fs.existsSync(CHECKPOINT)) {
    console.log('📂 Resuming from checkpoint...');
    const cp = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf-8'));
    places = cp.places;
    console.log(`  Loaded ${places.length.toLocaleString()} places from phase ${cp.phase} (${cp.timestamp})`);

    if (cp.phase >= 1 && !skipWebsiteCheck) {
      console.log('  ✅ Skipping Phase 1 (website check) — already done');
    }
    if (cp.phase >= 2 && !skipScrape) {
      console.log('  ✅ Skipping Phase 2 (content scrape) — already done');
    }
  } else {
    console.log('📂 Loading input data...');
    const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
    places = data.places;
    console.log(`  Loaded ${places.length.toLocaleString()} places`);
  }

  const withWebsite = places.filter(p => p.website).length;
  console.log(`  ${withWebsite.toLocaleString()} have websites\n`);

  // ═══ Phase 1: Website Alive Check ═══
  const checkpointPhase = resume && fs.existsSync(CHECKPOINT)
    ? JSON.parse(fs.readFileSync(CHECKPOINT, 'utf-8')).phase
    : 0;

  if (!skipWebsiteCheck && checkpointPhase < 1) {
    console.log('═══ PHASE 1: Website Alive Check ═══');
    const websitePlaces = places.filter(p => p.website);

    await processBatch(
      websitePlaces,
      async (place) => {
        const result = await httpHead(place.website);
        place._websiteAlive = result.alive;
        place._httpStatus = result.status;
      },
      concurrency,
      'HTTP HEAD'
    );

    const alive = places.filter(p => p._websiteAlive === true).length;
    const dead = places.filter(p => p._websiteAlive === false).length;
    const noUrl = places.filter(p => !p.website).length;
    console.log(`  ✅ ${alive.toLocaleString()} alive | ❌ ${dead.toLocaleString()} dead | ⏭️  ${noUrl.toLocaleString()} no URL`);

    saveCheckpoint(places, 1);
  }

  // ═══ Phase 2: Website Content Scrape ═══
  if (!skipScrape && checkpointPhase < 2) {
    console.log('\n═══ PHASE 2: Website Content Scrape ═══');
    const alivePlaces = places.filter(p => p._websiteAlive === true);
    console.log(`  Scraping ${alivePlaces.length.toLocaleString()} alive websites...`);

    await processBatch(
      alivePlaces,
      async (place) => {
        const html = await httpGetContent(place.website);
        place._pageInfo = extractPageInfo(html);
      },
      Math.min(concurrency, 10), // Lower concurrency for GET requests
      'HTTP GET + parse'
    );

    const scraped = places.filter(p => p._pageInfo).length;
    console.log(`  📄 Scraped content from ${scraped.toLocaleString()} sites`);

    saveCheckpoint(places, 2);
  }

  // ═══ Phase 3: Classification ═══
  console.log('\n═══ PHASE 3: Auto-Classification ═══');

  const stats = {
    fully_vegan: 0,
    primarily_vegan: 0,
    vegan_friendly: 0,
    not_vegan: 0,
    closed: 0,
    uncertain: 0,
  };
  const highConfidence = { fully_vegan: 0, primarily_vegan: 0 };

  for (const place of places) {
    const result = classifyPlace(place);
    place._classification = result.classification;
    place._classConfidence = result.confidence;
    place._classScore = result.score;
    place._classReasons = result.reasons;
    stats[result.classification]++;
    if (result.confidence === 'high' && (result.classification === 'fully_vegan' || result.classification === 'primarily_vegan')) {
      highConfidence[result.classification]++;
    }
  }

  console.log('\n  Classification Results:');
  console.log(`    ✅ fully_vegan:      ${stats.fully_vegan.toLocaleString().padStart(6)}`);
  console.log(`    🟢 primarily_vegan:  ${stats.primarily_vegan.toLocaleString().padStart(6)}`);
  console.log(`    🟡 vegan_friendly:   ${stats.vegan_friendly.toLocaleString().padStart(6)} (excluded)`);
  console.log(`    ❌ not_vegan:        ${stats.not_vegan.toLocaleString().padStart(6)} (excluded)`);
  console.log(`    ⚫ closed:           ${stats.closed.toLocaleString().padStart(6)} (excluded)`);
  console.log(`    ❓ uncertain:        ${stats.uncertain.toLocaleString().padStart(6)} (needs review)`);
  console.log(`\n    High-confidence fully vegan: ${highConfidence.fully_vegan.toLocaleString()}`);
  console.log(`    High-confidence primarily vegan: ${highConfidence.primarily_vegan.toLocaleString()}`);

  // ═══ Output Files ═══
  console.log('\n═══ WRITING OUTPUT FILES ═══');

  // 1. All verified places
  const allVerified = places.map(p => {
    const { _websiteAlive, _httpStatus, _pageInfo, _classScore, _classConfidence, _classification, _classReasons, ...clean } = p;
    return {
      ...clean,
      verification: {
        classification: _classification,
        confidence: _classConfidence,
        score: _classScore,
        reasons: _classReasons,
        website_alive: _websiteAlive ?? null,
        http_status: _httpStatus ?? null,
        page_title: _pageInfo?.title || null,
        strong_vegan_signals: _pageInfo?.strongVeganHits?.length || 0,
        non_vegan_signals: _pageInfo?.nonVeganHits?.length || 0,
      },
    };
  });

  fs.writeFileSync(OUTPUT_ALL, JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      inputCount: places.length,
      stats,
    },
    places: allVerified,
  }, null, 2));
  console.log(`  📄 ${OUTPUT_ALL} (${(fs.statSync(OUTPUT_ALL).size / 1024 / 1024).toFixed(1)} MB)`);

  // 2. Import-ready (fully_vegan + primarily_vegan only)
  const importReady = allVerified
    .filter(p => p.verification.classification === 'fully_vegan' || p.verification.classification === 'primarily_vegan')
    .map(({ verification, ...place }) => place);

  importReady.sort((a, b) => a.country.localeCompare(b.country) || (a.city || '').localeCompare(b.city || '') || a.name.localeCompare(b.name));

  fs.writeFileSync(OUTPUT_IMPORT, JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      totalPlaces: importReady.length,
      byCountry: importReady.reduce((acc, p) => { acc[p.country] = (acc[p.country] || 0) + 1; return acc; }, {}),
      byCategory: importReady.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {}),
    },
    places: importReady,
  }, null, 2));
  console.log(`  ✅ ${OUTPUT_IMPORT} — ${importReady.length.toLocaleString()} places (${(fs.statSync(OUTPUT_IMPORT).size / 1024 / 1024).toFixed(1)} MB)`);

  // 3. Uncertain places (for manual review in Claude conversation)
  const uncertain = allVerified
    .filter(p => p.verification.classification === 'uncertain')
    .sort((a, b) => b.verification.score - a.verification.score);

  fs.writeFileSync(OUTPUT_UNCERTAIN, JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      totalPlaces: uncertain.length,
      description: 'Places that could not be auto-classified. Review in Claude conversation.',
      byCountry: uncertain.reduce((acc, p) => { acc[p.country] = (acc[p.country] || 0) + 1; return acc; }, {}),
    },
    places: uncertain,
  }, null, 2));
  console.log(`  ❓ ${OUTPUT_UNCERTAIN} — ${uncertain.length.toLocaleString()} places for review (${(fs.statSync(OUTPUT_UNCERTAIN).size / 1024 / 1024).toFixed(1)} MB)`);

  // ═══ Summary ═══
  console.log('\n═══ SUMMARY ═══');
  console.log(`  Input:          ${places.length.toLocaleString()} places`);
  console.log(`  Import-ready:   ${importReady.length.toLocaleString()} (${(importReady.length / places.length * 100).toFixed(1)}%)`);
  console.log(`  Needs review:   ${uncertain.length.toLocaleString()} (${(uncertain.length / places.length * 100).toFixed(1)}%)`);
  console.log(`  Excluded:       ${(stats.vegan_friendly + stats.not_vegan + stats.closed).toLocaleString()}`);

  // Print sample of each classification for spot-checking
  console.log('\n═══ SPOT CHECK SAMPLES ═══');
  for (const cls of ['fully_vegan', 'primarily_vegan', 'not_vegan', 'uncertain']) {
    const samples = allVerified.filter(p => p.verification.classification === cls).slice(0, 3);
    if (samples.length === 0) continue;
    console.log(`\n  ${cls.toUpperCase()}:`);
    for (const s of samples) {
      console.log(`    ${s.name} (${s.country}) — ${s.verification.reasons.slice(0, 2).join('; ')}`);
    }
  }

  // Clean up checkpoint
  if (fs.existsSync(CHECKPOINT)) {
    fs.unlinkSync(CHECKPOINT);
    console.log('\n  🗑️  Checkpoint cleaned up');
  }

  console.log('\n✅ Done!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
