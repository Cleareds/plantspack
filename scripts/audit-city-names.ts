#!/usr/bin/env tsx
/**
 * Audit and normalize city names in the places table.
 *
 * Phase 1 (default / --audit): prints a report of suspected duplicates grouped
 *   by normalized key (stripped diacritics, lowercased, collapsed whitespace).
 *   Each group shows: variants, their counts, and a suggested canonical name.
 *
 * Phase 2 (--apply): renames every variant in a group to the canonical name.
 *   Only runs groups listed in the auto-fix whitelist (clear-cut aliases) unless
 *   you pass --force, which applies ALL resolved groups.
 *
 * Phase 3 (--export): writes full audit as CSV to /tmp/city-audit.csv
 *
 * Usage:
 *   npx tsx scripts/audit-city-names.ts                  # audit report
 *   npx tsx scripts/audit-city-names.ts --export          # also write CSV
 *   npx tsx scripts/audit-city-names.ts --apply --dry-run # show what would change
 *   npx tsx scripts/audit-city-names.ts --apply           # apply auto-fixes
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
const DO_APPLY = args.includes('--apply');
const DRY_RUN = args.includes('--dry-run');
const DO_EXPORT = args.includes('--export') || args.includes('--csv');
const FORCE = args.includes('--force');
const CSV_PATH = '/tmp/city-audit.csv';

// Normalise to a grouping key: NFD → strip combining marks → lowercase → collapse spaces.
// Strips Latin combining diacritics (U+0300–U+036F) AND Arabic harakat/hamza combining
// marks (U+064B–U+065F) so that الإسكندرية with precomposed U+0625 and the decomposed
// U+0627+U+0655 form produce the same key and are treated as duplicates.
function normKey(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[̀-ًͯ-ٟ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Does the string contain Unicode diacritics / non-ASCII letters?
function hasDiacritics(s: string): boolean {
  return s.normalize('NFD') !== s.normalize('NFC').replace(/[^\x00-\x7F]/g, '');
}
// Is the string in Title Case (first char uppercase, rest lowercase or space)?
function isTitleCase(s: string): boolean {
  return /^[A-Z]/.test(s) && s === s.charAt(0) + s.slice(1);
}

// Pick the canonical form: prefer diacritical/accented over stripped-ASCII (proper
// spelling), then prefer the form with more places, then Title Case over lower,
// then longer (more info), then alphabetical.
function pickCanonical(variants: { city: string; count: number }[]): string {
  const sorted = [...variants].sort((a, b) => {
    const aDia = hasDiacritics(a.city) ? 1 : 0;
    const bDia = hasDiacritics(b.city) ? 1 : 0;
    if (bDia !== aDia) return bDia - aDia; // diacritics first
    if (b.count !== a.count) return b.count - a.count; // more places first
    const aTc = isTitleCase(a.city) ? 1 : 0;
    const bTc = isTitleCase(b.city) ? 1 : 0;
    if (bTc !== aTc) return bTc - aTc; // Title Case first
    if (b.city.length !== a.city.length) return b.city.length - a.city.length;
    return a.city.localeCompare(b.city);
  });
  return sorted[0].city;
}

// Known alias pairs: these are safe to auto-fix without --force.
// Add more as you discover them; key = variant to rename, value = canonical.
const KNOWN_ALIASES: Record<string, string> = {
  'New York City': 'New York',
  'NYC': 'New York',
  'N.Y.C.': 'New York',
  'Sao Paulo': 'São Paulo',
  'Sao paulo': 'São Paulo',
  'SAO PAULO': 'São Paulo',
  'Rio De Janeiro': 'Rio de Janeiro',
  'RIO DE JANEIRO': 'Rio de Janeiro',
  'Mexico City': 'Mexico City',   // canonical — keep
  'México City': 'Mexico City',
  'Ho Chi Minh City': 'Ho Chi Minh City',  // canonical
  'Ho Chi Minh': 'Ho Chi Minh City',
  'HCMC': 'Ho Chi Minh City',
  'Saigon': 'Ho Chi Minh City',
  'Köln': 'Cologne',
  'Koeln': 'Cologne',
  'München': 'Munich',
  'Munchen': 'Munich',
  'Wien': 'Vienna',
  'Firenze': 'Florence',
  'Venezia': 'Venice',
  'Roma': 'Rome',
  'Napoli': 'Naples',
  'Milano': 'Milan',
  'Torino': 'Turin',
  'Genova': 'Genoa',
  'Bruxelles': 'Brussels',
  'Brussel': 'Brussels',
  'Moskva': 'Moscow',
  'Sankt-Peterburg': 'Saint Petersburg',
  'Saint-Petersburg': 'Saint Petersburg',
  'St. Petersburg': 'Saint Petersburg',
  'St Petersburg': 'Saint Petersburg',
  'Warszawa': 'Warsaw',
  'Praha': 'Prague',
  'Bratislava': 'Bratislava', // canonical
  'Beograd': 'Belgrade',
  'Zagreb': 'Zagreb', // canonical
  'Lisboa': 'Lisbon',
  'Lissabon': 'Lisbon',
  'Den Haag': 'The Hague',
  '\'s-Gravenhage': 'The Hague',
  'Athina': 'Athens',
  'Athena': 'Athens',
  'Bucuresti': 'Bucharest',
  'București': 'Bucharest',
  'Kyiv': 'Kyiv', // canonical (not Kiev)
  'Kiev': 'Kyiv',
  'Tbilisi': 'Tbilisi', // canonical
  // Stripped diacritics from OSM import pipeline — restore correct spelling
  'Nurnberg': 'Nürnberg',
  'Dusseldorf': 'Düsseldorf',
  'Dusseldorf ': 'Düsseldorf',
  // Lowercase variants
  'mumbai': 'Mumbai',
  'jaipur': 'Jaipur',
  'manali': 'Manali',
  'angeles city': 'Angeles City',
  'luang prabang': 'Luang Prabang',
  'unawatuna': 'Unawatuna',
  // Capitalisation fixes
  'Newcastle Upon Tyne': 'Newcastle upon Tyne',
  'San Cristobal de Las Casas': 'San Cristobal de las Casas',
  'l\'Eliana': 'L\'Eliana',
  'l\'Hospitalet de Llobregat': 'L\'Hospitalet de Llobregat',
  // Diacritic variants
  'Cancun': 'Cancún',
  'Selcuk': 'Selçuk',
  'Queretaro': 'Querétaro',
  'Vinales': 'Viñales',
  'San Bartolome de Tirajana': 'San Bartolomé de Tirajana',
  // Truly garbled city (Japanese building address used as city name — reset to Osaka)
  '大阪市中央区北久宝寺町４-２-２ 久宝ビル１F': 'Osaka',
  // 'west' is not a city — likely a data error; keep West (Title Case) over west
  'west': 'West',
  // Diacritic form → ASCII (project policy: no special characters in city names)
  'Ürümqi': 'Urumqi',
  // Lowercase or stripped variants found in live data
  'dhaka': 'Dhaka',
  'San Andres Cholula': 'San Andrés Cholula',
  'Saint-Louis du Senegal': 'Saint-Louis du Sénégal',
  'Yenisehir': 'Yenişehir',
  'Ruti': 'Rüti',
  'Canthabuli': 'Canthabūlī',
};

interface Row { city: string; count: number }

async function fetchCityCounts(): Promise<Row[]> {
  const map = new Map<string, number>();
  let from = 0;
  const CHUNK = 1000;
  while (true) {
    const { data, error } = await sb
      .from('places')
      .select('city')
      .is('archived_at', null)
      .not('city', 'is', null)
      .neq('city', '')
      .range(from, from + CHUNK - 1);
    if (error) { console.error('DB error:', error.message); process.exit(1); }
    if (!data?.length) break;
    for (const r of data) map.set(r.city, (map.get(r.city) ?? 0) + 1);
    if (data.length < CHUNK) break;
    from += CHUNK;
    process.stdout.write(`\r  fetching... ${from}`);
  }
  return Array.from(map.entries()).map(([city, count]) => ({ city, count }));
}

async function applyRename(from_city: string, to_city: string): Promise<number> {
  const { data, error } = await sb
    .from('places')
    .update({ city: to_city, updated_at: new Date().toISOString() })
    .eq('city', from_city)
    .is('archived_at', null)
    .select('id');
  if (error) { console.error(`  DB update error: ${error.message}`); return 0; }
  return data?.length ?? 0;
}

async function main() {
  console.log('Fetching all city names...');
  const rows = await fetchCityCounts();
  const totalDistinct = rows.length;
  const totalPlaces = rows.reduce((s, r) => s + r.count, 0);
  console.log(`\n${totalDistinct} distinct city names across ${totalPlaces} places`);

  // Group by normalised key
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const k = normKey(row.city);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(row);
  }

  // Collect groups with >1 variant (pure duplicates) or known aliases
  const suspects: Array<{
    key: string;
    variants: Row[];
    canonical: string;
    reason: string;
    autoFix: boolean;
  }> = [];

  for (const [key, variants] of groups) {
    if (variants.length > 1) {
      const canonical = pickCanonical(variants);
      suspects.push({ key, variants, canonical, reason: 'norm-match', autoFix: false });
    }
  }

  // Also check KNOWN_ALIASES against what's in the DB
  for (const [alias, canonical] of Object.entries(KNOWN_ALIASES)) {
    if (alias === canonical) continue;
    const aliasRow = rows.find(r => r.city === alias);
    if (!aliasRow) continue;
    // Check if canonical exists in DB
    const canonRow = rows.find(r => r.city === canonical);
    const existing = suspects.find(s => s.variants.some(v => v.city === alias));
    if (!existing) {
      suspects.push({
        key: normKey(alias),
        variants: [aliasRow, ...(canonRow ? [canonRow] : [])],
        canonical,
        reason: 'known-alias',
        autoFix: true,
      });
    } else {
      existing.canonical = canonical;
      existing.autoFix = true;
      existing.reason = 'known-alias';
    }
  }

  // Sort by total places affected desc
  suspects.sort((a, b) => {
    const ta = a.variants.reduce((s, v) => s + v.count, 0);
    const tb = b.variants.reduce((s, v) => s + v.count, 0);
    return tb - ta;
  });

  console.log(`\n${suspects.length} groups with suspected duplicates:\n`);

  let csv: ReturnType<typeof createWriteStream> | null = null;
  if (DO_EXPORT) {
    csv = createWriteStream(CSV_PATH);
    csv.write('canonical,variant,count,reason,auto_fix\n');
  }

  let totalAffected = 0;
  let autoFixCount = 0;

  for (const s of suspects) {
    const variants = s.variants.filter(v => v.city !== s.canonical);
    const affected = variants.reduce((sum, v) => sum + v.count, 0);
    totalAffected += affected;
    if (s.autoFix) autoFixCount += affected;

    const canonCount = s.variants.find(v => v.city === s.canonical)?.count ?? 0;
    console.log(`  canonical: "${s.canonical}" (${canonCount} places)`);
    for (const v of variants) {
      console.log(`    → rename "${v.city}" (${v.count}) [${s.reason}]${s.autoFix ? ' [auto-fix]' : ''}`);
      if (csv) csv.write(`"${s.canonical.replace(/"/g,'""')}","${v.city.replace(/"/g,'""')}",${v.count},${s.reason},${s.autoFix}\n`);
    }
    for (const v of s.variants.filter(x => x.city === s.canonical)) {
      if (csv) csv.write(`"${s.canonical.replace(/"/g,'""')}","${v.city.replace(/"/g,'""')}",${v.count},${s.reason},canonical\n`);
    }
  }

  if (csv) { csv.end(); console.log(`\nCSV exported to ${CSV_PATH}`); }

  console.log(`\nSummary: ${suspects.length} groups, ${totalAffected} places to rename`);
  console.log(`  Auto-fixable (known aliases): ${autoFixCount} places`);
  console.log(`  Needs review (norm-match only): ${totalAffected - autoFixCount} places`);

  if (!DO_APPLY) {
    console.log('\nRun with --apply to rename. Add --force to also apply norm-match groups.');
    return;
  }

  // Apply phase
  let renamed = 0, skipped = 0;
  for (const s of suspects) {
    const shouldFix = s.autoFix || FORCE;
    if (!shouldFix) { skipped++; continue; }
    for (const v of s.variants.filter(x => x.city !== s.canonical)) {
      if (DRY_RUN) {
        console.log(`  [dry-run] rename "${v.city}" → "${s.canonical}" (${v.count} places)`);
        renamed++;
      } else {
        const n = await applyRename(v.city, s.canonical);
        console.log(`  renamed "${v.city}" → "${s.canonical}": ${n} places`);
        renamed += n;
      }
    }
  }

  console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}Applied: ${renamed} renames, ${skipped} groups skipped (needs --force)`);
}

main().catch(console.error);
