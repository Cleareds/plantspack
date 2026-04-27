/**
 * Fast bulk verifier: two-tier approach.
 *
 * Tier 1 — gpt-4o-mini (no web search, 500 RPM):
 *   Places WITH a description. Classifies from name + description alone.
 *   Handles ~8 400 places in ~30 min.
 *
 * Tier 2 — gpt-4o-mini-search-preview (web search, ~5 RPM):
 *   Places WITHOUT a description. Falls back to live web search.
 *   Handles ~95 places slowly in background.
 *
 * Shares the same checkpoint file as bulk-verify-vegan.ts so runs are additive.
 *
 * Usage:
 *   npx tsx scripts/bulk-verify-vegan-fast.ts            # run live
 *   npx tsx scripts/bulk-verify-vegan-fast.ts --dry-run  # no DB writes
 *   npx tsx scripts/bulk-verify-vegan-fast.ts --limit 200
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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 20000, maxRetries: 0 });

const CHECKPOINT_FILE = '/tmp/vegan-verify-checkpoint.json';

// Tier 1: description-based, high concurrency
const FAST_CONCURRENCY = 15;
const FAST_BATCH_SLEEP_MS = 500;

// Tier 2: web-search, low concurrency
const SLOW_CONCURRENCY = 3;
const SLOW_BATCH_SLEEP_MS = 5000;

const MAX_RETRIES = 3;

const isDryRun = process.argv.includes('--dry-run');
const limitIdx = process.argv.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1]) : undefined;

type Verdict = 'fully_vegan' | 'not_fully_vegan' | 'closed' | 'uncertain';
interface CheckpointEntry {
  id: string; name: string; verdict: Verdict; evidence: string; processed_at: string;
}

function loadCheckpoint(): Map<string, CheckpointEntry> {
  if (!existsSync(CHECKPOINT_FILE)) return new Map();
  const data = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf-8')) as CheckpointEntry[];
  return new Map(data.map(e => [e.id, e]));
}
function saveCheckpoint(entries: Map<string, CheckpointEntry>) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify([...entries.values()], null, 2));
}

function parseVerdict(text: string): Verdict {
  const first = text.split('\n')[0].toUpperCase();
  if (first.includes('FULLY_VEGAN') && !first.includes('NOT')) return 'fully_vegan';
  if (first.includes('NOT_FULLY_VEGAN')) return 'not_fully_vegan';
  if (first.includes('CLOSED')) return 'closed';
  return 'uncertain';
}

async function classifyFast(place: { id: string; name: string; city: string | null; country: string | null; description: string }): Promise<CheckpointEntry> {
  const location = [place.city, place.country].filter(Boolean).join(', ');
  const prompt = `Classify this place into one vegan category based only on the information provided.

Name: ${place.name}${location ? ` (${location})` : ''}
Description: ${place.description.slice(0, 500)}

Rules:
- FULLY_VEGAN: description clearly states 100% vegan / plant-based only / no animal products
- NOT_FULLY_VEGAN: description mentions dairy, eggs, honey, meat, fish, or "vegetarian" options alongside vegan
- CLOSED: description or name indicates permanently closed
- UNCERTAIN: not enough information to decide confidently

Reply with exactly one of: FULLY_VEGAN / NOT_FULLY_VEGAN / CLOSED / UNCERTAIN
Then a one-sentence reason on the next line.`;

  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0,
      });
      const text = response.choices[0]?.message?.content?.trim() ?? '';
      const evidence = text.split('\n').slice(1).join(' ').trim() || text.slice(0, 200);
      return { id: place.id, name: place.name, verdict: parseVerdict(text), evidence, processed_at: new Date().toISOString() };
    } catch (e: any) {
      lastError = e;
      if ((e.status === 429 || e.status === 503) && attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 3000));
      } else if (![429, 503].includes(e.status)) break;
    }
  }
  throw lastError;
}

async function classifySlow(place: { id: string; name: string; city: string | null; country: string | null; description: string | null }): Promise<CheckpointEntry> {
  const location = [place.city, place.country].filter(Boolean).join(', ');
  const prompt = `Is "${place.name}"${location ? ` in ${location}` : ''} a 100% fully vegan establishment (no animal products of any kind on the menu)?

Search for this specific place and check:
1. Is it confirmed 100% vegan (no meat, dairy, eggs, honey)?
2. Is it still open, or permanently closed?

Reply with exactly one of these verdicts on the first line, then a one-sentence reason:
FULLY_VEGAN - confirmed 100% vegan, currently open
NOT_FULLY_VEGAN - serves or sells animal products (even dairy/eggs)
CLOSED - permanently closed
UNCERTAIN - cannot find reliable information`;

  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini-search-preview',
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.choices[0]?.message?.content?.trim() ?? '';
      const evidence = text.split('\n').slice(1).join(' ').trim() || text.slice(0, 300);
      return { id: place.id, name: place.name, verdict: parseVerdict(text), evidence, processed_at: new Date().toISOString() };
    } catch (e: any) {
      lastError = e;
      if ((e.status === 429 || e.status === 503) && attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 15000));
      } else if (![429, 503].includes(e.status)) break;
    }
  }
  throw lastError;
}

async function applyVerdict(entry: CheckpointEntry) {
  const { data: place } = await sb.from('places').select('id, tags').eq('id', entry.id).single();
  if (!place) return;
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
  } else return;
  const { error } = await sb.from('places').update(updates).eq('id', entry.id);
  if (error) console.error(`  DB error ${entry.name}: ${error.message}`);
}

async function processBatch(
  batch: any[],
  classifier: (p: any) => Promise<CheckpointEntry>,
  checkpoint: Map<string, CheckpointEntry>,
  stats: { confirmed: number; flagged: number; closed: number; uncertain: number; errors: number }
) {
  const results = await Promise.allSettled(batch.map(p => classifier(p)));
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const place = batch[i];
    if (result.status === 'rejected') {
      process.stdout.write('!');
      console.error(`\n  ERR ${place.name}: ${result.reason?.message || result.reason}`);
      stats.errors++;
      continue;
    }
    const entry = result.value;
    checkpoint.set(entry.id, entry);
    if (!isDryRun) await applyVerdict(entry);
    process.stdout.write(entry.verdict === 'fully_vegan' ? '✓' : entry.verdict === 'closed' ? '✗' : entry.verdict === 'not_fully_vegan' ? '⚠' : '?');
    if (entry.verdict === 'fully_vegan') stats.confirmed++;
    else if (entry.verdict === 'not_fully_vegan') stats.flagged++;
    else if (entry.verdict === 'closed') stats.closed++;
    else stats.uncertain++;
  }
  saveCheckpoint(checkpoint);
}

async function fetchUnverified() {
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
    if (error) { console.error('DB error:', error.message); process.exit(1); }
    if (!data?.length) break;
    allPlaces.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return allPlaces;
}

async function runTier(
  label: string,
  todo: any[],
  classifier: (p: any) => Promise<CheckpointEntry>,
  checkpoint: Map<string, CheckpointEntry>,
  stats: { confirmed: number; flagged: number; closed: number; uncertain: number; errors: number },
  concurrency: number,
  sleepMs: number
) {
  if (todo.length === 0) { console.log(`\n${label}: nothing to do.`); return; }
  console.log(`\n${label}: ${todo.length} places (concurrency=${concurrency})`);
  const startTime = Date.now();

  for (let i = 0; i < todo.length; i += concurrency) {
    const batch = todo.slice(i, i + concurrency);
    const batchNum = Math.floor(i / concurrency) + 1;
    const totalBatches = Math.ceil(todo.length / concurrency);
    process.stdout.write(`\n[${batchNum}/${totalBatches}] `);
    await processBatch(batch, classifier, checkpoint, stats);

    const elapsed = (Date.now() - startTime) / 1000;
    const done = i + batch.length;
    const rate = done / elapsed;
    const eta = (todo.length - done) / rate;
    process.stdout.write(` (${done}/${todo.length} | ${Math.round(rate * 60)}/min | ETA ${Math.round(eta / 60)}min)`);

    if (i + concurrency < todo.length) await new Promise(r => setTimeout(r, sleepMs));
  }
}

async function main() {
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}${limit ? ` | Limit: ${limit}` : ''}`);

  const checkpoint = loadCheckpoint();
  console.log(`Checkpoint: ${checkpoint.size} already processed`);

  const places = await fetchUnverified();
  const todo = places.filter(p => !checkpoint.has(p.id));
  const toProcess = limit ? todo.slice(0, limit) : todo;

  console.log(`Places to verify: ${toProcess.length}`);
  if (toProcess.length === 0) { console.log('Nothing to do.'); return; }

  // Split into tiers
  const withDesc = toProcess.filter(p => p.description && p.description.trim().length >= 30);
  const noDesc = toProcess.filter(p => !p.description || p.description.trim().length < 30);

  console.log(`  Tier 1 (description-based, fast): ${withDesc.length}`);
  console.log(`  Tier 2 (web search, slow): ${noDesc.length}`);

  const stats = { confirmed: 0, flagged: 0, closed: 0, uncertain: 0, errors: 0 };

  await runTier('TIER 1 — gpt-4o-mini (desc)', withDesc, classifyFast, checkpoint, stats, FAST_CONCURRENCY, FAST_BATCH_SLEEP_MS);
  await runTier('TIER 2 — gpt-4o-mini-search (web)', noDesc, classifySlow, checkpoint, stats, SLOW_CONCURRENCY, SLOW_BATCH_SLEEP_MS);

  console.log(`\n\nDone`);
  console.log(`  ✓ confirmed: ${stats.confirmed}`);
  console.log(`  ⚠ flagged:   ${stats.flagged}`);
  console.log(`  ✗ closed:    ${stats.closed}`);
  console.log(`  ? uncertain: ${stats.uncertain}`);
  console.log(`  ! errors:    ${stats.errors}`);
  if (isDryRun) console.log('\nDRY RUN: no DB writes. Remove --dry-run to apply.');
}

main().catch(console.error);
