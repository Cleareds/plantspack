#!/usr/bin/env tsx
/**
 * Identify duplicate places caused by multiple OSM import runs and archive
 * the weaker copies, keeping the record with the most data.
 *
 * Duplicates are detected by grouping on:
 *   (normalized_name_key, lat_bucket_110m, lng_bucket_110m, city_key)
 *
 * Each candidate is scored; the highest-score record is kept live. Ties are
 * broken by created_at (older wins — has had more time to accumulate data).
 *
 * Usage:
 *   npx tsx scripts/dedup-archive.ts --dry-run       # print report, no DB writes
 *   npx tsx scripts/dedup-archive.ts --dry-run --csv # also write /tmp/dupes.csv
 *   npx tsx scripts/dedup-archive.ts --apply         # archive losers
 *   npx tsx scripts/dedup-archive.ts --apply --limit 500  # process at most N groups
 */

import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { createWriteStream } from 'fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const DO_CSV  = args.includes('--csv');
const LIMIT   = (() => { const i = args.indexOf('--limit'); return i >= 0 ? parseInt(args[i + 1]) : Infinity; })();
const CSV_PATH = '/tmp/dupes.csv';

// -------------------------------------------------------------------
// Scoring — higher = better record to keep
// -------------------------------------------------------------------
interface Place {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  latitude: number;
  longitude: number;
  source: string | null;
  source_id: string | null;
  description: string | null;
  main_image_url: string | null;
  images: string[] | null;
  website: string | null;
  phone: string | null;
  opening_hours: string | null;
  address: string | null;
  review_count: number;
  average_rating: number | null;
  is_verified: boolean;
  foursquare_id: string | null;
  vegguide_id: string | null;
  happycow_id: string | null;
  vegan_level: string;
  created_at: string;
}

function score(p: Place): number {
  let s = 0;
  s += (p.review_count ?? 0) * 15;           // reviews are most valuable
  s += p.average_rating ? 3 : 0;             // has a rating
  s += (p.description?.trim().length ?? 0) > 20 ? 8 : 0;  // real description
  s += p.main_image_url ? 5 : 0;             // has hero image
  s += ((p.images?.length ?? 0) > 1) ? 2 : 0; // extra images
  s += p.website ? 3 : 0;
  s += p.opening_hours ? 2 : 0;
  s += p.phone ? 1 : 0;
  s += p.address ? 1 : 0;
  s += p.is_verified ? 4 : 0;
  s += p.foursquare_id ? 2 : 0;
  s += p.vegguide_id ? 2 : 0;
  s += p.happycow_id ? 2 : 0;
  // Source quality: manual / vetted imports > raw OSM
  if (p.source === 'manual' || p.source === 'admin') s += 5;
  else if (p.source && p.source.includes('validated')) s += 3;
  else if (p.source && p.source.includes('vegguide')) s += 3;
  // Tiebreaker: older record gets a small boost (more established)
  const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86_400_000;
  s += ageDays * 0.001;
  return s;
}

function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cityKey(city: string | null): string {
  return (city ?? '').toLowerCase().replace(/\s/g, '').substring(0, 12);
}

// -------------------------------------------------------------------
// Load all active places
// -------------------------------------------------------------------
async function loadPlaces(): Promise<Place[]> {
  // Use cursor-based pagination (id-ordered) instead of OFFSET-based ranges.
  // Reason: OFFSET-based pagination is unstable when other workers insert/
  // archive rows during the load — a row can appear in two consecutive page
  // fetches. The dedup grouping then sees the same DB row twice and treats
  // it as a self-duplicate, archiving a unique place with archived_reason
  // pointing to itself. Cursor pagination by id strictly excludes already-
  // seen ids and is robust to concurrent writes.
  const all: Place[] = [];
  const seen = new Set<string>();
  let lastId = '';
  while (true) {
    let q = sb.from('places')
      .select([
        'id', 'name', 'slug', 'city', 'latitude', 'longitude',
        'source', 'source_id', 'description', 'main_image_url', 'images',
        'website', 'phone', 'opening_hours', 'address',
        'review_count', 'average_rating', 'is_verified',
        'foursquare_id', 'vegguide_id', 'happycow_id',
        'vegan_level', 'created_at',
      ].join(', '))
      .is('archived_at', null)
      .not('latitude', 'is', null)
      .order('id')
      .limit(1000);
    if (lastId) q = q.gt('id', lastId);
    const { data, error } = await q;
    if (error) { console.error('DB error:', error.message); process.exit(1); }
    if (!data?.length) break;
    for (const row of data as Place[]) {
      // Belt-and-suspenders: still dedupe by id in case the DB returns the
      // same row twice for any reason.
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      all.push(row);
    }
    if (data.length < 1000) break;
    lastId = (data[data.length - 1] as Place).id;
    process.stdout.write(`\r  loading... ${all.length}`);
  }
  return all;
}

// -------------------------------------------------------------------
// Group into duplicate candidates
// -------------------------------------------------------------------
interface Group {
  key: string;
  places: Place[];
  winner: Place;
  losers: Place[];
}

function buildGroups(places: Place[]): Group[] {
  const map = new Map<string, Place[]>();
  for (const p of places) {
    const nk = nameKey(p.name);
    if (nk.length < 5) continue; // skip very short names — too ambiguous
    const latB = Math.round(p.latitude * 1000);  // ~110m buckets
    const lngB = Math.round(p.longitude * 1000);
    const ck   = cityKey(p.city);
    const key  = `${nk}|${latB}|${lngB}|${ck}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  const groups: Group[] = [];
  for (const [key, ps] of map) {
    if (ps.length < 2) continue;
    const sorted = [...ps].sort((a, b) => score(b) - score(a));
    const winner = sorted[0];
    const losers = sorted.slice(1);
    groups.push({ key, places: ps, winner, losers });
  }
  // Sort by group size desc for visibility
  groups.sort((a, b) => b.places.length - a.places.length);
  return groups;
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------
async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (pass --apply to archive)' : 'LIVE — archiving losers'}\n`);

  console.log('Loading places...');
  const places = await loadPlaces();
  console.log(`\nLoaded ${places.length} active places`);

  const groups = buildGroups(places);
  const totalLosers = groups.reduce((s, g) => s + g.losers.length, 0);
  console.log(`\nFound ${groups.length} duplicate groups (${totalLosers} records to archive)\n`);

  // Size distribution
  const dist: Record<number, number> = {};
  groups.forEach(g => dist[g.places.length] = (dist[g.places.length] ?? 0) + 1);
  console.log('Group size distribution:', dist);

  let csv = DO_CSV ? createWriteStream(CSV_PATH) : null;
  if (csv) csv.write('winner_slug,winner_source,loser_slug,loser_source,loser_score,winner_score,name,city\n');

  let archived = 0;
  let skipped  = 0;
  const processed = Math.min(groups.length, LIMIT);

  for (let i = 0; i < processed; i++) {
    const g = groups[i];
    const ws = score(g.winner);

    if (DRY_RUN && i < 30) {
      // Print first 30 groups in dry-run for review
      console.log(`\n  "${g.winner.name}" (${g.winner.city ?? 'null'}) — ${g.places.length} copies`);
      console.log(`    KEEP  [score=${ws.toFixed(1)}] ${g.winner.slug}  src=${g.winner.source}`);
      for (const l of g.losers) {
        console.log(`    ARCH  [score=${score(l).toFixed(1)}] ${l.slug}  src=${l.source}  rev=${l.review_count}`);
      }
    }

    for (const loser of g.losers) {
      if (csv) {
        csv.write([
          g.winner.slug, g.winner.source ?? '',
          loser.slug, loser.source ?? '',
          score(loser).toFixed(2), ws.toFixed(2),
          `"${g.winner.name.replace(/"/g, '""')}"`, g.winner.city ?? '',
        ].join(',') + '\n');
      }

      if (!DRY_RUN) {
        // Safety: skip if loser has reviews
        if ((loser.review_count ?? 0) > 0) {
          console.log(`  SKIP (has reviews): ${loser.slug}`);
          skipped++;
          continue;
        }
        // Critical safety: never archive a row pointing to itself as winner.
        // If we ever see this, something is wrong with the grouping.
        if (loser.id === g.winner.id) {
          console.log(`  SKIP (self-ref bug): ${loser.slug}`);
          skipped++;
          continue;
        }
        const reason = `duplicate:${g.winner.id}`;
        const { error } = await sb.from('places')
          .update({ archived_at: new Date().toISOString(), archived_reason: reason })
          .eq('id', loser.id);
        if (error) { console.error(`  ERR archiving ${loser.slug}: ${error.message}`); skipped++; }
        else {
          archived++;
          if (archived % 500 === 0) process.stdout.write(`\r  archived ${archived}...`);
        }
      } else {
        archived++;
      }
    }
  }

  if (csv) { csv.end(); console.log(`\nCSV written to ${CSV_PATH}`); }

  if (DRY_RUN) {
    console.log(`\nDry run: would archive ${archived} records across ${processed} groups`);
    if (skipped > 0) console.log(`  (${skipped} would be skipped — have reviews)`);
    console.log('\nAdd --apply to archive. Add --csv to write full CSV first.');
  } else {
    console.log(`\nDone: archived ${archived} duplicates, skipped ${skipped}`);
  }
}

main().catch(console.error);
