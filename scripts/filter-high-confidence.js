/**
 * High-confidence place filter
 *
 * Scores places 0-100 based on data completeness + website checks.
 * No paid APIs — uses OSM data signals + free HTTP HEAD requests.
 *
 * Usage: node scripts/filter-high-confidence.js [--check-websites] [--min-score 50]
 */

const fs = require('fs');

const args = process.argv.slice(2);
const checkWebsites = args.includes('--check-websites');
const minScore = parseInt(args.find(a => a.startsWith('--min-score='))?.split('=')[1] || '50');
const inputFile = args.find(a => a.startsWith('--input='))?.split('=')[1] || 'scripts/osm-europe-vegan-places.json';
const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1] || 'scripts/high-confidence-places.json';

// Suspicious name patterns (test data, generic, garbage)
const SUSPICIOUS_PATTERNS = [
  /^test/i, /^asdf/i, /^xxx/i, /^aaa/i, /^zzz/i,
  /^unnamed/i, /^unknown/i, /^todo/i, /^fixme/i,
  /^place$/i, /^restaurant$/i, /^cafe$/i, /^shop$/i,
  /^\d+$/, // Just numbers
  /^.{1,2}$/, // 1-2 char names
  /^.{80,}$/, // Absurdly long names
];

// Known chain restaurants that are vegan-friendly but not primarily vegan
const CHAIN_NAMES = [
  /^subway$/i, /^burger king$/i, /^mcdonald/i, /^starbucks$/i,
  /^domino/i, /^pizza hut$/i, /^kfc$/i, /^taco bell$/i,
];

function scorePlace(place) {
  let score = 0;
  const flags = [];

  // === Name quality (0-15) ===
  if (place.name && place.name.length >= 3) {
    score += 10;
    if (place.name.length >= 5) score += 3;
    if (/[A-Z]/.test(place.name[0])) score += 2; // Proper capitalization
  }

  // Penalize suspicious names
  if (SUSPICIOUS_PATTERNS.some(p => p.test(place.name))) {
    score -= 15;
    flags.push('SUSPICIOUS_NAME');
  }
  if (CHAIN_NAMES.some(p => p.test(place.name))) {
    score -= 10;
    flags.push('CHAIN_RESTAURANT');
  }

  // === Location data (0-15) ===
  if (place.latitude && place.longitude) score += 5;
  if (place.city) score += 5;
  if (place.address && place.address.length > place.country.length + 5) score += 5; // More than just country name

  // === Contact info (0-20) ===
  if (place.website) score += 10;
  if (place.phone) score += 10;

  // === Operational data (0-20) ===
  if (place.opening_hours) score += 12;
  if (place.cuisine_types && place.cuisine_types.length > 0) score += 5;
  if (place.description) score += 3;

  // === Vegan confidence (0-20) ===
  if (place.vegan_level === 'fully_vegan') {
    score += 20;
  } else {
    score += 10; // diet:vegan=yes
  }

  // === Category sanity (0-10) ===
  if (['eat', 'store', 'hotel'].includes(place.category)) score += 5;
  if (place.tags && place.tags.length > 1) score += 5; // Has more tags than just 'vegan'

  // Cap at 100
  score = Math.min(100, Math.max(0, score));

  return { score, flags };
}

async function checkWebsite(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'PlantsPack-Verifier/1.0 (+https://plantspack.com)' },
    });
    clearTimeout(timer);
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

async function batchCheckWebsites(places, concurrency = 20) {
  console.log(`\n🌐 Checking ${places.filter(p => p.website).length} websites (concurrency: ${concurrency})...`);

  let checked = 0;
  let alive = 0;
  let dead = 0;
  const total = places.filter(p => p.website).length;

  // Process in batches
  for (let i = 0; i < places.length; i += concurrency) {
    const batch = places.slice(i, i + concurrency);
    const promises = batch.map(async (place) => {
      if (!place.website) return;
      const isAlive = await checkWebsite(place.website);
      checked++;
      if (isAlive) {
        alive++;
        place._websiteAlive = true;
      } else {
        dead++;
        place._websiteAlive = false;
        place._flags = [...(place._flags || []), 'WEBSITE_DOWN'];
        place._score = Math.max(0, (place._score || 0) - 8); // Penalize dead websites
      }
      if (checked % 500 === 0) {
        process.stdout.write(`  ${checked}/${total} checked (${alive} alive, ${dead} dead)\r`);
      }
    });
    await Promise.all(promises);
  }

  console.log(`  ✅ ${alive} alive, ❌ ${dead} dead, ⏭️ ${places.length - total} no URL`);
}

function deduplicateByProximity(places, thresholdMeters = 20) {
  console.log(`\n🔍 Deduplicating by proximity (${thresholdMeters}m)...`);
  const toRad = d => d * Math.PI / 180;
  const dist = (a, b) => {
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const x = Math.sin(dLat/2)**2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  };

  // Sort by lat for efficient comparison
  places.sort((a, b) => a.latitude - b.latitude);

  const removed = new Set();
  for (let i = 0; i < places.length; i++) {
    if (removed.has(i)) continue;
    for (let j = i + 1; j < places.length; j++) {
      if (removed.has(j)) continue;
      // Quick lat check - if more than ~0.001° apart (~111m), skip
      if (Math.abs(places[j].latitude - places[i].latitude) > 0.001) break;

      if (dist(places[i], places[j]) < thresholdMeters) {
        // Same location - keep the one with higher score
        if ((places[j]._score || 0) > (places[i]._score || 0)) {
          removed.add(i);
        } else {
          removed.add(j);
        }
      }
    }
  }

  const deduped = places.filter((_, i) => !removed.has(i));
  console.log(`  Removed ${removed.size} proximity duplicates (${deduped.length} remaining)`);
  return deduped;
}

async function main() {
  console.log('🌿 High-Confidence Place Filter');
  console.log('================================');
  console.log(`Input: ${inputFile}`);
  console.log(`Min score: ${minScore}`);
  console.log(`Check websites: ${checkWebsites}`);
  console.log();

  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  let places = data.places;
  console.log(`Loaded ${places.length.toLocaleString()} places`);

  // Step 1: Score all places
  console.log('\n📊 Scoring places...');
  for (const place of places) {
    const { score, flags } = scorePlace(place);
    place._score = score;
    place._flags = flags;
  }

  const scoreDistribution = {
    '90-100': places.filter(p => p._score >= 90).length,
    '70-89': places.filter(p => p._score >= 70 && p._score < 90).length,
    '50-69': places.filter(p => p._score >= 50 && p._score < 70).length,
    '30-49': places.filter(p => p._score >= 30 && p._score < 50).length,
    '0-29': places.filter(p => p._score < 30).length,
  };
  console.log('  Score distribution:');
  Object.entries(scoreDistribution).forEach(([range, count]) => {
    const pct = (count / places.length * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / places.length * 40));
    console.log(`    ${range}: ${count.toLocaleString().padStart(6)} (${pct}%) ${bar}`);
  });

  // Step 2: Remove suspicious names
  const suspicious = places.filter(p => p._flags.includes('SUSPICIOUS_NAME'));
  if (suspicious.length > 0) {
    console.log(`\n⚠️ Removed ${suspicious.length} places with suspicious names`);
    places = places.filter(p => !p._flags.includes('SUSPICIOUS_NAME'));
  }

  // Step 3: Deduplicate by proximity
  places = deduplicateByProximity(places);

  // Step 4: Check websites (optional, takes time)
  if (checkWebsites) {
    await batchCheckWebsites(places);
  }

  // Step 5: Filter by min score
  const highConfidence = places.filter(p => p._score >= minScore);

  // Sort by score desc, then country, then name
  highConfidence.sort((a, b) => b._score - a._score || a.country.localeCompare(b.country) || a.name.localeCompare(b.name));

  // Summary
  console.log('\n\n📊 FINAL RESULTS');
  console.log('=================');
  console.log(`Input: ${data.places.length.toLocaleString()}`);
  console.log(`After filtering: ${highConfidence.length.toLocaleString()} (score >= ${minScore})`);
  console.log(`Removed: ${(data.places.length - highConfidence.length).toLocaleString()}`);

  const byCountry = {};
  highConfidence.forEach(p => { byCountry[p.country] = (byCountry[p.country] || 0) + 1; });
  console.log('\nBy country:');
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => {
    console.log(`  ${c}: ${n.toLocaleString()}`);
  });

  const byCat = {};
  highConfidence.forEach(p => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
  console.log('\nBy category:', byCat);

  const fv = highConfidence.filter(p => p.vegan_level === 'fully_vegan').length;
  const web = highConfidence.filter(p => p.website).length;
  const city = highConfidence.filter(p => p.city).length;
  console.log(`\nFully vegan: ${fv} (${(fv/highConfidence.length*100).toFixed(1)}%)`);
  console.log(`With website: ${web} (${(web/highConfidence.length*100).toFixed(1)}%)`);
  console.log(`With city: ${city} (${(city/highConfidence.length*100).toFixed(1)}%)`);
  console.log(`Avg score: ${(highConfidence.reduce((s,p) => s + p._score, 0) / highConfidence.length).toFixed(1)}`);

  // Clean output (remove internal scoring fields)
  const cleanPlaces = highConfidence.map(p => {
    const { _score, _flags, _websiteAlive, ...clean } = p;
    return { ...clean, confidence_score: _score };
  });

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'OSM Europe filtered',
      inputCount: data.places.length,
      outputCount: cleanPlaces.length,
      minScore,
      websitesChecked: checkWebsites,
    },
    places: cleanPlaces,
  };

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  const sizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Written ${cleanPlaces.length.toLocaleString()} places to ${outputFile} (${sizeMB} MB)`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
