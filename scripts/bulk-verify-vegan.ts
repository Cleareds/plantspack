/**
 * Bulk verifies unverified fully_vegan places using OpenAI gpt-4o-mini-search-preview.
 * Checkpoints to /tmp/vegan-verify-checkpoint.json so it can be resumed.
 *
 * Usage:
 *   npx tsx scripts/bulk-verify-vegan.ts            # run live
 *   npx tsx scripts/bulk-verify-vegan.ts --dry-run  # preview only, no DB writes
 *   npx tsx scripts/bulk-verify-vegan.ts --limit 50 # process first N places
 */

import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CHECKPOINT_FILE = '/tmp/vegan-verify-checkpoint.json';
const CONCURRENCY = 8;
const BATCH_SLEEP_MS = 500;
const MAX_RETRIES = 3;

const isDryRun = process.argv.includes('--dry-run');
const limitIdx = process.argv.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1]) : undefined;

type Verdict = 'fully_vegan' | 'not_fully_vegan' | 'closed' | 'uncertain';

interface CheckpointEntry {
  id: string;
  name: string;
  verdict: Verdict;
  evidence: string;
  processed_at: string;
}

function loadCheckpoint(): Map<string, CheckpointEntry> {
  if (!existsSync(CHECKPOINT_FILE)) return new Map();
  const data = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf-8')) as CheckpointEntry[];
  return new Map(data.map(e => [e.id, e]));
}

function saveCheckpoint(entries: Map<string, CheckpointEntry>) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify([...entries.values()], null, 2));
}

async function classify(place: { id: string; name: string; city: string | null; country: string | null; description: string | null }): Promise<CheckpointEntry> {
  const location = [place.city, place.country].filter(Boolean).join(', ');
  const prompt = `Is "${place.name}"${location ? ` in ${location}` : ''} a 100% fully vegan establishment (no animal products of any kind on the menu)?

Search for this specific place and check:
1. Is it confirmed 100% vegan (no meat, dairy, eggs, honey)?
2. Is it still open, or permanently closed?

Reply with exactly one of these verdicts on the first line, then a one-sentence reason:
FULLY_VEGAN - confirmed 100% vegan, currently open
NOT_FULLY_VEGAN - serves or sells animal products (even dairy/eggs)
CLOSED - permanently closed
UNCERTAIN - cannot find reliable information

${place.description ? `Context: ${place.description.slice(0, 200)}` : ''}`;

  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini-search-preview',
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.choices[0]?.message?.content?.trim() ?? '';
      const firstLine = text.split('\n')[0].toUpperCase();
      const evidence = text.split('\n').slice(1).join(' ').trim() || text.slice(0, 300);
      let verdict: Verdict = 'uncertain';
      if (firstLine.includes('FULLY_VEGAN') && !firstLine.includes('NOT')) verdict = 'fully_vegan';
      else if (firstLine.includes('NOT_FULLY_VEGAN')) verdict = 'not_fully_vegan';
      else if (firstLine.includes('CLOSED')) verdict = 'closed';
      return { id: place.id, name: place.name, verdict, evidence, processed_at: new Date().toISOString() };
    } catch (e: any) {
      lastError = e;
      const isRateLimit = e.status === 429 || e.status === 503;
      if (isRateLimit && attempt < MAX_RETRIES - 1) {
        const wait = (attempt + 1) * 10000; // 10s, 20s
        await new Promise(r => setTimeout(r, wait));
      } else if (!isRateLimit) {
        break;
      }
    }
  }
  throw lastError;
}

async function applyVerdict(entry: CheckpointEntry) {
  const { data: place } = await sb.from('places').select('id, name, tags').eq('id', entry.id).single();
  if (!place) { console.log(`  Not found: ${entry.id}`); return; }

  const tags: string[] = [...(place.tags || [])];
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (entry.verdict === 'fully_vegan') {
    if (!tags.includes('websearch_confirmed_vegan')) tags.push('websearch_confirmed_vegan');
    updates.tags = tags;
    updates.verification_status = 'scraping_verified';
  } else if (entry.verdict === 'not_fully_vegan') {
    if (!tags.includes('websearch_review_flag')) tags.push('websearch_review_flag');
    updates.tags = tags;
  } else if (entry.verdict === 'closed') {
    if (!tags.includes('websearch_confirmed_closed')) tags.push('websearch_confirmed_closed');
    updates.tags = tags;
  } else {
    return; // uncertain - skip
  }

  const { error } = await sb.from('places').update(updates).eq('id', entry.id);
  if (error) console.error(`  DB error ${place.name}: ${error.message}`);
}

async function processBatch(batch: any[], checkpoint: Map<string, CheckpointEntry>, stats: { confirmed: number; flagged: number; closed: number; uncertain: number; errors: number }) {
  const results = await Promise.allSettled(batch.map(place => classify(place)));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const place = batch[i];

    if (result.status === 'rejected') {
      console.error(`\n  Error classifying ${place.name}: ${result.reason}`);
      stats.errors++;
      continue;
    }

    const entry = result.value;
    checkpoint.set(entry.id, entry);

    if (!isDryRun) {
      await applyVerdict(entry);
    }

    const symbol = entry.verdict === 'fully_vegan' ? '✓' : entry.verdict === 'closed' ? '✗' : entry.verdict === 'not_fully_vegan' ? '⚠' : '?';
    process.stdout.write(symbol);

    if (entry.verdict === 'fully_vegan') stats.confirmed++;
    else if (entry.verdict === 'not_fully_vegan') stats.flagged++;
    else if (entry.verdict === 'closed') stats.closed++;
    else stats.uncertain++;
  }

  saveCheckpoint(checkpoint);
}

async function main() {
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}${limit ? ` | Limit: ${limit}` : ''}`);

  const checkpoint = loadCheckpoint();
  const alreadyDone = checkpoint.size;
  if (alreadyDone > 0) console.log(`Resuming from checkpoint: ${alreadyDone} already processed`);

  // Fetch unverified fully_vegan places (paginate to get all, not just first 1000)
  const allPlaces: any[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('places')
      .select('id, name, city, country, description')
      .eq('vegan_level', 'fully_vegan')
      .not('tags', 'cs', '{websearch_confirmed_vegan}')
      .not('tags', 'cs', '{websearch_review_flag}')
      .not('tags', 'cs', '{websearch_confirmed_closed}')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) { console.error('DB fetch error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allPlaces.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
    if (limit && allPlaces.length >= limit + alreadyDone) break;
  }
  const places = allPlaces;

  const todo = (places ?? []).filter(p => !checkpoint.has(p.id));
  const toProcess = limit ? todo.slice(0, limit) : todo;

  console.log(`Places to verify: ${toProcess.length}`);
  if (toProcess.length === 0) { console.log('Nothing to do.'); return; }

  const stats = { confirmed: 0, flagged: 0, closed: 0, uncertain: 0, errors: 0 };
  const startTime = Date.now();

  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const batch = toProcess.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(toProcess.length / CONCURRENCY);

    process.stdout.write(`\n[${batchNum}/${totalBatches}] `);
    await processBatch(batch, checkpoint, stats);

    const elapsed = (Date.now() - startTime) / 1000;
    const done = i + batch.length;
    const rate = done / elapsed;
    const remaining = toProcess.length - done;
    const eta = remaining / rate;

    process.stdout.write(
      ` (${done}/${toProcess.length} | ${Math.round(rate * 60)}/min | ETA ${Math.round(eta / 60)}min)`
    );

    if (i + CONCURRENCY < toProcess.length) {
      await new Promise(r => setTimeout(r, BATCH_SLEEP_MS));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n\nDone in ${elapsed}min`);
  console.log(`  ✓ confirmed: ${stats.confirmed}`);
  console.log(`  ⚠ flagged:   ${stats.flagged}`);
  console.log(`  ✗ closed:    ${stats.closed}`);
  console.log(`  ? uncertain: ${stats.uncertain}`);
  console.log(`  ! errors:    ${stats.errors}`);
  console.log(`\nCheckpoint saved to ${CHECKPOINT_FILE}`);
  if (isDryRun) console.log('DRY RUN: no DB changes made. Remove --dry-run to apply.');
}

main().catch(console.error);
