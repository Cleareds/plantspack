/**
 * Verify vegan claims using Claude API with web_search tool.
 *
 * Targets:
 *   google-unverified  — fully_vegan places Google couldn't match (name mismatch / not found)
 *   google-double      — fully_vegan places already confirmed by Google (double-check pass)
 *   flagged            — places with community_report:not_fully_vegan
 *   no-desc            — fully_vegan with no description
 *   all                — all fully_vegan unverified
 *
 * Output tags (never touches vegan_level directly):
 *   websearch_confirmed_vegan   — web search confirms 100% vegan
 *   websearch_review_flag       — web search found non-vegan evidence (needs human review)
 *   websearch_confirmed_closed  — web search confirms permanently closed
 *
 * On websearch_confirmed_vegan: also sets verification_status = 'scraping_verified'
 *
 * Usage:
 *   npx tsx scripts/websearch-verify.ts --target=google-unverified --dry-run
 *   npx tsx scripts/websearch-verify.ts --target=google-unverified
 *   npx tsx scripts/websearch-verify.ts --target=google-double
 *   npx tsx scripts/websearch-verify.ts --target=flagged
 *   npx tsx scripts/websearch-verify.ts --limit=50 --dry-run
 *
 * Cost: ~$0.003-0.008 per place (claude-haiku-4-5 + web search tokens)
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, appendFileSync } from 'fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0') || 0;
const TARGET = args.find(a => a.startsWith('--target='))?.split('=')[1] ?? 'google-unverified';
const CONCURRENCY = 3;
const CSV_PATH = '/tmp/websearch-verify.csv';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

type Verdict = 'fully_vegan' | 'not_fully_vegan' | 'closed' | 'uncertain';

async function verifyWithWebSearch(place: {
  name: string; city: string; country: string;
  description?: string | null; vegan_level: string;
}): Promise<{ verdict: Verdict; evidence: string; reasoning: string }> {
  const location = [place.city, place.country].filter(Boolean).join(', ');
  const descHint = place.description ? `\nKnown description: "${place.description.slice(0, 200)}"` : '';
  const nameIsVegan = /vegan|plant.based/i.test(place.name);

  const prompt = `Is "${place.name}" in ${location} a 100% vegan restaurant/place — meaning the entire menu has zero animal products?${descHint}
${nameIsVegan ? `\nNote: the place name contains "vegan" which is a positive signal, but verify it's actually 100% vegan and not just vegan-friendly.` : ''}
Search for:
1. Their current menu or website
2. Recent reviews mentioning vegan/non-vegan items
3. Whether the place is still open

Respond in this exact format:
VERDICT: [fully_vegan | not_fully_vegan | closed | uncertain]
EVIDENCE: [one sentence summarizing what you found]
REASONING: [1-2 sentences explaining the verdict]`;

  try {
    const response = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 } as any],
      messages: [{ role: 'user', content: prompt }],
    }, { timeout: 60000 });

    const text = response.content.filter(b => b.type === 'text').map((b: any) => b.text).join('\n');
    const verdict = (text.match(/VERDICT:\s*(fully_vegan|not_fully_vegan|closed|uncertain)/i)?.[1]?.toLowerCase() ?? 'uncertain') as Verdict;
    const evidence = text.match(/EVIDENCE:\s*(.+?)(?:\n|REASONING:|$)/is)?.[1]?.trim() ?? '';
    const reasoning = text.match(/REASONING:\s*(.+?)$/is)?.[1]?.trim() ?? '';
    return { verdict, evidence, reasoning };
  } catch (e: any) {
    if (e?.status === 429) { await sleep(10000); return verifyWithWebSearch(place); }
    return { verdict: 'uncertain', evidence: 'API error', reasoning: String(e?.message ?? e) };
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Target: ${TARGET}`);

  const PAGE = 1000;
  const places: any[] = [];
  let offset = 0;

  while (true) {
    let q = sb.from('places')
      .select('id, name, city, country, description, vegan_level, tags, verification_status')
      .eq('vegan_level', 'fully_vegan')
      .is('archived_at', null)
      .order('id')
      .range(offset, offset + PAGE - 1);

    if (TARGET === 'google-unverified') {
      // Places Google couldn't match — no google_ tags at all
      q = q
        .not('tags', 'cs', '{google_confirmed_vegan}')
        .not('tags', 'cs', '{google_checked_clean}')
        .not('tags', 'cs', '{google_review_flag}')
        .not('tags', 'cs', '{google_confirmed_closed}')
        .not('tags', 'cs', '{google_temporarily_closed}')
        .not('tags', 'cs', '{websearch_confirmed_vegan}')
        .not('tags', 'cs', '{websearch_review_flag}');
    } else if (TARGET === 'google-double') {
      // Already confirmed by Google — run web search as second opinion
      q = q
        .or('tags.cs.{google_confirmed_vegan},tags.cs.{google_checked_clean}')
        .not('tags', 'cs', '{websearch_confirmed_vegan}')
        .not('tags', 'cs', '{websearch_review_flag}');
    } else if (TARGET === 'flagged') {
      q = q.contains('tags', ['community_report:not_fully_vegan']);
    } else if (TARGET === 'no-desc') {
      q = q.is('description', null);
    } else if (TARGET === 'all') {
      q = q.eq('verification_status', 'unverified');
    } else {
      console.error('Unknown target. Use: google-unverified | google-double | flagged | no-desc | all');
      process.exit(1);
    }

    if (LIMIT > 0) q = q.limit(Math.min(PAGE, LIMIT - places.length));
    const { data, error } = await q;
    if (error) { console.error(error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    places.push(...data);
    process.stdout.write(`\rFetched ${places.length}...`);
    if (data.length < PAGE || (LIMIT > 0 && places.length >= LIMIT)) break;
    offset += PAGE;
  }
  console.log(`\n${places.length} places to verify.`);
  if (places.length === 0) { console.log('Nothing to verify.'); return; }

  const estCost = places.length * 0.006;
  console.log(`Estimated cost: $${estCost.toFixed(2)}`);
  if (!DRY_RUN && places.length > 200) {
    console.log('Starting in 5s... Ctrl+C to abort.');
    await sleep(5000);
  }

  writeFileSync(CSV_PATH, 'id,name,city,country,verdict,evidence,reasoning\n');

  let confirmed = 0, flagged = 0, closedCount = 0, uncertain = 0;
  const batches: any[][] = [];
  for (let i = 0; i < places.length; i += CONCURRENCY) batches.push(places.slice(i, i + CONCURRENCY));

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const results = await Promise.all(batch.map(p => verifyWithWebSearch(p)));

    for (let i = 0; i < batch.length; i++) {
      const place = batch[i];
      const result = results[i];

      const esc = (s: string) => s.replace(/"/g, '""').slice(0, 200);
      appendFileSync(CSV_PATH,
        `${place.id},"${esc(place.name)}","${place.city||''}","${place.country||''}",` +
        `${result.verdict},"${esc(result.evidence)}","${esc(result.reasoning)}"\n`
      );

      if (result.verdict !== 'uncertain') {
        const icon = result.verdict === 'fully_vegan' ? '✓' : result.verdict === 'closed' ? '✗' : '⚠';
        console.log(`  [${icon}] ${place.name} (${place.city}) → ${result.verdict}`);
        if (result.evidence) console.log(`      ${result.evidence.slice(0, 100)}`);
      }

      if (!DRY_RUN) {
        const tags: string[] = [...(place.tags || [])];
        const updates: Record<string, any> = {};

        if (result.verdict === 'fully_vegan') {
          confirmed++;
          if (!tags.includes('websearch_confirmed_vegan')) tags.push('websearch_confirmed_vegan');
          tags.splice(tags.indexOf('websearch_review_flag'), 1); // clear any prior flag
          updates.verification_status = 'scraping_verified';
          updates.tags = tags.filter(t => t !== 'websearch_review_flag');
        } else if (result.verdict === 'not_fully_vegan') {
          flagged++;
          if (!tags.includes('websearch_review_flag')) tags.push('websearch_review_flag');
          updates.tags = tags;
        } else if (result.verdict === 'closed') {
          closedCount++;
          if (!tags.includes('websearch_confirmed_closed')) tags.push('websearch_confirmed_closed');
          updates.tags = tags;
        } else {
          uncertain++;
        }

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          const { error } = await sb.from('places').update(updates).eq('id', place.id);
          if (error) console.error(`  DB error: ${error.message}`);
        }
      } else {
        if (result.verdict === 'fully_vegan') confirmed++;
        else if (result.verdict === 'not_fully_vegan') flagged++;
        else if (result.verdict === 'closed') closedCount++;
        else uncertain++;
      }
    }

    const done = Math.min((b + 1) * CONCURRENCY, places.length);
    process.stdout.write(`\r${done}/${places.length} (${Math.round(done/places.length*100)}%) — ✓ ${confirmed} confirmed, ⚠ ${flagged} flagged, ✗ ${closedCount} closed, ? ${uncertain} uncertain`);
    if (b < batches.length - 1) await sleep(500);
  }

  console.log(`\n\n═══ DONE ═══`);
  console.log(`Confirmed 100% vegan (websearch_confirmed_vegan): ${confirmed}`);
  console.log(`Review flagged    (websearch_review_flag):        ${flagged}`);
  console.log(`Confirmed closed  (websearch_confirmed_closed):   ${closedCount}`);
  console.log(`Uncertain (no change):                            ${uncertain}`);
  console.log(`Results CSV: ${CSV_PATH}`);
  if (DRY_RUN) console.log('\nDry-run — no DB writes.');
}

main().catch(console.error);
