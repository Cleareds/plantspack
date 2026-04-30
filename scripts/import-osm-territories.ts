/**
 * OSM import for territories, island dependencies, and sub-national regions
 * not covered by the main import-osm-all-countries.ts script.
 *
 * Targets: US territories, French overseas departments, UK Crown dependencies,
 * and other significant inhabited territories with their own ISO codes.
 *
 * Usage:
 *   npx tsx scripts/import-osm-territories.ts            # full run
 *   npx tsx scripts/import-osm-territories.ts --dry-run  # preview only
 *   npx tsx scripts/import-osm-territories.ts --resume   # skip already-done
 *   npx tsx scripts/import-osm-territories.ts --skip=VI,AS
 */

import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { normalizeCity } from './lib/normalize-city';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import {
  EXCLUDED_CHAINS, CITY_OVERRIDES,
  transliterate, toSlug, normalizeCity, isExcludedChain,
  mapOsmCategory, mapVeganLevel, buildOsmTags, extractOsmImages,
  uniqueSlug, sleep, buildOsmQuery, buildOsmBboxQuery, runOverpassQuery,
  reverseGeocodeCity, scrapeHeroImage, scrapeDescription,
  type OsmPlace,
} from './lib/place-pipeline';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CHECKPOINT_FILE = '/tmp/osm-territories-checkpoint.json';
const OVERPASS_DELAY_MS = 10000;
const SOURCE_TAG = 'osm-import-2026-04';

/**
 * Territories with ISO3166-1 alpha-2 codes, mapped to a display country name.
 * The "country" field is what gets stored in the DB — for US territories we use
 * the full display name but group under "United States" parent for city pages.
 */
const TERRITORIES: { iso: string; name: string; country: string; bbox?: [number, number, number, number] }[] = [
  // US territories
  { iso: 'PR', name: 'Puerto Rico',                    country: 'Puerto Rico' },
  { iso: 'GU', name: 'Guam',                           country: 'Guam' },
  { iso: 'VI', name: 'US Virgin Islands',              country: 'US Virgin Islands' },
  { iso: 'AS', name: 'American Samoa',                 country: 'American Samoa' },
  { iso: 'MP', name: 'Northern Mariana Islands',       country: 'Northern Mariana Islands' },

  // French overseas departments/territories
  { iso: 'RE', name: 'Réunion',                        country: 'Réunion' },
  { iso: 'MQ', name: 'Martinique',                     country: 'Martinique' },
  { iso: 'GP', name: 'Guadeloupe',                     country: 'Guadeloupe' },
  { iso: 'GF', name: 'French Guiana',                  country: 'French Guiana' },
  { iso: 'YT', name: 'Mayotte',                        country: 'Mayotte' },
  { iso: 'NC', name: 'New Caledonia',                  country: 'New Caledonia' },
  { iso: 'PF', name: 'French Polynesia',               country: 'French Polynesia' },

  // UK Crown dependencies + territories
  { iso: 'JE', name: 'Jersey',                         country: 'Jersey' },
  { iso: 'GG', name: 'Guernsey',                       country: 'Guernsey' },
  { iso: 'IM', name: 'Isle of Man',                    country: 'Isle of Man' },
  { iso: 'GI', name: 'Gibraltar',                      country: 'Gibraltar' },
  { iso: 'BM', name: 'Bermuda',                        country: 'Bermuda' },
  { iso: 'KY', name: 'Cayman Islands',                 country: 'Cayman Islands' },
  { iso: 'TC', name: 'Turks and Caicos Islands',       country: 'Turks and Caicos Islands' },
  { iso: 'VG', name: 'British Virgin Islands',         country: 'British Virgin Islands' },

  // Netherlands Antilles / Caribbean Netherlands
  { iso: 'AW', name: 'Aruba',                          country: 'Aruba' },
  { iso: 'CW', name: 'Curaçao',                        country: 'Curaçao' },
  { iso: 'SX', name: 'Sint Maarten',                   country: 'Sint Maarten' },
  { iso: 'BQ', name: 'Caribbean Netherlands',          country: 'Caribbean Netherlands' },

  // Portuguese territories
  { iso: 'PT-20', name: 'Azores',                      country: 'Azores',   bbox: [36, -32, 40, -25] },
  { iso: 'PT-30', name: 'Madeira',                     country: 'Madeira',  bbox: [32, -17, 33, -16] },

  // Spanish territories
  { iso: 'IC',  name: 'Canary Islands',                country: 'Canary Islands', bbox: [27, -18, 29, -13] },
  { iso: 'ES-CE', name: 'Ceuta',                       country: 'Ceuta',    bbox: [35.8, -5.4, 35.9, -5.2] },
  { iso: 'ES-ML', name: 'Melilla',                     country: 'Melilla',  bbox: [35.25, -2.97, 35.3, -2.92] },

  // Denmark territories
  { iso: 'FO', name: 'Faroe Islands',                  country: 'Faroe Islands' },
  { iso: 'GL', name: 'Greenland',                      country: 'Greenland' },

  // Pacific independent states (not in main list)
  { iso: 'FJ', name: 'Fiji',                           country: 'Fiji' },
  { iso: 'WS', name: 'Samoa',                          country: 'Samoa' },
  { iso: 'TO', name: 'Tonga',                          country: 'Tonga' },
  { iso: 'VU', name: 'Vanuatu',                        country: 'Vanuatu' },
  { iso: 'SB', name: 'Solomon Islands',                country: 'Solomon Islands' },
  { iso: 'PW', name: 'Palau',                          country: 'Palau' },
  { iso: 'FM', name: 'Micronesia',                     country: 'Micronesia' },
  { iso: 'MH', name: 'Marshall Islands',               country: 'Marshall Islands' },
  { iso: 'KI', name: 'Kiribati',                       country: 'Kiribati' },
  { iso: 'NR', name: 'Nauru',                          country: 'Nauru' },
  { iso: 'TV', name: 'Tuvalu',                         country: 'Tuvalu' },
  { iso: 'CK', name: 'Cook Islands',                   country: 'Cook Islands' },

  // Caribbean independent states (not in main list)
  { iso: 'JM', name: 'Jamaica',                        country: 'Jamaica' },
  { iso: 'TT', name: 'Trinidad and Tobago',            country: 'Trinidad and Tobago' },
  { iso: 'BB', name: 'Barbados',                       country: 'Barbados' },
  { iso: 'LC', name: 'Saint Lucia',                    country: 'Saint Lucia' },
  { iso: 'VC', name: 'Saint Vincent and the Grenadines', country: 'Saint Vincent and the Grenadines' },
  { iso: 'GD', name: 'Grenada',                        country: 'Grenada' },
  { iso: 'AG', name: 'Antigua and Barbuda',            country: 'Antigua and Barbuda' },
  { iso: 'KN', name: 'Saint Kitts and Nevis',          country: 'Saint Kitts and Nevis' },
  { iso: 'DM', name: 'Dominica',                       country: 'Dominica' },
  { iso: 'HT', name: 'Haiti',                          country: 'Haiti' },
  { iso: 'BS', name: 'Bahamas',                        country: 'Bahamas' },
  { iso: 'BZ', name: 'Belize',                         country: 'Belize' },
  { iso: 'SR', name: 'Suriname',                       country: 'Suriname' },
  { iso: 'GY', name: 'Guyana',                         country: 'Guyana' },
  { iso: 'PY', name: 'Paraguay',                       country: 'Paraguay' },
  { iso: 'VE', name: 'Venezuela',                      country: 'Venezuela' },
  { iso: 'NI', name: 'Nicaragua',                      country: 'Nicaragua' },
  { iso: 'HN', name: 'Honduras',                       country: 'Honduras' },
  { iso: 'SV', name: 'El Salvador',                    country: 'El Salvador' },

  // Additional African nations
  { iso: 'MG', name: 'Madagascar',                     country: 'Madagascar' },
  { iso: 'MZ', name: 'Mozambique',                     country: 'Mozambique' },
  { iso: 'ZM', name: 'Zambia',                         country: 'Zambia' },
  { iso: 'MW', name: 'Malawi',                         country: 'Malawi' },
  { iso: 'NA', name: 'Namibia',                        country: 'Namibia' },
  { iso: 'BW', name: 'Botswana',                       country: 'Botswana' },
  { iso: 'SZ', name: 'Eswatini',                       country: 'Eswatini' },
  { iso: 'LS', name: 'Lesotho',                        country: 'Lesotho' },
  { iso: 'CV', name: 'Cape Verde',                     country: 'Cape Verde' },
  { iso: 'ST', name: 'São Tomé and Príncipe',          country: 'São Tomé and Príncipe' },

  // Additional Middle East
  { iso: 'BH', name: 'Bahrain',                        country: 'Bahrain' },
  { iso: 'PS', name: 'Palestine',                      country: 'Palestine' },

  // Central Asia
  { iso: 'KZ', name: 'Kazakhstan',                     country: 'Kazakhstan',  bbox: [40, 50, 56, 90] },
  { iso: 'UZ', name: 'Uzbekistan',                     country: 'Uzbekistan' },
  { iso: 'KG', name: 'Kyrgyzstan',                     country: 'Kyrgyzstan' },
  { iso: 'TJ', name: 'Tajikistan',                     country: 'Tajikistan' },

  // Southeast Asia (remaining)
  { iso: 'BN', name: 'Brunei',                         country: 'Brunei' },
  { iso: 'TL', name: 'Timor-Leste',                    country: 'Timor-Leste' },
];

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

async function fetchTerritory(t: typeof TERRITORIES[0]): Promise<OsmPlace[]> {
  if (t.bbox) {
    const [s, w, n, e] = t.bbox;
    return runOverpassQuery(buildOsmBboxQuery(s, w, n, e), t.name);
  }
  // Use ISO3166-1 area query — handles both full codes (PR) and subdivision-style (PT-20)
  const iso = t.iso.includes('-') ? t.iso : t.iso;
  // For standard ISO codes use the country area tag; for subdivisions (PT-20) use ISO3166-2
  let areaSelector: string;
  if (t.iso.includes('-')) {
    areaSelector = `area["ISO3166-2"="${t.iso}"]->.s`;
  } else if (t.iso === 'IC') {
    // Canary Islands: not a standard ISO3166-1, use name
    areaSelector = `area["name:en"="Canary Islands"]["admin_level"="3"]->.s`;
  } else {
    areaSelector = `area["ISO3166-1"="${t.iso}"]->.s`;
  }
  return runOverpassQuery(buildOsmQuery(areaSelector), t.name);
}

async function importTerritory(
  t: typeof TERRITORIES[0],
  existingSourceIds: Set<string>,
  existingCoords: { name: string; lat: number; lng: number }[],
  existingSlugs: Set<string>,
  adminId: string,
  dryRun: boolean,
): Promise<{ imported: number; errors: number; newIds: string[] }> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏝️  ${t.name} (${t.iso})`);

  const elements = await fetchTerritory(t);
  console.log(`  ${elements.length} raw elements from OSM`);

  if (elements.length === 0) {
    console.log('  Nothing found, skipping.');
    return { imported: 0, errors: 0, newIds: [] };
  }

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
        p.city = await reverseGeocodeCity(p.lat, p.lon);
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
    [...byCityCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([c, n]) => console.log(`    ${c}: ${n}`));
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
      city: normalizeCity(p.city, t.country),
      country: t.country,
      website: p.tags.website || p.tags['contact:website'] || null,
      phone: p.tags.phone || p.tags['contact:phone'] || null,
      opening_hours: p.tags.opening_hours || null,
      cuisine_types: p.tags.cuisine ? p.tags.cuisine.split(';').map((c: string) => c.trim()).filter(Boolean) : null,
      images: osmImages,
      main_image_url: osmImages[0] || null,
      source: SOURCE_TAG,
      source_id: p.sourceId,
      slug: uniqueSlug(p.name, p.city, t.country, usedSlugs),
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

  console.log(`  ✅ ${t.name}: ${imported} imported, ${errors} errors`);
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
  const skipSet = new Set(skipArg.split(',').map(s => s.trim().toUpperCase()).filter(Boolean));

  console.log('🌿 PlantsPack OSM Import — TERRITORIES & ISLANDS');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

  const cp = loadCheckpoint();
  const doneSet = resume ? new Set(cp.done) : new Set<string>();

  const targets = TERRITORIES.filter(t => {
    if (skipSet.has(t.iso.toUpperCase())) return false;
    if (resume && doneSet.has(t.iso)) return false;
    return true;
  });

  console.log(`Territories to process: ${targets.length} / ${TERRITORIES.length}`);

  // Load existing places for dedup
  console.log('\nLoading existing DB places for deduplication...');
  const existingSourceIds = new Set<string>();
  const existingCoords: { name: string; lat: number; lng: number }[] = [];
  const existingSlugs = new Set<string>();

  let offset = 0;
  while (true) {
    const { data } = await sb.from('places')
      .select('source_id, name, latitude, longitude, slug')
      .range(offset, offset + 999);
    if (!data?.length) break;
    for (const p of data) {
      if (p.source_id) existingSourceIds.add(p.source_id);
      if (p.name) existingCoords.push({ name: transliterate(p.name).toLowerCase(), lat: p.latitude, lng: p.longitude });
      if (p.slug) existingSlugs.add(p.slug);
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`  ${existingCoords.length} existing places loaded`);

  // Get admin user ID
  const { data: adminUser } = await sb.from('users').select('id').eq('username', 'admin').single();
  const adminId = adminUser?.id;
  if (!adminId) { console.error('Admin user not found'); process.exit(1); }

  let totalImported = 0;
  const allNewIds: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    console.log(`\n[${i + 1}/${targets.length}] ${t.name} (${t.iso})`);

    const result = await importTerritory(t, existingSourceIds, existingCoords, existingSlugs, adminId, dryRun);
    totalImported += result.imported;
    allNewIds.push(...result.newIds);

    if (!dryRun) {
      cp.done.push(t.iso);
      cp.stats[t.iso] = { imported: result.imported, errors: result.errors };
      saveCheckpoint(cp);
    }

    if (i < targets.length - 1) {
      process.stdout.write(`  Waiting ${OVERPASS_DELAY_MS / 1000}s...`);
      await sleep(OVERPASS_DELAY_MS);
      process.stdout.write('\r');
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Done! ${totalImported} new places imported across ${targets.length} territories.`);

  if (!dryRun && !noEnrich && allNewIds.length > 0) {
    await enrichPlaces(allNewIds);
  }

  if (dryRun) console.log('\n[DRY RUN] No DB writes made. Remove --dry-run to apply.');
}

main().catch(console.error);
