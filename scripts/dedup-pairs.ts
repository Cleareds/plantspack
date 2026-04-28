/**
 * Pair-based dedup - catches near-duplicates that dedup-archive misses
 * because their lat/lng buckets don't line up. Examples:
 *   - Same place with coords 5-50m apart across two OSM imports
 *   - Diacritic variants in cities whose normalized names still differ
 *
 * Algorithm:
 *   1. Fetch all active places (cursor-paginated, archived excluded).
 *   2. Bucket by normalized city to keep the comparison local.
 *   3. Within each city, find pairs where trigram(name_a, name_b) >= threshold
 *      AND haversine(a, b) <= max-distance.
 *   4. Union-find cluster pairs into duplicate groups.
 *   5. Score each member with the same heuristic as dedup-archive
 *      (reviews, image, description, source quality, etc.) - keep highest,
 *      archive the rest.
 *   6. Apply the same safety rules: skip rows with reviews, never archive
 *      a row pointing at itself, set archived_reason='duplicate:<winner_id>'.
 *
 * Usage:
 *   npx tsx scripts/dedup-pairs.ts                          # dry run, full corpus
 *   npx tsx scripts/dedup-pairs.ts --apply
 *   npx tsx scripts/dedup-pairs.ts --apply --threshold=0.9 --max-distance=200
 *   npx tsx scripts/dedup-pairs.ts --apply --city="Vienna"
 *   npx tsx scripts/dedup-pairs.ts --apply --limit=200      # cap clusters processed
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
const APPLY = args.includes('--apply');
const THRESHOLD = parseFloat(args.find(a => a.startsWith('--threshold='))?.split('=')[1] ?? '0.85');
// Default 50m: tighter than trigram's 300m so we don't merge chain branches
// (Pret, Starbucks, % Arabica) whose locations are 80-300m apart in dense
// city blocks. True cross-import dupes from coord drift are typically <30m.
const MAX_DISTANCE_M = parseInt(args.find(a => a.startsWith('--max-distance='))?.split('=')[1] ?? '50', 10);
const CITY_FILTER = args.find(a => a.startsWith('--city='))?.split('=')[1];
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0') || 0;

type Place = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  source: string | null;
  source_id: string | null;
  description: string | null;
  main_image_url: string | null;
  images: string[] | null;
  website: string | null;
  phone: string | null;
  opening_hours: any;
  address: string | null;
  review_count: number | null;
  average_rating: number | null;
  is_verified: boolean | null;
  foursquare_id: string | null;
  vegguide_id: number | null;
  happycow_id: string | null;
  vegan_level: string;
  created_at: string;
};

// ---- Scoring (mirror of dedup-archive.ts; keep in sync) ----
function score(p: Place): number {
  let s = 0;
  s += (p.review_count ?? 0) * 15;
  s += p.average_rating ? 3 : 0;
  s += (p.description?.trim().length ?? 0) > 20 ? 8 : 0;
  s += p.main_image_url ? 5 : 0;
  s += ((p.images?.length ?? 0) > 1) ? 2 : 0;
  s += p.website ? 3 : 0;
  s += p.opening_hours ? 2 : 0;
  s += p.phone ? 1 : 0;
  s += p.address ? 1 : 0;
  s += p.is_verified ? 4 : 0;
  s += p.foursquare_id ? 2 : 0;
  s += p.vegguide_id ? 2 : 0;
  s += p.happycow_id ? 2 : 0;
  if (p.source === 'manual' || p.source === 'admin') s += 5;
  else if (p.source && p.source.includes('validated')) s += 3;
  else if (p.source && p.source.includes('vegguide')) s += 3;
  const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86_400_000;
  s += ageDays * 0.001;
  return s;
}

function normalizeName(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/ø/g, 'o').replace(/ł/g, 'l')
    .replace(/ß/g, 'ss').replace(/ı/g, 'i').replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe').replace(/þ/g, 'th')
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

function trigramSim(a: string, b: string): number {
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

// ---- Union-find ----
class UF {
  private p = new Map<string, string>();
  add(x: string) { if (!this.p.has(x)) this.p.set(x, x); }
  find(x: string): string {
    let r = this.p.get(x) ?? x;
    while (this.p.get(r) !== r) { r = this.p.get(r)!; }
    let cur = x;
    while (this.p.get(cur) !== r) { const next = this.p.get(cur)!; this.p.set(cur, r); cur = next; }
    return r;
  }
  union(a: string, b: string) {
    this.add(a); this.add(b);
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.p.set(ra, rb);
  }
  groups(): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const k of this.p.keys()) {
      const r = this.find(k);
      if (!out.has(r)) out.set(r, []);
      out.get(r)!.push(k);
    }
    return out;
  }
}

async function fetchAll(): Promise<Place[]> {
  const all: Place[] = [];
  let lastId = '';
  while (true) {
    let q = sb.from('places')
      .select('id, name, slug, city, country, latitude, longitude, source, source_id, description, main_image_url, images, website, phone, opening_hours, address, review_count, average_rating, is_verified, foursquare_id, vegguide_id, happycow_id, vegan_level, created_at')
      .is('archived_at', null)
      .not('latitude', 'is', null)
      .order('id')
      .limit(1000);
    if (lastId) q = q.gt('id', lastId);
    if (CITY_FILTER) q = q.ilike('city', CITY_FILTER);
    const { data, error } = await q;
    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    if (!data?.length) break;
    all.push(...(data as Place[]));
    if (data.length < 1000) break;
    lastId = (data[data.length - 1] as any).id;
    process.stdout.write(`\r  loaded ${all.length}...`);
  }
  console.log(`\r  loaded ${all.length} active places.`);
  return all;
}

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

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (archive losers)' : 'DRY RUN'} | threshold=${THRESHOLD} | max-distance=${MAX_DISTANCE_M}m${CITY_FILTER ? ` | city=${CITY_FILTER}` : ''}`);

  const places = await fetchAll();
  const byId = new Map(places.map(p => [p.id, p]));
  const cityGroups = bucketByCity(places);
  console.log(`City groups: ${cityGroups.size}`);

  // Build pair graph via trigram + distance gate
  const uf = new UF();
  let totalPairs = 0;
  let citiesProcessed = 0;
  for (const [, group] of cityGroups) {
    if (group.length > 1500) continue; // skip mega-cities to avoid n^2 blowup
    const norms = group.map(p => normalizeName(p.name));
    for (let i = 0; i < group.length; i++) {
      if (norms[i].length < 4) continue;
      for (let j = i + 1; j < group.length; j++) {
        if (norms[j].length < 4) continue;
        const lenA = norms[i].length, lenB = norms[j].length;
        if (Math.min(lenA, lenB) / Math.max(lenA, lenB) < THRESHOLD - 0.1) continue;
        const sim = trigramSim(norms[i], norms[j]);
        if (sim < THRESHOLD) continue;
        const d = haversineMeters(group[i], group[j]);
        if (d > MAX_DISTANCE_M) continue;
        uf.union(group[i].id, group[j].id);
        totalPairs++;
      }
    }
    citiesProcessed++;
    if (citiesProcessed % 500 === 0) process.stdout.write(`\r  scanned ${citiesProcessed}/${cityGroups.size} cities, pairs=${totalPairs}`);
  }
  console.log(`\nFound ${totalPairs} similar pairs across cities.`);

  const allGroups = uf.groups();
  // Filter to only multi-member clusters
  const clusters = [...allGroups.values()].filter(ids => ids.length >= 2);
  console.log(`Distinct duplicate clusters: ${clusters.length}`);

  // Sort largest first for visibility
  clusters.sort((a, b) => b.length - a.length);
  const toProcess = LIMIT > 0 ? clusters.slice(0, LIMIT) : clusters;

  const csv: string[] = ['cluster_id,role,id,name,city,source,score,reviews,has_image,has_desc,distance_to_winner_m'];
  let archived = 0, skippedReviews = 0, skippedSelf = 0, errors = 0;
  let cluster = 0;

  for (const ids of toProcess) {
    cluster++;
    const members = ids.map(id => byId.get(id)!).filter(Boolean);
    if (members.length < 2) continue;
    const sorted = [...members].sort((a, b) => score(b) - score(a));
    const winner = sorted[0];
    const losers = sorted.slice(1);

    csv.push([cluster, 'KEEP', winner.id, `"${winner.name.replace(/"/g, '""')}"`, `"${(winner.city || '').replace(/"/g, '""')}"`, winner.source || '', score(winner).toFixed(2), winner.review_count ?? 0, winner.main_image_url ? 1 : 0, (winner.description?.length ?? 0) > 20 ? 1 : 0, 0].join(','));
    for (const loser of losers) {
      const d = Math.round(haversineMeters(winner, loser));
      csv.push([cluster, 'ARCH', loser.id, `"${loser.name.replace(/"/g, '""')}"`, `"${(loser.city || '').replace(/"/g, '""')}"`, loser.source || '', score(loser).toFixed(2), loser.review_count ?? 0, loser.main_image_url ? 1 : 0, (loser.description?.length ?? 0) > 20 ? 1 : 0, d].join(','));
    }

    if (cluster <= 20) {
      console.log(`\n  Cluster ${cluster} (${members.length} members):`);
      console.log(`    KEEP  [score=${score(winner).toFixed(1)}] ${winner.name} (${winner.city ?? '?'}) src=${winner.source}`);
      for (const l of losers) {
        const d = Math.round(haversineMeters(winner, l));
        console.log(`    ARCH  [score=${score(l).toFixed(1)}] ${l.name} (${l.city ?? '?'}) src=${l.source} ${d}m rev=${l.review_count}`);
      }
    }

    if (!APPLY) continue;

    for (const loser of losers) {
      if ((loser.review_count ?? 0) > 0) { skippedReviews++; continue; }
      if (loser.id === winner.id) { skippedSelf++; continue; }
      const { error } = await sb.from('places')
        .update({
          archived_at: new Date().toISOString(),
          archived_reason: `duplicate:${winner.id}`,
        })
        .eq('id', loser.id);
      if (error) { errors++; console.error(`  ERR ${loser.slug ?? loser.id}: ${error.message}`); }
      else {
        archived++;
        if (archived % 500 === 0) process.stdout.write(`\r  archived ${archived}...`);
      }
    }
  }

  writeFileSync('/tmp/dedup-pairs.csv', csv.join('\n'));
  console.log(`\n\nCSV: /tmp/dedup-pairs.csv (${csv.length - 1} rows)`);
  console.log(`Clusters processed: ${toProcess.length}`);
  if (APPLY) {
    console.log(`Archived: ${archived}`);
    if (skippedReviews) console.log(`Skipped (has reviews): ${skippedReviews}`);
    if (skippedSelf)    console.log(`Skipped (self-ref): ${skippedSelf}`);
    if (errors)         console.log(`Errors: ${errors}`);
  } else {
    const wouldArchive = csv.filter(r => r.startsWith(`${cluster},`) || r.includes(',ARCH,')).length - clusters.filter(c => c.length >= 2).reduce((a, c) => a + (c.length - 1) * 0, 0); // simpler:
    const archCount = csv.filter(r => r.includes(',ARCH,')).length;
    console.log(`Would archive: ${archCount}`);
    console.log(`Re-run with --apply to write changes.`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
