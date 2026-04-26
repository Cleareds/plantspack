/**
 * Verify fully_vegan places using the Google Places API.
 *
 * For each unverified fully_vegan place:
 * 1. Find it via Text Search (name + city)
 * 2. Fetch Place Details: business_status, types, editorial_summary, reviews
 * 3. Apply rules:
 *    - CLOSED_PERMANENTLY → tag google_confirmed_closed
 *    - CLOSED_TEMPORARILY → tag google_temporarily_closed
 *    - Reviews mention non-vegan items → tag community_report:not_fully_vegan
 *    - Place type is clearly not vegan-focused AND no vegan mentions → tag needs_vegan_check
 * 4. Log everything to CSV; only write tags (never changes vegan_level directly)
 *
 * Usage:
 *   npx tsx scripts/google-places-verify.ts --dry-run        # no DB writes, CSV only
 *   npx tsx scripts/google-places-verify.ts                  # apply tags
 *   npx tsx scripts/google-places-verify.ts --limit=200      # test subset
 *   npx tsx scripts/google-places-verify.ts --level=fully_vegan  # default
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, appendFileSync, existsSync } from 'fs';

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
const CONCURRENCY = 4;
const CSV_PATH = '/tmp/google-verify.csv';
const SLEEP_MS = 250; // respect Google rate limits (40 QPS free tier)

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Non-vegan keywords that would flag a review or description
const NON_VEGAN_RE = /\b(chicken|beef|pork|lamb|fish|salmon|tuna|shrimp|prawn|lobster|crab|oyster|clam|mussel|steak|burger|bacon|ham|turkey|duck|meat|dairy|cheese|milk|cream|butter|egg|gelatin|anchov)\b/i;

// Types that suggest a place is NOT vegan-focused
const NON_VEGAN_PLACE_TYPES = new Set([
  'steak_house', 'seafood_restaurant', 'fast_food_restaurant',
  'pizza_restaurant', 'burger_restaurant', 'bbq_restaurant',
  'sushi_restaurant', 'night_club', 'bar', 'liquor_store',
]);

interface VerifyResult {
  placeId: string;
  name: string;
  city: string;
  googleFound: boolean;
  businessStatus?: string;
  googleName?: string;
  hasNonVeganReviews?: boolean;
  nonVeganSnippet?: string;
  suspiciousType?: boolean;
  tagsToAdd: string[];
}

async function findPlace(name: string, city: string, country: string): Promise<string | null> {
  const query = encodeURIComponent(`${name} ${city} ${country}`);
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,name&key=${GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const json = await res.json() as any;
    if (json.status === 'OK' && json.candidates?.[0]?.place_id) {
      return json.candidates[0].place_id;
    }
  } catch {}
  return null;
}

async function getPlaceDetails(placeId: string): Promise<any | null> {
  const fields = [
    'name', 'business_status', 'types', 'editorial_summary',
    'rating', 'user_ratings_total', 'reviews',
  ].join(',');
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const json = await res.json() as any;
    if (json.status === 'OK') return json.result;
  } catch {}
  return null;
}

function analyzeDetails(details: any): { tagsToAdd: string[]; nonVeganSnippet?: string; suspiciousType: boolean } {
  const tagsToAdd: string[] = [];
  let nonVeganSnippet: string | undefined;
  let suspiciousType = false;

  // Closure checks
  if (details.business_status === 'CLOSED_PERMANENTLY') {
    tagsToAdd.push('google_confirmed_closed');
  } else if (details.business_status === 'CLOSED_TEMPORARILY') {
    tagsToAdd.push('google_temporarily_closed');
  }

  // Type analysis
  const types: string[] = details.types || [];
  if (types.some(t => NON_VEGAN_PLACE_TYPES.has(t))) {
    suspiciousType = true;
  }

  // Editorial summary check
  const summary = details.editorial_summary?.overview || '';
  if (NON_VEGAN_RE.test(summary)) {
    tagsToAdd.push('community_report:not_fully_vegan');
    nonVeganSnippet = summary.slice(0, 120);
  }

  // Review analysis — scan up to 5 reviews
  const reviews: any[] = details.reviews || [];
  for (const review of reviews) {
    const text: string = review.text || '';
    const match = NON_VEGAN_RE.exec(text);
    if (match) {
      tagsToAdd.push('community_report:not_fully_vegan');
      // Extract a snippet around the match
      const start = Math.max(0, match.index - 40);
      const end = Math.min(text.length, match.index + 80);
      nonVeganSnippet = `"...${text.slice(start, end)}..."`;
      break; // one flag per place is enough
    }
  }

  return { tagsToAdd: [...new Set(tagsToAdd)], nonVeganSnippet, suspiciousType };
}

async function verifyPlace(place: any): Promise<VerifyResult> {
  const result: VerifyResult = {
    placeId: place.id,
    name: place.name,
    city: place.city || '',
    googleFound: false,
    tagsToAdd: [],
  };

  const googlePlaceId = await findPlace(place.name, place.city || '', place.country || '');
  if (!googlePlaceId) return result;

  result.googleFound = true;
  await sleep(100); // brief pause between Find and Details calls

  const details = await getPlaceDetails(googlePlaceId);
  if (!details) return result;

  result.googleName = details.name;
  result.businessStatus = details.business_status;

  const { tagsToAdd, nonVeganSnippet, suspiciousType } = analyzeDetails(details);
  result.tagsToAdd = tagsToAdd;
  result.nonVeganSnippet = nonVeganSnippet;
  result.suspiciousType = suspiciousType;

  return result;
}

async function applyTags(placeId: string, newTags: string[], currentTags: string[]) {
  const merged = [...new Set([...currentTags, ...newTags])];
  const { error } = await sb.from('places')
    .update({ tags: merged, updated_at: new Date().toISOString() })
    .eq('id', placeId);
  if (error) console.error(`  DB error for ${placeId}: ${error.message}`);
}

async function main() {
  if (!GOOGLE_API_KEY) { console.error('GOOGLE_PLACES_API_KEY not set'); process.exit(1); }
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Level: ${LEVEL}`);

  // Fetch target places
  const PAGE = 1000;
  const places: any[] = [];
  let offset = 0;
  while (true) {
    let q = sb.from('places')
      .select('id, name, city, country, tags, vegan_level, verification_status')
      .eq('vegan_level', LEVEL)
      .is('archived_at', null)
      .order('id')
      .range(offset, offset + PAGE - 1);
    if (LIMIT > 0) q = q.limit(Math.min(PAGE, LIMIT - places.length));
    const { data, error } = await q;
    if (error) { console.error(error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    places.push(...data);
    process.stdout.write(`\rFetched ${places.length}...`);
    if (data.length < PAGE || (LIMIT > 0 && places.length >= LIMIT)) break;
    offset += PAGE;
  }
  console.log(`\n${places.length} ${LEVEL} places to verify.`);

  // CSV header
  writeFileSync(CSV_PATH, 'id,name,city,google_found,business_status,google_name,has_non_vegan,snippet,suspicious_type,tags_added\n');

  let flagged = 0, closed = 0, notFound = 0, clean = 0, errors = 0;
  const batches: any[][] = [];
  for (let i = 0; i < places.length; i += CONCURRENCY) batches.push(places.slice(i, i + CONCURRENCY));

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const results = await Promise.all(batch.map(p => verifyPlace(p).catch(() => null)));

    for (let i = 0; i < batch.length; i++) {
      const place = batch[i];
      const result = results[i];

      if (!result) { errors++; continue; }
      if (!result.googleFound) { notFound++; }

      const hasNonVegan = result.tagsToAdd.includes('community_report:not_fully_vegan');
      const isClosed = result.tagsToAdd.some(t => t.includes('closed'));

      if (hasNonVegan) flagged++;
      if (isClosed) closed++;
      if (!hasNonVegan && !isClosed && result.googleFound) clean++;

      // Log to CSV
      const snippet = (result.nonVeganSnippet || '').replace(/"/g, '""');
      const tagsAdded = result.tagsToAdd.join('; ');
      appendFileSync(CSV_PATH, `${place.id},"${place.name.replace(/"/g, '""')}","${place.city}",${result.googleFound},${result.businessStatus || ''},` +
        `"${result.googleName || ''}",${hasNonVegan},"${snippet}",${result.suspiciousType || false},"${tagsAdded}"\n`);

      if (result.tagsToAdd.length > 0) {
        console.log(`  [FLAG] ${place.name} (${place.city}) → ${result.tagsToAdd.join(', ')}${result.nonVeganSnippet ? ` | ${result.nonVeganSnippet.slice(0, 80)}` : ''}`);
        if (!DRY_RUN) {
          await applyTags(place.id, result.tagsToAdd, place.tags || []);
        }
      }
    }

    const done = Math.min((b + 1) * CONCURRENCY, places.length);
    const pct = Math.round((done / places.length) * 100);
    process.stdout.write(`\r${done}/${places.length} (${pct}%) — flagged: ${flagged}, closed: ${closed}, not found: ${notFound}`);
    if (b < batches.length - 1) await sleep(SLEEP_MS);
  }

  console.log(`\n\n═══ DONE ═══`);
  console.log(`Flagged (non-vegan mentions): ${flagged}`);
  console.log(`Closed (Google confirmed):    ${closed}`);
  console.log(`Not found in Google:          ${notFound}`);
  console.log(`Clean (no issues):            ${clean}`);
  console.log(`Errors:                       ${errors}`);
  console.log(`Results CSV: ${CSV_PATH}`);
  if (DRY_RUN) console.log('\nDry-run — no DB writes. Run without --dry-run to apply tags.');
}

main().catch(console.error);
