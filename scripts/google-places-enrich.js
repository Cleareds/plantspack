/**
 * Google Places API Enrichment
 *
 * For places missing images:
 * 1. Text Search (Preferred) — find place, verify operational, get photo refs
 * 2. Place Photos — fetch actual photo URLs
 *
 * Also re-verifies all places (businessStatus check).
 *
 * Usage: node scripts/google-places-enrich.js [--all] [--dry-run] [--concurrency=5]
 *        --all: process all places, not just those missing images
 *        --dry-run: don't write output, just show stats
 */

const fs = require('fs');

const args = process.argv.slice(2);
const processAll = args.includes('--all');
const dryRun = args.includes('--dry-run');
const concurrency = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '5');

const INPUT = 'scripts/import-ready-places.json';
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!API_KEY) {
  console.error('❌ Set GOOGLE_PLACES_API_KEY environment variable');
  process.exit(1);
}

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const PHOTO_BASE = 'https://places.googleapis.com/v1';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Google Places Text Search ───────────────────────────────────────────

async function searchPlace(place) {
  const query = `${place.name} vegan ${place.city || ''} ${place.country}`.trim();

  try {
    const resp = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.businessStatus,places.photos,places.location,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: place.latitude, longitude: place.longitude },
            radius: 500.0,
          },
        },
        maxResultCount: 1,
      }),
    });

    if (resp.status === 429) {
      return { error: 'rate_limit', status: 429 };
    }

    if (!resp.ok) {
      const text = await resp.text();
      return { error: text.slice(0, 200), status: resp.status };
    }

    const data = await resp.json();
    if (!data.places || data.places.length === 0) {
      return { error: 'not_found' };
    }

    const gPlace = data.places[0];

    // Verify it's close to our coordinates (within ~1km)
    if (gPlace.location) {
      const dist = haversine(
        place.latitude, place.longitude,
        gPlace.location.latitude, gPlace.location.longitude
      );
      if (dist > 1500) {
        return { error: 'too_far', distance: Math.round(dist) };
      }
    }

    return {
      googlePlaceId: gPlace.id,
      businessStatus: gPlace.businessStatus,
      googleMapsUri: gPlace.googleMapsUri,
      photos: (gPlace.photos || []).slice(0, 3).map(p => ({
        name: p.name,
        widthPx: p.widthPx,
        heightPx: p.heightPx,
      })),
    };
  } catch (e) {
    return { error: e.message };
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Fetch actual photo URL ──────────────────────────────────────────────

async function fetchPhotoUrl(photoName, maxWidth = 800) {
  try {
    const url = `${PHOTO_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${API_KEY}&skipHttpRedirect=true`;
    const resp = await fetch(url);

    if (!resp.ok) return null;

    const data = await resp.json();
    return data.photoUri || null;
  } catch {
    return null;
  }
}

// ─── Batch processor with rate limiting ──────────────────────────────────

async function processBatch(items, fn, batchSize, label, delayMs = 200) {
  let done = 0;
  const total = items.length;
  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    done += batch.length;

    // Handle rate limiting
    const hasRateLimit = batchResults.some(r => r && r.error === 'rate_limit');
    if (hasRateLimit) {
      console.log(`\n  ⚠️ Rate limited, waiting 30s...`);
      await sleep(30000);
      // Retry the batch
      i -= batchSize;
      done -= batch.length;
      results.splice(-batch.length);
      continue;
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = done / elapsed;
    const eta = Math.round((total - done) / rate);
    const etaMin = Math.floor(eta / 60);
    const etaSec = eta % 60;
    process.stdout.write(
      `\r  ${label}: ${done}/${total} (${(done / total * 100).toFixed(1)}%) — ${rate.toFixed(1)}/s — ETA ${etaMin}m${etaSec}s   `
    );

    // Small delay between batches to stay under rate limits
    if (i + batchSize < items.length) await sleep(delayMs);
  }
  console.log();
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Google Places API Enrichment');
  console.log('================================\n');

  const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
  const places = data.places;

  const beforeImages = places.filter(p => p.images && p.images.length > 0).length;
  const needsImages = places.filter(p => !p.images || p.images.length === 0);

  console.log(`Total places: ${places.length}`);
  console.log(`Already have images: ${beforeImages}`);
  console.log(`Need images: ${needsImages.length}`);
  console.log(`Process mode: ${processAll ? 'ALL places' : 'only missing images'}`);
  console.log(`Dry run: ${dryRun}\n`);

  const toProcess = processAll ? places : needsImages;

  // ═══ Step 1: Text Search ═══
  console.log('═══ STEP 1: Google Places Text Search ═══');
  console.log(`  Searching ${toProcess.length} places...`);
  console.log(`  Estimated cost: ${toProcess.length} x $0.040 = $${(toProcess.length * 0.04).toFixed(2)}`);

  const searchResults = new Map();
  let found = 0;
  let notFound = 0;
  let closed = 0;
  let errors = 0;

  await processBatch(
    toProcess,
    async (place) => {
      const result = await searchPlace(place);
      searchResults.set(place.source_id, result);

      if (result.error) {
        if (result.error === 'not_found' || result.error === 'too_far') notFound++;
        else errors++;
      } else {
        found++;
        if (result.businessStatus === 'CLOSED_PERMANENTLY') closed++;
      }
      return result;
    },
    concurrency,
    'Search',
    300, // 300ms delay between batches
  );

  console.log(`\n  Found: ${found} | Not found: ${notFound} | Closed: ${closed} | Errors: ${errors}`);

  // ═══ Step 2: Fetch photos ═══
  console.log('\n═══ STEP 2: Fetch Photo URLs ═══');

  const photosToFetch = [];
  for (const place of toProcess) {
    const result = searchResults.get(place.source_id);
    if (!result || result.error || !result.photos || result.photos.length === 0) continue;
    // Fetch up to 1 photo per place (to stay within budget)
    photosToFetch.push({
      source_id: place.source_id,
      photoName: result.photos[0].name,
    });
  }

  console.log(`  Fetching ${photosToFetch.length} photos...`);
  console.log(`  Estimated cost: ${photosToFetch.length} x $0.007 = $${(photosToFetch.length * 0.007).toFixed(2)}`);

  const photoUrls = new Map();

  await processBatch(
    photosToFetch,
    async (item) => {
      const url = await fetchPhotoUrl(item.photoName);
      if (url) photoUrls.set(item.source_id, url);
      return url;
    },
    concurrency,
    'Photos',
    200,
  );

  console.log(`  Got ${photoUrls.size} photo URLs`);

  // ═══ Step 3: Apply results ═══
  console.log('\n═══ STEP 3: Apply Results ═══');

  let photosAdded = 0;
  let placesVerified = 0;
  let placesClosed = 0;

  for (const place of places) {
    const result = searchResults.get(place.source_id);
    if (!result || result.error) continue;

    // Add Google Place metadata
    if (result.googlePlaceId) {
      place.google_place_id = result.googlePlaceId;
      place.google_maps_url = result.googleMapsUri;
      placesVerified++;
    }

    // Mark permanently closed
    if (result.businessStatus === 'CLOSED_PERMANENTLY') {
      place._closed = true;
      placesClosed++;
    }

    // Add photo
    const photoUrl = photoUrls.get(place.source_id);
    if (photoUrl) {
      if (!place.images || place.images.length === 0) {
        place.images = [photoUrl];
        photosAdded++;
      } else {
        // Add Google photo as additional image
        place.images.push(photoUrl);
      }
    }
  }

  console.log(`  Photos added: ${photosAdded}`);
  console.log(`  Places verified on Google: ${placesVerified}`);
  console.log(`  Permanently closed found: ${placesClosed}`);

  // Remove permanently closed places
  if (placesClosed > 0) {
    const beforeCount = data.places.length;
    data.places = data.places.filter(p => !p._closed);
    // Clean up temp field
    data.places.forEach(p => delete p._closed);
    console.log(`  Removed ${beforeCount - data.places.length} closed places`);
  }

  // ═══ Final Stats ═══
  console.log('\n═══ FINAL RESULTS ═══');
  const afterImages = data.places.filter(p => p.images && p.images.length > 0).length;
  const withGoogle = data.places.filter(p => p.google_place_id).length;
  const totalPlaces = data.places.length;

  console.log(`  Total places: ${totalPlaces}`);
  console.log(`  Images before: ${beforeImages} (${(beforeImages / places.length * 100).toFixed(1)}%)`);
  console.log(`  Images after:  ${afterImages} (${(afterImages / totalPlaces * 100).toFixed(1)}%)`);
  console.log(`  New photos:    ${photosAdded}`);
  console.log(`  Google verified: ${withGoogle} (${(withGoogle / totalPlaces * 100).toFixed(1)}%)`);
  console.log(`  Closed removed: ${placesClosed}`);

  const totalCost = toProcess.length * 0.04 + photosToFetch.length * 0.007;
  console.log(`\n  💰 Estimated API cost: $${totalCost.toFixed(2)} (covered by $200/mo free credit)`);

  if (!dryRun) {
    // Update metadata
    data.metadata.contentStats = {
      ...data.metadata.contentStats,
      withImages: afterImages,
      googleVerified: withGoogle,
    };
    data.metadata.totalPlaces = totalPlaces;
    data.metadata.generatedAt = new Date().toISOString();

    fs.writeFileSync(INPUT, JSON.stringify(data, null, 2));
    console.log(`\n✅ Updated ${INPUT}`);
  } else {
    console.log('\n⏭️  Dry run — no files written');
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
