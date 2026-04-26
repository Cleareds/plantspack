/**
 * Verify vegan claims using Claude API with web_search tool.
 *
 * Targets places that are:
 * - fully_vegan AND (no description OR flagged by google-places-verify)
 * - OR any level with community_report:not_fully_vegan tag
 *
 * For each place, asks Claude: "Is [name] in [city] 100% vegan?"
 * Claude searches the web and returns a verdict with evidence.
 *
 * Results:
 * - Confirmed 100% vegan → set verification_status = 'scraping_verified', clear not_fully_vegan tag
 * - Not 100% vegan → keep/add community_report:not_fully_vegan tag + log evidence
 * - Closed → add google_confirmed_closed
 * - Uncertain → no change, log as uncertain
 *
 * Usage:
 *   npx tsx scripts/websearch-verify.ts --dry-run           # no DB writes
 *   npx tsx scripts/websearch-verify.ts --limit=50          # small test
 *   npx tsx scripts/websearch-verify.ts --target=flagged    # only community-reported places
 *   npx tsx scripts/websearch-verify.ts --target=no-desc    # fully_vegan with no description
 *   npx tsx scripts/websearch-verify.ts --target=all        # all fully_vegan unverified
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
const TARGET = args.find(a => a.startsWith('--target='))?.split('=')[1] ?? 'no-desc';
const CONCURRENCY = 3; // web search is IO-heavy; keep low to avoid hammering
const CSV_PATH = '/tmp/websearch-verify.csv';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

type Verdict = 'fully_vegan' | 'not_fully_vegan' | 'closed' | 'uncertain';

interface VerifyResult {
  verdict: Verdict;
  reasoning: string;
  evidence: string;
}

async function verifyWithWebSearch(place: {
  name: string; city: string; country: string;
  description?: string | null; vegan_level: string;
}): Promise<VerifyResult> {
  const locationStr = [place.city, place.country].filter(Boolean).join(', ');
  const descHint = place.description ? `\nKnown description: "${place.description.slice(0, 200)}"` : '';

  const prompt = `Is "${place.name}" in ${locationStr} a 100% vegan restaurant/place with absolutely no animal products on the menu?${descHint}

Search for:
1. Their current menu or website
2. Recent reviews mentioning vegan/non-vegan items
3. Whether the place is still open

After searching, respond in this exact format:
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

    // Extract text from the final message (after tool use)
    const textBlocks = response.content.filter(b => b.type === 'text');
    const text = textBlocks.map((b: any) => b.text).join('\n');

    const verdictMatch = text.match(/VERDICT:\s*(fully_vegan|not_fully_vegan|closed|uncertain)/i);
    const evidenceMatch = text.match(/EVIDENCE:\s*(.+?)(?:\n|REASONING:|$)/is);
    const reasoningMatch = text.match(/REASONING:\s*(.+?)$/is);

    const verdict = (verdictMatch?.[1]?.toLowerCase() ?? 'uncertain') as Verdict;
    const evidence = evidenceMatch?.[1]?.trim() ?? '';
    const reasoning = reasoningMatch?.[1]?.trim() ?? '';

    return { verdict, evidence, reasoning };
  } catch (e: any) {
    if (e?.status === 429) { await sleep(10000); return verifyWithWebSearch(place); }
    return { verdict: 'uncertain', evidence: 'API error', reasoning: String(e?.message ?? e) };
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Target: ${TARGET}`);

  // Build query based on target
  const PAGE = 1000;
  const places: any[] = [];
  let offset = 0;
  while (true) {
    let q = sb.from('places')
      .select('id, name, city, country, description, vegan_level, tags, verification_status')
      .is('archived_at', null)
      .order('id')
      .range(offset, offset + PAGE - 1);

    if (TARGET === 'flagged') {
      // Places with community_report:not_fully_vegan
      q = q.contains('tags', ['community_report:not_fully_vegan']);
    } else if (TARGET === 'no-desc') {
      // fully_vegan with no description (highest uncertainty)
      q = q.eq('vegan_level', 'fully_vegan').is('description', null);
    } else if (TARGET === 'all') {
      // All fully_vegan that aren't admin/community verified
      q = q.eq('vegan_level', 'fully_vegan').eq('verification_status', 'unverified');
    } else {
      console.error('Unknown target. Use: flagged | no-desc | all');
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

  // Estimate cost
  const estCostPerPlace = 0.006; // $0.006 avg (haiku + web search tokens)
  console.log(`Estimated cost: $${(places.length * estCostPerPlace).toFixed(2)}`);
  if (!DRY_RUN && places.length > 100) {
    console.log('Starting in 5 seconds... Ctrl+C to abort.');
    await sleep(5000);
  }

  writeFileSync(CSV_PATH, 'id,name,city,country,current_level,verdict,evidence,reasoning\n');

  let confirmed = 0, notVegan = 0, closedCount = 0, uncertain = 0;
  const batches: any[][] = [];
  for (let i = 0; i < places.length; i += CONCURRENCY) batches.push(places.slice(i, i + CONCURRENCY));

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const results = await Promise.all(batch.map(p => verifyWithWebSearch(p)));

    for (let i = 0; i < batch.length; i++) {
      const place = batch[i];
      const result = results[i];

      // Log to CSV
      const evidence = result.evidence.replace(/"/g, '""');
      const reasoning = result.reasoning.replace(/"/g, '""').slice(0, 200);
      appendFileSync(CSV_PATH, `${place.id},"${place.name.replace(/"/g, '""')}","${place.city || ''}","${place.country || ''}",${place.vegan_level},${result.verdict},"${evidence}","${reasoning}"\n`);

      // Console log changes
      if (result.verdict !== 'uncertain') {
        const emoji = result.verdict === 'fully_vegan' ? '✓' : result.verdict === 'closed' ? '✗' : '⚠';
        console.log(`  [${emoji}] ${place.name} (${place.city}) → ${result.verdict}`);
        if (result.evidence) console.log(`      ${result.evidence.slice(0, 100)}`);
      }

      if (!DRY_RUN) {
        const currentTags: string[] = place.tags || [];
        let newTags = [...currentTags];
        const updates: Record<string, any> = {};

        if (result.verdict === 'fully_vegan') {
          confirmed++;
          // Remove any not_fully_vegan flags, mark as community_verified
          newTags = newTags.filter(t => t !== 'community_report:not_fully_vegan');
          updates.verification_status = 'scraping_verified';
          updates.tags = newTags;
        } else if (result.verdict === 'not_fully_vegan') {
          notVegan++;
          if (!newTags.includes('community_report:not_fully_vegan')) {
            newTags.push('community_report:not_fully_vegan');
          }
          updates.tags = newTags;
        } else if (result.verdict === 'closed') {
          closedCount++;
          if (!newTags.includes('google_confirmed_closed')) {
            newTags.push('google_confirmed_closed');
          }
          updates.tags = newTags;
        } else {
          uncertain++;
        }

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          const { error } = await sb.from('places').update(updates).eq('id', place.id);
          if (error) console.error(`  DB error: ${error.message}`);
        }
      } else {
        // Dry-run counting
        if (result.verdict === 'fully_vegan') confirmed++;
        else if (result.verdict === 'not_fully_vegan') notVegan++;
        else if (result.verdict === 'closed') closedCount++;
        else uncertain++;
      }
    }

    const done = Math.min((b + 1) * CONCURRENCY, places.length);
    const pct = Math.round((done / places.length) * 100);
    process.stdout.write(`\r${done}/${places.length} (${pct}%) — confirmed: ${confirmed}, not_vegan: ${notVegan}, closed: ${closedCount}, uncertain: ${uncertain}`);
    if (b < batches.length - 1) await sleep(500);
  }

  console.log(`\n\n═══ DONE ═══`);
  console.log(`Confirmed fully vegan:   ${confirmed}`);
  console.log(`Not fully vegan:         ${notVegan}`);
  console.log(`Closed:                  ${closedCount}`);
  console.log(`Uncertain (no change):   ${uncertain}`);
  console.log(`Results CSV: ${CSV_PATH}`);
  if (DRY_RUN) console.log('\nDry-run — no DB writes.');
}

main().catch(console.error);
