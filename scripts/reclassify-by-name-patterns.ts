/**
 * Deterministic name-pattern reclassifier - free promotion pass for the
 * 39K-deep vegan_friendly bucket. Zero LLM cost.
 *
 * Strategy: a place's NAME is a strong identity signal. If the name says
 * "Vegan ___" or matches a known fully-vegan chain, it's almost certainly
 * mis-bucketed as vegan_friendly. We promote conservatively, log every
 * change, and tag rows so the change is reversible.
 *
 * Tier A (HIGH confidence -> fully_vegan):
 *   - Name contains "100% Vegan", "Fully Vegan", "All Vegan"
 *   - Name STARTS with "Vegan " or "VEGAN " (identity-defining prefix)
 *   - Known fully-vegan chains (curated list)
 *   - "Plant Based" / "Plant-Based" as prefix or standalone token
 *
 * Tier B (MEDIUM confidence -> mostly_vegan):
 *   - "Vegan" appearing elsewhere in the name (suffix, middle word)
 *   - "Veggie ___" (mostly vegetarian-leaning, may use dairy)
 *   - Hare Krishna / Govinda (vegetarian-by-religion, dairy common)
 *   - "Herbivore" / "Herbivoren"
 *
 * Each promoted place gets tag `name_pattern_promoted_<tier>` so the change
 * can be filtered, reviewed, and reverted with a single SQL.
 *
 * Usage:
 *   npx tsx scripts/reclassify-by-name-patterns.ts            # dry run
 *   npx tsx scripts/reclassify-by-name-patterns.ts --apply    # write changes
 *   npx tsx scripts/reclassify-by-name-patterns.ts --apply --tier=A
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
const TIER = args.find(a => a.startsWith('--tier='))?.split('=')[1] as 'A' | 'B' | undefined;

// Known fully-vegan chains. Conservative - only chains where every location
// is verified 100% vegan. Add new entries cautiously.
const FULLY_VEGAN_CHAINS = [
  'loving hut',
  'veganz',
  'veganburg',
  'vegan junk food bar',
  'wild food cafe',
  'planta',           // careful: also non-vegan "Planta" exists; matched only with strict word boundary
  'by chloe',
  'next level burger',
  'plnt burger',
  'sufra',            // some are vegetarian; reviewed case-by-case - keep out for now
];
// Drop ambiguous entries from the curated list above (so the comment + code stay honest)
const FULLY_VEGAN_CHAINS_SAFE = FULLY_VEGAN_CHAINS.filter(c => !['planta', 'sufra'].includes(c));

function normalize(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

type Tier = 'A' | 'B';
type Match = { tier: Tier; reason: string; promoteTo: 'fully_vegan' | 'mostly_vegan' };

// Disqualifiers - the word "vegan" appears, but in a context that signals
// "we have vegan options" rather than "we are vegan".
const NEGATIVE_HINTS = [
  /\bvegan\s+(options?|choices?|available|menu|friendly|section|food\s+available|dishes?\s+available)\b/,
  /\(vegan\b[^)]*\)/,                  // parenthetical "(vegan food available)"
  /\b(also|with|and|&)\s+vegan\b/,     // "X & Vegan", "with vegan"
  /\bvegan@home\b/,
  /\bnon[\s\-]?vegan\b/,
];

function isDisqualified(n: string): boolean {
  return NEGATIVE_HINTS.some(re => re.test(n));
}

function matchPattern(rawName: string): Match | null {
  const n = normalize(rawName);

  if (isDisqualified(n)) return null;

  // ---- Tier A: HIGH confidence -> fully_vegan ----
  if (/\b(100%?\s*vegan|fully\s+vegan|all\s+vegan|completely\s+vegan)\b/.test(n)) {
    return { tier: 'A', reason: '100%/fully/all vegan in name', promoteTo: 'fully_vegan' };
  }
  if (/^vegan[\s\-]/.test(n)) {
    return { tier: 'A', reason: 'name starts with "vegan "', promoteTo: 'fully_vegan' };
  }
  if (/^plant[\s\-]?based\b/.test(n) || /\bplant[\s\-]?based\s+(cafe|kitchen|bistro|eatery|burger|pizza|deli|spot|restaurant)\b/.test(n)) {
    return { tier: 'A', reason: 'plant-based identity in name', promoteTo: 'fully_vegan' };
  }
  for (const chain of FULLY_VEGAN_CHAINS_SAFE) {
    const re = new RegExp(`\\b${chain.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`);
    if (re.test(n)) {
      return { tier: 'A', reason: `known vegan chain: ${chain}`, promoteTo: 'fully_vegan' };
    }
  }

  // ---- Tier B: MEDIUM confidence -> mostly_vegan ----
  // "Vegan" appearing later in the name (e.g. "The Vegan Spot", "Cafe Vegan")
  if (/\bvegan\b/.test(n)) {
    return { tier: 'B', reason: '"vegan" in name (not as prefix)', promoteTo: 'mostly_vegan' };
  }
  if (/\b(govinda|govindas|hare\s+krishna|krishna\s+kitchen)\b/.test(n)) {
    return { tier: 'B', reason: 'Hare Krishna lineage (vegetarian, often dairy)', promoteTo: 'mostly_vegan' };
  }
  if (/\bherbivor(e|en|os|a)\b/.test(n)) {
    return { tier: 'B', reason: 'herbivore in name', promoteTo: 'mostly_vegan' };
  }
  if (/^veggie[\s\-]/.test(n) || /\bveggie\s+(cafe|kitchen|bistro|grill|burger)\b/.test(n)) {
    return { tier: 'B', reason: 'veggie-prefix identity', promoteTo: 'mostly_vegan' };
  }

  return null;
}

async function fetchVeganFriendly(): Promise<Array<{ id: string; name: string; city: string | null; country: string | null; tags: string[] | null; vegan_level: string }>> {
  const all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('places')
      .select('id, name, city, country, tags, vegan_level')
      .eq('vegan_level', 'vegan_friendly')
      .is('archived_at', null)
      .order('id')
      .range(from, from + 999);
    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
    process.stdout.write(`\rFetched ${all.length}...`);
  }
  console.log(`\rFetched ${all.length} vegan_friendly places.`);
  return all;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}${TIER ? ` | Tier: ${TIER}` : ''}`);

  const places = await fetchVeganFriendly();

  const matches: Array<{ id: string; name: string; city: string | null; country: string | null; match: Match; tags: string[] }> = [];
  for (const p of places) {
    const m = matchPattern(p.name);
    if (!m) continue;
    if (TIER && m.tier !== TIER) continue;
    matches.push({ id: p.id, name: p.name, city: p.city, country: p.country, match: m, tags: p.tags || [] });
  }

  const tierA = matches.filter(m => m.match.tier === 'A');
  const tierB = matches.filter(m => m.match.tier === 'B');
  console.log(`\nMatches: ${matches.length} total`);
  console.log(`  Tier A (-> fully_vegan):   ${tierA.length}`);
  console.log(`  Tier B (-> mostly_vegan):  ${tierB.length}`);

  const csvRows = ['id,name,city,country,from,to,tier,reason'];
  for (const m of matches) {
    csvRows.push(`${m.id},"${m.name.replace(/"/g, '""')}","${(m.city || '').replace(/"/g, '""')}","${m.country || ''}",vegan_friendly,${m.match.promoteTo},${m.match.tier},"${m.match.reason}"`);
  }
  writeFileSync('/tmp/name-pattern-reclassify.csv', csvRows.join('\n'));
  console.log(`\nPreview CSV: /tmp/name-pattern-reclassify.csv`);

  // Sample
  console.log('\nSample (first 10):');
  for (const m of matches.slice(0, 10)) {
    console.log(`  [${m.match.tier}] ${m.name} (${m.city || '?'}) -> ${m.match.promoteTo} (${m.match.reason})`);
  }

  if (!APPLY) {
    console.log('\nDRY RUN: no DB writes. Use --apply to promote.');
    return;
  }

  console.log(`\nApplying ${matches.length} updates...`);
  let ok = 0, err = 0;
  for (const m of matches) {
    const newTags = [...m.tags];
    const promoTag = `name_pattern_promoted_${m.match.tier.toLowerCase()}`;
    if (!newTags.includes(promoTag)) newTags.push(promoTag);
    const { error } = await sb.from('places').update({
      vegan_level: m.match.promoteTo,
      tags: newTags,
      updated_at: new Date().toISOString(),
    }).eq('id', m.id);
    if (error) { err++; console.error(`  ERR ${m.name}: ${error.message}`); }
    else ok++;
    if ((ok + err) % 50 === 0) process.stdout.write(`\r  ${ok} ok, ${err} err`);
  }
  console.log(`\nDone: ${ok} promoted, ${err} errors.`);
  console.log(`Revert later with: UPDATE places SET vegan_level='vegan_friendly' WHERE 'name_pattern_promoted_a'=ANY(tags) OR 'name_pattern_promoted_b'=ANY(tags);`);
}

main().catch(e => { console.error(e); process.exit(1); });
