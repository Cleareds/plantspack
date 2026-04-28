/**
 * Verify fully_vegan places using the Google Places API.
 *
 * Logic (in order):
 * 1. Find via Text Search (name + city + country)
 * 2. Check name similarity — skip if Google returned a clearly different business
 * 3. Check closure status → tag google_confirmed_closed / google_temporarily_closed
 * 4. Check if Google CONFIRMS vegan (place name, types, editorial summary contain "vegan")
 *    → if confirmed: tag google_confirmed_vegan, STOP — no further checks
 * 5. Only if NOT confirmed vegan: scan editorial summary + reviews for non-vegan evidence
 *    → requires evidence in editorial_summary OR ≥2 separate reviews
 *    → uses context-aware regex (ignores "vegan chicken", "vegan meat" etc.)
 *    → tags as google_review_flag (NOT community_report:not_fully_vegan)
 *
 * Tags applied:
 *   google_confirmed_vegan     — Google confirms this is a vegan place
 *   google_confirmed_closed    — CLOSED_PERMANENTLY on Google
 *   google_temporarily_closed  — CLOSED_TEMPORARILY on Google
 *   google_review_flag         — non-vegan evidence found in reviews/summary (needs human review)
 *
 * Usage:
 *   npx tsx scripts/google-places-verify.ts --dry-run        # no DB writes, CSV only
 *   npx tsx scripts/google-places-verify.ts                  # apply tags
 *   npx tsx scripts/google-places-verify.ts --limit=200      # test subset
 *   npx tsx scripts/google-places-verify.ts --level=fully_vegan  # default
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, appendFileSync } from 'fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0') || 0;
const LEVEL = args.find(a => a.startsWith('--level='))?.split('=')[1] ?? 'fully_vegan';
// --re-check-flagged: re-run only the places already tagged google_review_flag
// using stricter thresholds. If a place no longer flags under the new rules,
// the tag gets dismissed. If it still flags, the tag stays as a real signal.
const RE_CHECK_FLAGGED = args.includes('--re-check-flagged');
// --strict bumps thresholds and skips places that already have a stronger
// vegan signal (websearch_confirmed_vegan from Tier 2 web-search). Auto-on
// when --re-check-flagged is set.
const STRICT = args.includes('--strict') || RE_CHECK_FLAGGED;
const CONCURRENCY = 4;
const CSV_PATH = '/tmp/google-verify.csv';
const SLEEP_MS = 250;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Keywords that indicate a place is vegan-focused
const VEGAN_KEYWORDS = /\b(vegan|plant.based|plant based)\b/i;

// Non-vegan keywords — with negative lookbehind to ignore "vegan chicken", "vegan meat" etc.
// Also excludes: cream, butter, egg, cheese, milk — too many vegan versions exist
const NON_VEGAN_RE = /(?<!vegan\s)(?<!plant.based\s)\b(chicken|beef|pork|lamb|fish|salmon|tuna|shrimp|prawn|lobster|crab|oyster|clam|mussel|steak|bacon|ham|turkey|duck|gelatin|anchov)\b/i;

// Normalize a name for fuzzy comparison
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Returns true if Google name is plausibly the same business as ours
function namesMatch(ourName: string, googleName: string): boolean {
  const a = normalizeName(ourName);
  const b = normalizeName(googleName);
  if (!a || !b) return false;
  // One contains the other (handles "VeganArt" vs "VeganArt Ristorante")
  if (a.includes(b) || b.includes(a)) return true;
  // Shared token ratio — split into words and check overlap
  const aWords = a.match(/[a-z0-9]{3,}/g) || [];
  const bWords = new Set(b.match(/[a-z0-9]{3,}/g) || []);
  const shared = aWords.filter(w => bWords.has(w)).length;
  const ratio = shared / Math.max(aWords.length, 1);
  return ratio >= 0.5;
}

// Check if Google's data positively identifies this as a vegan place
function isGoogleVeganConfirmed(ourName: string, details: any): boolean {
  const googleName: string = details.name || '';
  const types: string[] = details.types || [];
  const summary: string = details.editorial_summary?.overview || '';

  return (
    VEGAN_KEYWORDS.test(ourName) ||       // our own name says vegan
    VEGAN_KEYWORDS.test(googleName) ||    // Google name says vegan
    types.includes('vegan_restaurant') || // Google type is vegan
    VEGAN_KEYWORDS.test(summary)          // Google editorial confirms vegan
  );
}

// Scan text for unambiguous non-vegan evidence
function findNonVeganEvidence(text: string): string | null {
  const match = NON_VEGAN_RE.exec(text);
  if (!match) return null;
  const start = Math.max(0, match.index - 50);
  const end = Math.min(text.length, match.index + 100);
  return `"...${text.slice(start, end)}..."`;
}

interface VerifyResult {
  placeId: string;
  name: string;
  city: string;
  googleFound: boolean;
  nameMismatch: boolean;
  veganConfirmed: boolean;
  businessStatus?: string;
  googleName?: string;
  nonVeganSnippet?: string;
  tagsToAdd: string[];
  outcome: 'not_found' | 'name_mismatch' | 'closed' | 'vegan_confirmed' | 'review_flagged' | 'clean';
}

async function findPlace(name: string, city: string, country: string): Promise<{ placeId: string; googleName: string } | null> {
  const query = encodeURIComponent(`${name} ${city} ${country}`);
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,name&key=${GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const json = await res.json() as any;
    if (json.status === 'OK' && json.candidates?.[0]?.place_id) {
      return { placeId: json.candidates[0].place_id, googleName: json.candidates[0].name || '' };
    }
  } catch {}
  return null;
}

async function getPlaceDetails(placeId: string): Promise<any | null> {
  const fields = ['name', 'business_status', 'types', 'editorial_summary', 'reviews'].join(',');
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const json = await res.json() as any;
    if (json.status === 'OK') return json.result;
  } catch {}
  return null;
}

async function verifyPlace(place: any): Promise<VerifyResult> {
  const result: VerifyResult = {
    placeId: place.id, name: place.name, city: place.city || '',
    googleFound: false, nameMismatch: false, veganConfirmed: false,
    tagsToAdd: [], outcome: 'not_found',
  };

  // Pre-API short-circuit: in strict mode, places already confirmed by Tier 2
  // web-search trump Google review-text scanning. Skip the API call entirely
  // so we don't spend Google credits on places we've already verified more
  // rigorously elsewhere. Marks them clean so re-check mode dismisses the
  // stale google_review_flag.
  const placeTags: string[] = (place as any).tags || [];
  if (STRICT && placeTags.includes('websearch_confirmed_vegan')) {
    result.outcome = 'clean';
    return result;
  }

  // Step 1: Find on Google
  const found = await findPlace(place.name, place.city || '', place.country || '');
  if (!found) return result;

  result.googleFound = true;
  await sleep(100);

  // Step 2: Get details
  const details = await getPlaceDetails(found.placeId);
  if (!details) return result;

  result.googleName = details.name || found.googleName;
  result.businessStatus = details.business_status;

  // Step 3: Name similarity check — bail if Google returned a different business
  if (!namesMatch(place.name, result.googleName)) {
    result.nameMismatch = true;
    result.outcome = 'name_mismatch';
    return result;
  }

  // Step 4: Closure
  if (details.business_status === 'CLOSED_PERMANENTLY') {
    result.tagsToAdd.push('google_confirmed_closed');
    result.outcome = 'closed';
  } else if (details.business_status === 'CLOSED_TEMPORARILY') {
    result.tagsToAdd.push('google_temporarily_closed');
    result.outcome = 'closed';
  }

  // Step 5: Vegan confirmation — if confirmed, stop here (no review scanning)
  if (isGoogleVeganConfirmed(place.name, details)) {
    result.veganConfirmed = true;
    result.tagsToAdd.push('google_confirmed_vegan');
    result.outcome = result.outcome === 'closed' ? 'closed' : 'vegan_confirmed';
    return result;
  }

  // Step 6: Non-vegan evidence — editorial summary (single mention sufficient
  // in default mode, requires review corroboration in strict mode)
  const summary: string = details.editorial_summary?.overview || '';
  const summaryEvidence = findNonVeganEvidence(summary);

  // Step 7: Reviews — strict mode raises threshold from 2 to 3
  const REVIEW_THRESHOLD = STRICT ? 3 : 2;
  const reviews: any[] = details.reviews || [];
  const reviewEvidence: string[] = [];
  for (const review of reviews) {
    const evidence = findNonVeganEvidence(review.text || '');
    if (evidence) reviewEvidence.push(evidence);
  }

  if (STRICT) {
    // Strict mode: flag only when BOTH editorial summary AND >=3 reviews agree.
    // This kills the high-false-positive single-summary-mention path.
    if (summaryEvidence && reviewEvidence.length >= REVIEW_THRESHOLD) {
      result.tagsToAdd.push('google_review_flag');
      result.nonVeganSnippet = `[strict: editorial+${reviewEvidence.length} reviews] ${summaryEvidence}`;
      result.outcome = 'review_flagged';
      return result;
    }
    // Or flag when many reviews agree even without editorial backing
    if (reviewEvidence.length >= 5) {
      result.tagsToAdd.push('google_review_flag');
      result.nonVeganSnippet = `[strict: ${reviewEvidence.length} reviews] ${reviewEvidence[0]}`;
      result.outcome = 'review_flagged';
      return result;
    }
  } else {
    if (summaryEvidence) {
      result.tagsToAdd.push('google_review_flag');
      result.nonVeganSnippet = `[editorial] ${summaryEvidence}`;
      result.outcome = 'review_flagged';
      return result;
    }
    if (reviewEvidence.length >= REVIEW_THRESHOLD) {
      result.tagsToAdd.push('google_review_flag');
      result.nonVeganSnippet = `[${reviewEvidence.length} reviews] ${reviewEvidence[0]}`;
      result.outcome = 'review_flagged';
      return result;
    }
  }

  result.outcome = result.tagsToAdd.length > 0 ? 'closed' : 'clean';
  return result;
}

async function applyTags(placeId: string, newTags: string[], currentTags: string[], removeTags: string[] = []) {
  let merged = [...new Set([...currentTags, ...newTags])];
  if (removeTags.length > 0) {
    merged = merged.filter(t => !removeTags.includes(t));
  }
  const { error } = await sb.from('places')
    .update({ tags: merged, updated_at: new Date().toISOString() })
    .eq('id', placeId);
  if (error) console.error(`  DB error for ${placeId}: ${error.message}`);
}

async function main() {
  if (!GOOGLE_API_KEY) { console.error('GOOGLE_PLACES_API_KEY not set'); process.exit(1); }
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Level: ${LEVEL}`);

  const PAGE = 1000;
  const places: any[] = [];
  let offset = 0;
  while (true) {
    let q = sb.from('places')
      .select('id, name, city, country, tags, vegan_level, verification_status')
      .is('archived_at', null)
      .order('id')
      .range(offset, offset + PAGE - 1);
    // --re-check-flagged: scope to existing google_review_flag rows regardless
    // of vegan_level (some have been demoted since the flag was first added).
    if (RE_CHECK_FLAGGED) q = q.contains('tags', ['google_review_flag']);
    else q = q.eq('vegan_level', LEVEL);
    if (LIMIT > 0) q = q.limit(Math.min(PAGE, LIMIT - places.length));
    const { data, error } = await q;
    if (error) { console.error(error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    places.push(...data);
    process.stdout.write(`\rFetched ${places.length}...`);
    if (data.length < PAGE || (LIMIT > 0 && places.length >= LIMIT)) break;
    offset += PAGE;
  }
  console.log(`\n${places.length} places to verify${RE_CHECK_FLAGGED ? ' (re-checking google_review_flag rows with strict rules)' : ` (level=${LEVEL})`}.`);
  if (STRICT) console.log('Strict mode: skipping places with websearch_confirmed_vegan; review threshold raised to 3 + editorial corroboration; or 5+ reviews alone.');

  writeFileSync(CSV_PATH, 'id,name,city,outcome,business_status,google_name,name_mismatch,vegan_confirmed,snippet,tags_added\n');

  let veganConfirmed = 0, flagged = 0, closed = 0, notFound = 0, mismatch = 0, clean = 0;
  const batches: any[][] = [];
  for (let i = 0; i < places.length; i += CONCURRENCY) batches.push(places.slice(i, i + CONCURRENCY));

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const results = await Promise.all(batch.map(p => verifyPlace(p).catch(() => null)));

    for (let i = 0; i < batch.length; i++) {
      const place = batch[i];
      const result = results[i];
      if (!result) continue;

      if (!result.googleFound) notFound++;
      else if (result.nameMismatch) mismatch++;
      else if (result.outcome === 'vegan_confirmed') veganConfirmed++;
      else if (result.outcome === 'review_flagged') flagged++;
      else if (result.outcome === 'closed') closed++;
      else clean++;

      const snippet = (result.nonVeganSnippet || '').replace(/"/g, '""');
      const tagsAdded = result.tagsToAdd.join('; ');
      appendFileSync(CSV_PATH,
        `${place.id},"${place.name.replace(/"/g,'""')}","${place.city || ''}",${result.outcome},` +
        `${result.businessStatus || ''},"${result.googleName || ''}",${result.nameMismatch},` +
        `${result.veganConfirmed},"${snippet}","${tagsAdded}"\n`
      );

      if (result.tagsToAdd.length > 0) {
        const icon = result.outcome === 'vegan_confirmed' ? '✓' : result.outcome === 'closed' ? '✗' : '⚠';
        console.log(`  [${icon}] ${place.name} (${place.city}) → ${tagsAdded}${result.nonVeganSnippet ? ` | ${result.nonVeganSnippet.slice(0, 80)}` : ''}`);
        if (!DRY_RUN) {
          // In re-check mode: if this place came in with google_review_flag but
          // is no longer flagged under stricter rules, REMOVE the stale tag.
          const removeTags: string[] = [];
          if (RE_CHECK_FLAGGED && !result.tagsToAdd.includes('google_review_flag')) {
            removeTags.push('google_review_flag');
          }
          await applyTags(place.id, result.tagsToAdd, place.tags || [], removeTags);
        }
      }
    }

    const done = Math.min((b + 1) * CONCURRENCY, places.length);
    const pct = Math.round((done / places.length) * 100);
    process.stdout.write(`\r${done}/${places.length} (${pct}%) — ✓ confirmed: ${veganConfirmed}, ⚠ flagged: ${flagged}, ✗ closed: ${closed}, mismatch: ${mismatch}, not found: ${notFound}`);
    if (b < batches.length - 1) await sleep(SLEEP_MS);
  }

  console.log(`\n\n═══ DONE ═══`);
  console.log(`Vegan confirmed (google_confirmed_vegan): ${veganConfirmed}`);
  console.log(`Review flagged (google_review_flag):      ${flagged}`);
  console.log(`Closed (Google confirmed):                ${closed}`);
  console.log(`Name mismatch (skipped):                  ${mismatch}`);
  console.log(`Not found in Google:                      ${notFound}`);
  console.log(`Clean (no issues):                        ${clean}`);
  console.log(`Results CSV: ${CSV_PATH}`);
  if (DRY_RUN) console.log('\nDry-run — no DB writes.');
}

main().catch(console.error);
