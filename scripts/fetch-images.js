/**
 * Fetch images from OSM tags (image, wikimedia_commons, wikidata) + keep og:image
 *
 * 1. Query Overpass API for image-related tags on our OSM elements
 * 2. Construct Wikimedia Commons URLs from file names
 * 3. Fetch Wikidata images via API
 * 4. Merge with existing og:image data (keep both)
 *
 * Usage: node scripts/fetch-images.js
 */

const fs = require('fs');

const INPUT = 'scripts/import-ready-places.json';
const UA = 'PlantsPack-Verifier/1.0 (+https://plantspack.com)';
const OVERPASS = 'https://overpass-api.de/api/interpreter';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Overpass: fetch image tags for our places ───────────────────────────

async function queryOverpass(query, label) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(OVERPASS, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      });
      if (resp.ok) {
        const data = await resp.json();
        return data.elements || [];
      }
      console.log(`  ⚠️ ${label}: HTTP ${resp.status}, attempt ${attempt + 1}/3`);
      await sleep(30000);
    } catch (e) {
      console.log(`  ❌ ${label}: ${e.message}, attempt ${attempt + 1}/3`);
      await sleep(15000);
    }
  }
  return [];
}

async function fetchOsmImageTags(sourceIds) {
  // Parse source_ids like "osm:node/12345" into node/way IDs
  const nodes = [];
  const ways = [];
  for (const sid of sourceIds) {
    const match = sid.match(/^osm:(node|way)\/(\d+)$/);
    if (match) {
      if (match[1] === 'node') nodes.push(match[2]);
      else ways.push(match[2]);
    }
  }

  console.log(`  Querying Overpass for ${nodes.length} nodes + ${ways.length} ways...`);
  const results = new Map();

  // Query in batches of 500 to avoid Overpass limits
  const batchSize = 500;

  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize);
    const nodeList = batch.join(',');
    const query = `[out:json][timeout:120];node(id:${nodeList});out tags;`;
    const label = `nodes ${i}-${Math.min(i + batchSize, nodes.length)}`;

    process.stdout.write(`\r  Fetching ${label}...   `);
    const elements = await queryOverpass(query, label);

    for (const el of elements) {
      const t = el.tags || {};
      const imageData = {};
      if (t.image) imageData.image = t.image;
      if (t['wikimedia_commons']) imageData.wikimedia_commons = t['wikimedia_commons'];
      if (t.wikidata) imageData.wikidata = t.wikidata;
      if (t.mapillary) imageData.mapillary = t.mapillary;
      if (t['image:0']) imageData['image:0'] = t['image:0'];

      if (Object.keys(imageData).length > 0) {
        results.set(`osm:node/${el.id}`, imageData);
      }
    }

    if (i + batchSize < nodes.length) await sleep(5000); // Rate limit
  }

  for (let i = 0; i < ways.length; i += batchSize) {
    const batch = ways.slice(i, i + batchSize);
    const wayList = batch.join(',');
    const query = `[out:json][timeout:120];way(id:${wayList});out tags;`;
    const label = `ways ${i}-${Math.min(i + batchSize, ways.length)}`;

    process.stdout.write(`\r  Fetching ${label}...   `);
    const elements = await queryOverpass(query, label);

    for (const el of elements) {
      const t = el.tags || {};
      const imageData = {};
      if (t.image) imageData.image = t.image;
      if (t['wikimedia_commons']) imageData.wikimedia_commons = t['wikimedia_commons'];
      if (t.wikidata) imageData.wikidata = t.wikidata;
      if (t.mapillary) imageData.mapillary = t.mapillary;

      if (Object.keys(imageData).length > 0) {
        results.set(`osm:way/${el.id}`, imageData);
      }
    }

    if (i + batchSize < ways.length) await sleep(5000);
  }

  console.log(`\n  Found image tags for ${results.size} places`);
  return results;
}

// ─── Wikimedia Commons: file name → direct URL ──────────────────────────

function wikimediaCommonsUrl(fileName) {
  // wikimedia_commons can be:
  // "File:Example.jpg" or "Category:Something" or just "Example.jpg"
  if (!fileName) return null;

  // Skip categories
  if (fileName.startsWith('Category:')) return null;

  // Remove "File:" prefix if present
  let file = fileName.replace(/^File:/, '').trim();
  if (!file) return null;

  // Construct thumbnail URL via Wikimedia Special:FilePath
  // This auto-redirects to the actual image
  const encoded = encodeURIComponent(file.replace(/ /g, '_'));
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=800`;
}

// ─── Wikidata: fetch image from entity ──────────────────────────────────

async function fetchWikidataImages(wikidataIds) {
  const results = new Map();
  if (wikidataIds.length === 0) return results;

  console.log(`  Fetching images for ${wikidataIds.length} Wikidata entities...`);

  // Batch query Wikidata API (max 50 at a time)
  const batchSize = 50;
  for (let i = 0; i < wikidataIds.length; i += batchSize) {
    const batch = wikidataIds.slice(i, i + batchSize);
    const ids = batch.map(([, id]) => id).join('|');

    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=claims&format=json`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': UA },
      });
      clearTimeout(timer);

      if (resp.ok) {
        const data = await resp.json();
        for (const [entityId, entity] of Object.entries(data.entities || {})) {
          // P18 = image property in Wikidata
          const imageClaims = entity.claims?.P18;
          if (imageClaims && imageClaims.length > 0) {
            const fileName = imageClaims[0].mainsnak?.datavalue?.value;
            if (fileName) {
              const imageUrl = wikimediaCommonsUrl(fileName);
              if (imageUrl) {
                // Find the source_id for this wikidata ID
                const entry = batch.find(([, id]) => id === entityId);
                if (entry) results.set(entry[0], imageUrl);
              }
            }
          }
        }
      }
    } catch (e) {
      console.log(`  ⚠️ Wikidata batch error: ${e.message}`);
    }

    if (i + batchSize < wikidataIds.length) await sleep(1000);
    process.stdout.write(`\r  Wikidata: ${Math.min(i + batchSize, wikidataIds.length)}/${wikidataIds.length}   `);
  }

  console.log(`\n  Found ${results.size} Wikidata images`);
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🖼️  Image Fetcher for Vegan Places');
  console.log('===================================\n');

  const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
  const places = data.places;

  const beforeImages = places.filter(p => p.images && p.images.length > 0).length;
  console.log(`Total places: ${places.length}`);
  console.log(`Already have images: ${beforeImages} (${(beforeImages/places.length*100).toFixed(1)}%)`);
  console.log(`Missing images: ${places.length - beforeImages}\n`);

  // ═══ Step 1: Fetch OSM image tags ═══
  console.log('═══ STEP 1: Query OSM Image Tags ═══');
  const sourceIds = places.map(p => p.source_id);
  const osmImageData = await fetchOsmImageTags(sourceIds);

  // ═══ Step 2: Process OSM image data ═══
  console.log('\n═══ STEP 2: Process Image Sources ═══');

  let osmDirect = 0;
  let wikimediaImages = 0;
  const wikidataToFetch = []; // [sourceId, wikidataId]

  for (const place of places) {
    const osmData = osmImageData.get(place.source_id);
    if (!osmData) continue;

    // Priority 1: Direct image URL from OSM
    if (osmData.image && osmData.image.startsWith('http')) {
      if (!place.images || place.images.length === 0) {
        place.images = [osmData.image];
        osmDirect++;
      } else if (!place.images.includes(osmData.image)) {
        place.images.push(osmData.image); // Add as secondary
      }
    }

    // Priority 2: Wikimedia Commons file
    if (osmData.wikimedia_commons) {
      const url = wikimediaCommonsUrl(osmData.wikimedia_commons);
      if (url) {
        if (!place.images || place.images.length === 0) {
          place.images = [url];
          wikimediaImages++;
        } else if (!place.images.some(u => u.includes('commons.wikimedia.org'))) {
          place.images.push(url);
        }
      }
    }

    // Collect Wikidata IDs for batch fetch
    if (osmData.wikidata && (!place.images || place.images.length === 0)) {
      wikidataToFetch.push([place.source_id, osmData.wikidata]);
    }
  }

  console.log(`  OSM direct images: ${osmDirect}`);
  console.log(`  Wikimedia Commons images: ${wikimediaImages}`);
  console.log(`  Wikidata entities to check: ${wikidataToFetch.length}`);

  // ═══ Step 3: Fetch Wikidata images ═══
  if (wikidataToFetch.length > 0) {
    console.log('\n═══ STEP 3: Fetch Wikidata Images ═══');
    const wikidataImages = await fetchWikidataImages(wikidataToFetch);

    let wdAdded = 0;
    for (const place of places) {
      const wdUrl = wikidataImages.get(place.source_id);
      if (wdUrl) {
        if (!place.images || place.images.length === 0) {
          place.images = [wdUrl];
          wdAdded++;
        }
      }
    }
    console.log(`  Added ${wdAdded} Wikidata images`);
  }

  // ═══ Step 4: Summary & Save ═══
  console.log('\n═══ RESULTS ═══');

  const afterImages = places.filter(p => p.images && p.images.length > 0).length;
  const multiImages = places.filter(p => p.images && p.images.length > 1).length;

  console.log(`  Before: ${beforeImages} places with images (${(beforeImages/places.length*100).toFixed(1)}%)`);
  console.log(`  After:  ${afterImages} places with images (${(afterImages/places.length*100).toFixed(1)}%)`);
  console.log(`  Added:  ${afterImages - beforeImages} new images`);
  console.log(`  Multi:  ${multiImages} places with 2+ images`);
  console.log(`  Still missing: ${places.length - afterImages} (${((places.length-afterImages)/places.length*100).toFixed(1)}%)`);

  // Image source breakdown
  const sources = { ogImage: 0, osmDirect: 0, wikimedia: 0, wikidata: 0 };
  for (const p of places) {
    if (!p.images || p.images.length === 0) continue;
    for (const img of p.images) {
      if (img.includes('commons.wikimedia.org')) sources.wikimedia++;
      else if (img.includes('wikidata') || img.includes('wikimedia')) sources.wikidata++;
      else sources.ogImage++;
    }
  }
  console.log(`\n  Image sources:`);
  console.log(`    Website (og:image): ${sources.ogImage}`);
  console.log(`    Wikimedia Commons:  ${sources.wikimedia}`);
  console.log(`    OSM direct:         ${sources.osmDirect}`);

  // Update metadata
  data.metadata.contentStats.withImages = afterImages;
  data.metadata.generatedAt = new Date().toISOString();

  fs.writeFileSync(INPUT, JSON.stringify(data, null, 2));
  console.log(`\n✅ Updated ${INPUT}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
