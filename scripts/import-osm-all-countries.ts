/**
 * Full worldwide OSM import — runs all countries from COUNTRY_NAMES in sequence.
 * Checkpoints after each country so it can be safely killed and resumed.
 *
 * Usage:
 *   npx tsx scripts/import-osm-all-countries.ts            # full run
 *   npx tsx scripts/import-osm-all-countries.ts --resume   # skip already-done countries
 *   npx tsx scripts/import-osm-all-countries.ts --dry-run  # dry run only
 *   npx tsx scripts/import-osm-all-countries.ts --skip TW,US,DE  # skip specific ISOs
 *   npx tsx scripts/import-osm-all-countries.ts --only europe     # continent filter
 */

import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { normalizeCity } from './lib/normalize-city';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import {
  COUNTRY_NAMES, EXCLUDED_CHAINS, CITY_OVERRIDES,
  transliterate, toSlug, normalizeCity, isExcludedChain,
  mapOsmCategory, mapVeganLevel, buildOsmTags, extractOsmImages,
  uniqueSlug, sleep, buildOsmQuery, buildOsmBboxQuery, runOverpassQuery,
  reverseGeocode, scrapeHeroImage, scrapeDescription,
  type OsmPlace,
} from './lib/place-pipeline';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CHECKPOINT_FILE = '/tmp/osm-all-countries-checkpoint.json';
const OVERPASS_DELAY_MS = 10000;

// Large countries that need bbox splits to avoid Overpass timeouts
const BBOX_SPLITS: Record<string, [number, number, number, number][]> = {
  US: [
    [24,-125,32,-100],[24,-100,32,-80],[24,-80,32,-65],
    [32,-125,40,-100],[32,-100,40,-80],[32,-80,40,-65],
    [40,-125,48,-100],[40,-100,48,-80],[40,-80,48,-65],
    [48,-125,50,-100],[48,-100,50,-80],[48,-80,50,-65],
    [51,-170,72,-140],[51,-140,72,-110],
    [18,-160,23,-154],
  ],
  CA: [
    [42,-95,52,-80],[42,-80,52,-60],
    [49,-125,60,-100],[49,-100,60,-80],
  ],
  IN: [
    [6,68,20,88],[6,88,20,98],
    [20,68,36,88],[20,88,36,98],
  ],
  CN: [
    [18,100,36,118],[18,118,36,135],
    [36,100,54,118],[36,118,54,135],
    [25,73,54,100],
  ],
  BR: [
    [-34,-74,-10,-45],[-10,-74,5,-45],
    [-34,-45,-10,-35],[-10,-45,5,-35],
  ],
  AU: [
    [-44,113,-26,131],[-44,131,-26,154],
    [-26,113,-10,131],[-26,131,-10,154],
  ],
  KZ: [
    [40,50,52,72],[40,72,52,88],
    [52,50,56,72],[52,72,56,88],
  ],
  CD: [
    [-12,12,0,27],[0,12,5,27],
    [-12,27,-4,31],[0,27,5,31],
  ],
  IR: [
    [25,44,36,56],[25,56,36,64],
    [36,44,40,56],[36,56,40,64],
  ],
  AO: [
    [-18,12,-8,19],[-18,19,-8,24],
    [-8,12,-4,19],[-8,19,-4,24],
  ],
};

// Continent groupings for --only filter
const CONTINENTS: Record<string, string[]> = {
  europe: ['BE','NL','DE','GB','SE','FR','IT','ES','PL','AT','CH','DK','NO','FI','PT','CZ','HU','RO','GR','HR','SK','SI','LT','LV','EE','BG','LU','UA','IE','RS','BA','ME','MK','AL','MT','CY','IS'],
  americas: ['US','CA','MX','BR','AR','CO','CL','PE','UY','BO','EC','CR','PA','GT','DO','CU','HN','NI','SV','BZ','JM','TT','BB','HT','BS','GY','SR','PY','VE'],
  asia: ['JP','TW','KR','HK','CN','MN','TH','VN','ID','PH','MY','SG','KH','MM','LA','BN','TL','IN','LK','NP','BD','PK','MV','BT','AM','GE','AZ','IL','AE','TR','LB','JO','KW','QA','SA','OM','BH','PS','IQ','IR','KZ','UZ','KG','TJ'],
  oceania: ['AU','NZ','FJ','PG','SB','VU','WS','TO','PW','FM'],
  africa: ['ZA','NG','KE','GH','TZ','RW','ET','MA','EG','UG','ZW','SN','CI','CM','MU','MZ','ZM','MW','NA','BW','MG','AO','CD','TN','DZ','LY','SD','SS','SO','DJ','ER','MR','ML','NE','BF','TD','CF','GN','GW','SL','LR','TG','BJ','GM','CV','ST','GQ','GA','CG','BI','KM','LS','SZ'],
};

interface Checkpoint {
  done: string[];
  stats: Record<string, { imported: number; errors: number }>;
  startedAt: string;
}

function loadCheckpoint(): Checkpoint {
  if (existsSync(CHECKPOINT_FILE)) {
    return JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf-8'));
  }
  return { done: [], stats: {}, startedAt: new Date().toISOString() };
}

function saveCheckpoint(cp: Checkpoint) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

async function fetchCountry(iso: string): Promise<OsmPlace[]> {
  const name = COUNTRY_NAMES[iso];
  const splits = BBOX_SPLITS[iso];
  if (splits) {
    console.log(`  Fetching ${name} in ${splits.length} bbox parts...`);
    let all: OsmPlace[] = [];
    for (let i = 0; i < splits.length; i++) {
      const [s, w, n, e] = splits[i];
      const q = buildOsmBboxQuery(s, w, n, e);
      const els = await runOverpassQuery(q, `${name} part ${i + 1}/${splits.length}`);
      console.log(`    Part ${i + 1}: ${els.length} elements`);
      all.push(...els);
      if (i < splits.length - 1) await sleep(OVERPASS_DELAY_MS);
    }
    return all;
  }
  const q = buildOsmQuery(`area["ISO3166-1"="${iso}"]->.s`);
  return runOverpassQuery(q, name);
}

async function importCountry(
  iso: string,
  existingSourceIds: Set<string>,
  existingCoords: { name: string; lat: number; lng: number }[],
  existingSlugs: Set<string>,
  adminId: string,
  dryRun: boolean,
  sourceTag: string,
): Promise<{ imported: number; errors: number; newIds: string[] }> {
  const countryName = COUNTRY_NAMES[iso];
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🌍 ${countryName} (${iso})`);

  const elements = await fetchCountry(iso);
  console.log(`  ${elements.length} raw elements from OSM`);

  const toImport: any[] = [];
  let skippedChain = 0, skippedExists = 0, skippedNoName = 0, skippedNoCoords = 0;
  let needsGeocode = 0;

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name;
    if (!name) { skippedNoName++; continue; }
    const lat = el.lat || el.center?.lat;
    const lon = el.lon || el.center?.lon;
    if (!lat || !lon) { skippedNoCoords++; continue; }
    if (isExcludedChain(name)) { skippedChain++; continue; }
    const sourceId = `osm-${el.type}-${el.id}`;
    const legacyId = `osm:${el.type}/${el.id}`;
    if (existingSourceIds.has(sourceId) || existingSourceIds.has(legacyId)) { skippedExists++; continue; }
    const nameLower = transliterate(name).toLowerCase();
    const nearbyExists = existingCoords.some(
      e => e.name === nameLower && Math.abs(e.lat - lat) < 0.001 && Math.abs(e.lng - lon) < 0.001
    );
    if (nearbyExists) { skippedExists++; continue; }
    let city = normalizeCity(transliterate(
      tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:suburb'] || ''
    ));
    if (!city) needsGeocode++;
    toImport.push({ el, tags, name, lat, lon, city, sourceId, nameLower });
  }

  console.log(`  New: ${toImport.length}, exists: ${skippedExists}, chains: ${skippedChain}, no name: ${skippedNoName}, no coords: ${skippedNoCoords}`);

  if (needsGeocode > 0) {
    console.log(`  ${needsGeocode} need reverse geocoding`);
    let done = 0;
    for (const p of toImport) {
      if (!p.city) {
        p.city = await reverseGeocode(p.lat, p.lon);
        done++;
        if (done % 50 === 0) process.stdout.write(`  Geocoded ${done}/${needsGeocode}...\r`);
      }
    }
    if (needsGeocode > 0) console.log(`  ✅ Geocoded ${needsGeocode}         `);
  }

  if (dryRun) {
    const byCityCount = new Map<string, number>();
    for (const p of toImport) byCityCount.set(p.city || '(none)', (byCityCount.get(p.city || '(none)') || 0) + 1);
    console.log('  Top cities:');
    [...byCityCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([c, n]) => console.log(`    ${c}: ${n}`));
    console.log(`  [DRY RUN] Would import ${toImport.length}`);
    return { imported: 0, errors: 0, newIds: [] };
  }

  if (toImport.length === 0) return { imported: 0, errors: 0, newIds: [] };

  const usedSlugs = new Set<string>(existingSlugs);
  const records = toImport.map(p => {
    const category = mapOsmCategory(p.tags);
    const osmImages = extractOsmImages(p.tags);
    return {
      name: p.name,
      category,
      latitude: p.lat,
      longitude: p.lon,
      vegan_level: mapVeganLevel(p.tags),
      address: [p.tags['addr:housenumber'], p.tags['addr:street']].filter(Boolean).join(' ') || '',
      city: normalizeCity(p.city, countryName),
      country: countryName,
      website: p.tags.website || p.tags['contact:website'] || null,
      phone: p.tags.phone || p.tags['contact:phone'] || null,
      opening_hours: p.tags.opening_hours || null,
      cuisine_types: p.tags.cuisine ? p.tags.cuisine.split(';').map((c: string) => c.trim()).filter(Boolean) : null,
      images: osmImages,
      main_image_url: osmImages[0] || null,
      source: sourceTag,
      source_id: p.sourceId,
      slug: uniqueSlug(p.name, p.city, countryName, usedSlugs),
      tags: buildOsmTags(category),
      created_by: adminId,
    };
  });

  let imported = 0, errors = 0;
  const newIds: string[] = [];
  const BATCH = 50;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { data: inserted, error } = await sb.from('places').insert(batch).select('id');
    if (error) {
      for (const r of batch) {
        const { data: r2, error: e2 } = await sb.from('places').insert(r).select('id').single();
        if (e2) {
          if (!e2.message.includes('duplicate key')) console.error(`  ERR: ${r.name}: ${e2.message}`);
          errors++;
        } else {
          imported++;
          if (r2) newIds.push(r2.id);
          existingCoords.push({ name: transliterate(r.name).toLowerCase(), lat: r.latitude, lng: r.longitude });
          existingSourceIds.add(r.source_id);
        }
      }
    } else {
      imported += batch.length;
      if (inserted) for (const r of inserted) newIds.push(r.id);
      for (const r of batch) {
        existingCoords.push({ name: transliterate(r.name).toLowerCase(), lat: r.latitude, lng: r.longitude });
        existingSourceIds.add(r.source_id);
      }
    }
  }

  console.log(`  ✅ ${countryName}: ${imported} imported, ${errors} errors`);
  return { imported, errors, newIds };
}

async function enrichPlaces(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const toEnrich: { id: string; name: string; website: string }[] = [];
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data } = await sb.from('places')
      .select('id, name, website, images, description')
      .in('id', ids.slice(i, i + CHUNK))
      .not('website', 'is', null).neq('website', '');
    if (data) {
      for (const p of data) {
        if (p.website && (!p.images?.length || !p.description)) {
          toEnrich.push({ id: p.id, name: p.name, website: p.website });
        }
      }
    }
  }
  if (!toEnrich.length) return;
  console.log(`\n🖼️  Enriching ${toEnrich.length} new places with images + descriptions...`);
  const domainDelay = new Map<string, number>();
  let enriched = 0;
  for (let i = 0; i < toEnrich.length; i++) {
    const p = toEnrich[i];
    let domain = '';
    try { domain = new URL(p.website).hostname; } catch { continue; }
    const lastReq = domainDelay.get(domain) || 0;
    const wait = Math.max(0, lastReq + 2000 - Date.now());
    if (wait > 0) await sleep(wait);
    domainDelay.set(domain, Date.now());
    const [img, desc] = await Promise.allSettled([scrapeHeroImage(p.website), scrapeDescription(p.website)]);
    const imgUrl = img.status === 'fulfilled' ? img.value : null;
    const descText = desc.status === 'fulfilled' ? desc.value : null;
    if (imgUrl || descText) {
      const update: Record<string, any> = {};
      if (imgUrl) { update.main_image_url = imgUrl; update.images = [imgUrl]; }
      if (descText) update.description = descText;
      await sb.from('places').update(update).eq('id', p.id);
      enriched++;
    }
    if ((i + 1) % 50 === 0) process.stdout.write(`  Enriched ${i + 1}/${toEnrich.length} | ok: ${enriched}\r`);
  }
  console.log(`  ✅ Enrichment done: ${enriched}/${toEnrich.length} updated         `);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');
  const noEnrich = args.includes('--no-enrich');
  const skipArg = args.find(a => a.startsWith('--skip='))?.split('=')[1] || '';
  const onlyArg = args.find(a => a.startsWith('--only='))?.split('=')[1] || '';
  const skipSet = new Set(skipArg.split(',').map(s => s.trim().toUpperCase()).filter(Boolean));

  let isos = Object.keys(COUNTRY_NAMES);
  if (onlyArg && CONTINENTS[onlyArg]) {
    isos = CONTINENTS[onlyArg];
    console.log(`Continent filter: ${onlyArg} (${isos.length} countries)`);
  }
  isos = isos.filter(iso => !skipSet.has(iso));

  const cp = loadCheckpoint();
  const doneSet = resume ? new Set(cp.done) : new Set<string>();
  if (resume) console.log(`Resuming: ${doneSet.size} countries already done`);

  const todo = isos.filter(iso => !doneSet.has(iso));
  const sourceTag = `osm-import-${new Date().toISOString().slice(0, 7)}`;

  console.log(`🌿 PlantsPack OSM Import — ALL COUNTRIES${dryRun ? ' [DRY RUN]' : ''}`);
  console.log(`Countries: ${todo.length} to process (${isos.length - todo.length} skipped)`);
  console.log(`Source tag: ${sourceTag}`);
  console.log('='.repeat(60));

  const { data: admin } = await sb.from('users').select('id').eq('role', 'admin').limit(1).single();
  if (!admin) { console.error('No admin user'); return; }

  // Load all existing places for deduplication (done once, shared across all countries)
  console.log('\nLoading existing DB places for deduplication...');
  const existingSourceIds = new Set<string>();
  const existingCoords: { name: string; lat: number; lng: number }[] = [];
  const existingSlugs = new Set<string>();
  let offset = 0;
  while (true) {
    const { data } = await sb.from('places').select('source_id, name, latitude, longitude, slug')
      .order('id', { ascending: true }).range(offset, offset + 999);
    if (!data?.length) break;
    for (const p of data) {
      if (p.source_id) existingSourceIds.add(p.source_id);
      if (p.slug) existingSlugs.add(p.slug);
      if (p.name) existingCoords.push({ name: transliterate(p.name).toLowerCase(), lat: p.latitude, lng: p.longitude });
    }
    offset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`  ${existingCoords.length} existing places loaded\n`);

  let totalImported = 0, totalErrors = 0;
  const allNewIds: string[] = [];

  for (let i = 0; i < todo.length; i++) {
    const iso = todo[i];
    console.log(`\n[${i + 1}/${todo.length}] ${COUNTRY_NAMES[iso]} (${iso})`);

    try {
      const result = await importCountry(iso, existingSourceIds, existingCoords, existingSlugs, admin.id, dryRun, sourceTag);
      totalImported += result.imported;
      totalErrors += result.errors;
      allNewIds.push(...result.newIds);

      if (!dryRun) {
        cp.done.push(iso);
        cp.stats[iso] = { imported: result.imported, errors: result.errors };
        saveCheckpoint(cp);
      }
    } catch (err: any) {
      console.error(`  ❌ ${COUNTRY_NAMES[iso]} failed: ${err.message}`);
      if (!dryRun) {
        cp.stats[iso] = { imported: 0, errors: 1 };
        saveCheckpoint(cp);
      }
    }

    if (i < todo.length - 1) {
      process.stdout.write(`  Waiting ${OVERPASS_DELAY_MS / 1000}s...`);
      await sleep(OVERPASS_DELAY_MS);
      process.stdout.write('\r                \r');
    }
  }

  if (!dryRun) {
    console.log('\nRefreshing directory views...');
    await sb.rpc('refresh_directory_views');
    console.log('✅ Views refreshed');

    if (!noEnrich && allNewIds.length > 0) {
      await enrichPlaces(allNewIds);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL: ${totalImported} imported, ${totalErrors} errors`);
  console.log(`Checkpoint: ${CHECKPOINT_FILE}`);

  // Summary by country
  if (Object.keys(cp.stats).length > 0) {
    const top = Object.entries(cp.stats)
      .filter(([, s]) => s.imported > 0)
      .sort((a, b) => b[1].imported - a[1].imported)
      .slice(0, 20);
    if (top.length) {
      console.log('\nTop countries by new imports:');
      top.forEach(([iso, s]) => console.log(`  ${COUNTRY_NAMES[iso]}: ${s.imported}`));
    }
  }
}

main().catch(console.error);
