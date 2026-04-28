/**
 * Trigram dedup sweep - finds near-duplicates the existing dedup-archive.ts
 * misses. The existing script keys on (normalized_name, lat_bucket, lng_bucket,
 * city), so two records with typo variants or with coordinates 200 m apart
 * stay split. This pass widens the net using:
 *
 *   1. Aggressive name normalization + same city -> exact match
 *      (catches casing/punctuation/diacritic variants)
 *   2. Trigram Jaccard similarity within the same city, gated by
 *      geographic distance (default 300 m)
 *
 * Output is a CSV of candidate pairs at /tmp/dedup-trigram.csv. The script is
 * read-only by design - merging is reserved for the existing dedup-archive
 * tool, which has the score/winner logic. This script just surfaces what the
 * exact-key pass missed.
 *
 * Usage:
 *   npx tsx scripts/dedup-trigram.ts                 # full corpus dry run
 *   npx tsx scripts/dedup-trigram.ts --threshold=0.9 # tighter similarity
 *   npx tsx scripts/dedup-trigram.ts --max-distance=500
 *   npx tsx scripts/dedup-trigram.ts --city="Vienna"
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const args = process.argv.slice(2);
const THRESHOLD = parseFloat(args.find(a => a.startsWith('--threshold='))?.split('=')[1] ?? '0.85');
const MAX_DISTANCE_M = parseInt(args.find(a => a.startsWith('--max-distance='))?.split('=')[1] ?? '300', 10);
const CITY_FILTER = args.find(a => a.startsWith('--city='))?.split('=')[1];

type Place = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  source: string | null;
  review_count: number | null;
  description: string | null;
  main_image_url: string | null;
};

function normalizeName(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s}  `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
  return out;
}

function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const ta = trigrams(a), tb = trigrams(b);
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function haversineMeters(a: Place, b: Place): number {
  const R = 6_371_000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchAll(): Promise<Place[]> {
  const all: Place[] = [];
  let from = 0;
  while (true) {
    let q = sb.from('places')
      .select('id, name, slug, city, country, latitude, longitude, source, review_count, description, main_image_url')
      .is('archived_at', null)
      .order('id')
      .range(from, from + 999);
    if (CITY_FILTER) q = q.ilike('city', CITY_FILTER);
    const { data, error } = await q;
    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    if (!data?.length) break;
    all.push(...(data as Place[]));
    if (data.length < 1000) break;
    from += 1000;
    process.stdout.write(`\rFetched ${all.length}...`);
  }
  console.log(`\rFetched ${all.length} places.`);
  return all;
}

type Candidate = {
  a: Place; b: Place; sim: number; distanceM: number; reason: 'exact_normalized' | 'trigram';
};

function bucketByCity(places: Place[]): Map<string, Place[]> {
  const map = new Map<string, Place[]>();
  for (const p of places) {
    if (!p.city) continue;
    const key = `${normalizeName(p.city)}|${(p.country || '').toLowerCase()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

function findExactNormalized(group: Place[]): Candidate[] {
  // Group by aggressive normalized name. Pairs in same bucket are candidates.
  const byNorm = new Map<string, Place[]>();
  for (const p of group) {
    const k = normalizeName(p.name);
    if (!k) continue;
    if (!byNorm.has(k)) byNorm.set(k, []);
    byNorm.get(k)!.push(p);
  }
  const out: Candidate[] = [];
  for (const dupes of byNorm.values()) {
    if (dupes.length < 2) continue;
    for (let i = 0; i < dupes.length; i++) {
      for (let j = i + 1; j < dupes.length; j++) {
        const d = haversineMeters(dupes[i], dupes[j]);
        out.push({ a: dupes[i], b: dupes[j], sim: 1.0, distanceM: d, reason: 'exact_normalized' });
      }
    }
  }
  return out;
}

function findTrigram(group: Place[], seenPairs: Set<string>): Candidate[] {
  // O(n^2) within a city - cap city size to avoid blowup.
  if (group.length > 1500) {
    console.warn(`\n  skipping large city group n=${group.length}`);
    return [];
  }
  const out: Candidate[] = [];
  const norms = group.map(p => normalizeName(p.name));
  for (let i = 0; i < group.length; i++) {
    if (!norms[i]) continue;
    for (let j = i + 1; j < group.length; j++) {
      if (!norms[j]) continue;
      // Cheap pre-filter: length difference > 50% means trigram won't pass anyway
      const lenA = norms[i].length, lenB = norms[j].length;
      if (Math.min(lenA, lenB) / Math.max(lenA, lenB) < THRESHOLD - 0.1) continue;
      const sim = trigramSimilarity(norms[i], norms[j]);
      if (sim < THRESHOLD) continue;
      const d = haversineMeters(group[i], group[j]);
      if (d > MAX_DISTANCE_M) continue;
      const pairKey = [group[i].id, group[j].id].sort().join('|');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      out.push({ a: group[i], b: group[j], sim, distanceM: d, reason: 'trigram' });
    }
  }
  return out;
}

async function main() {
  console.log(`Threshold: ${THRESHOLD} | max distance: ${MAX_DISTANCE_M}m${CITY_FILTER ? ` | city=${CITY_FILTER}` : ''}`);

  const places = await fetchAll();
  const cityGroups = bucketByCity(places);
  console.log(`City groups: ${cityGroups.size}`);

  const seenPairs = new Set<string>();
  const exactCandidates: Candidate[] = [];
  const trigramCandidates: Candidate[] = [];

  let processed = 0;
  for (const [, group] of cityGroups) {
    const exact = findExactNormalized(group);
    for (const c of exact) {
      const k = [c.a.id, c.b.id].sort().join('|');
      if (!seenPairs.has(k)) { seenPairs.add(k); exactCandidates.push(c); }
    }
    const tri = findTrigram(group, seenPairs);
    trigramCandidates.push(...tri);
    processed++;
    if (processed % 200 === 0) process.stdout.write(`\r  Processed ${processed}/${cityGroups.size} city groups, exact=${exactCandidates.length} trigram=${trigramCandidates.length}`);
  }
  console.log(`\nDone scanning. Exact (normalized name match): ${exactCandidates.length}, Trigram (>=${THRESHOLD}): ${trigramCandidates.length}`);

  const all = [...exactCandidates, ...trigramCandidates].sort((x, y) => y.sim - x.sim || x.distanceM - y.distanceM);

  const csv: string[] = ['reason,similarity,distance_m,city,country,id_a,name_a,source_a,reviews_a,has_image_a,id_b,name_b,source_b,reviews_b,has_image_b'];
  for (const c of all) {
    csv.push([
      c.reason, c.sim.toFixed(3), Math.round(c.distanceM),
      `"${(c.a.city || '').replace(/"/g, '""')}"`, c.a.country || '',
      c.a.id, `"${c.a.name.replace(/"/g, '""')}"`, c.a.source || '', c.a.review_count ?? 0, c.a.main_image_url ? 1 : 0,
      c.b.id, `"${c.b.name.replace(/"/g, '""')}"`, c.b.source || '', c.b.review_count ?? 0, c.b.main_image_url ? 1 : 0,
    ].join(','));
  }
  writeFileSync('/tmp/dedup-trigram.csv', csv.join('\n'));
  console.log(`CSV: /tmp/dedup-trigram.csv (${all.length} rows)`);

  console.log('\nTop 15 candidates:');
  for (const c of all.slice(0, 15)) {
    console.log(`  [${c.reason} sim=${c.sim.toFixed(2)} ${Math.round(c.distanceM)}m] ${c.a.name} <-> ${c.b.name} (${c.a.city})`);
  }
  console.log('\nReview the CSV; merging is delegated to the existing dedup-archive tool with manual review.');
}

main().catch(e => { console.error(e); process.exit(1); });
