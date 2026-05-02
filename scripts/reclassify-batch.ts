/**
 * ⚠ DEPRECATED — DO NOT RUN WITHOUT EXPLICIT USER AUTHORIZATION.
 *
 * This script was the source of the May 2026 Belgium fully_vegan
 * misclassification incident. The OpenAI Batch API decided that ~95
 * vegan-options places (with OSM tag diet:vegan=yes that the importer
 * had already mistranslated as vegan_friendly) were actually fully
 * vegan, based on AI-generated descriptions.
 *
 * Two guards now exist that prevent this script from causing damage
 * even if executed:
 *  1. DB trigger places_fully_vegan_human_only blocks any INSERT/UPDATE
 *     that sets vegan_level='fully_vegan' with verification_method=
 *     'ai_verified'. The script will fail mid-run.
 *  2. Project rule against paid tools — OpenAI is paid; never re-run
 *     without explicit per-run user confirmation and a cost cap.
 *
 * If you absolutely need to reclassify with AI in the future:
 *  - Use only DOWNGRADE direction (high → low). The trigger blocks
 *    upgrades, so AI cannot accidentally promote.
 *  - Provide rigorous prompts grounded in real menu data (not in the
 *    place's own description, which is itself often AI-generated).
 *  - Have a human review every fully_vegan output before applying.
 *
 * Bulk reclassification of all places into the 4-tier vegan level system.
 * Uses OpenAI Batch API (50% cheaper, async, no rate-limit pressure).
 *
 * Covers ALL places — those with descriptions get full context;
 * no-description places get a conservative name/category/city prompt.
 *
 * Features:
 *  - Resume-safe: per-chunk state persisted; completed chunks are never re-submitted
 *  - No N+1: in-memory place map, no per-place DB round-trips during apply
 *  - Dry-run: writes CSV preview, no DB writes
 *  - Strict fully_vegan prompt: requires strong positive evidence to keep the label
 *
 * Usage:
 *   npx tsx scripts/reclassify-batch.ts run            # full run, auto-resumes
 *   npx tsx scripts/reclassify-batch.ts run --dry-run  # preview CSV only
 *   npx tsx scripts/reclassify-batch.ts status         # check in-flight batches
 *   npx tsx scripts/reclassify-batch.ts apply          # apply results from last submitted batch
 *   npx tsx scripts/reclassify-batch.ts reset          # wipe state and start fresh
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_LEVELS = ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options'] as const;
type VeganLevel = typeof VALID_LEVELS[number];

const CHUNK_SIZE = 5000;
const STATE_FILE = '/tmp/reclassify-state.json';
const CHANGES_LOG = '/tmp/reclassify-changes.csv';
const DRY_RUN = process.argv.includes('--dry-run');

interface ChunkRecord {
  batchId: string;
  status: 'submitted' | 'completed' | 'failed';
  changed: number;
  unchanged: number;
  failed: number;
}
type RunState = Record<string, ChunkRecord>;  // key = chunk index as string

function loadState(): RunState {
  if (!existsSync(STATE_FILE)) return {};
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function saveState(state: RunState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Prompts ───────────────────────────────────────────────────────────────────

/** For places WITH a description — full context, 4-tier classification. */
function promptWithDesc(p: { name: string; category: string; description: string; tags: string[]; vegan_level: string }): string {
  const tags = p.tags.filter(t =>
    !t.startsWith('staging-') && !t.startsWith('admin-') &&
    !t.startsWith('batch-') && !t.startsWith('google_') &&
    !t.startsWith('website_') && !t.startsWith('community_report:')
  ).join(', ') || 'none';

  const fullyVeganExtra = p.vegan_level === 'fully_vegan'
    ? `\nWARNING: This place is currently labelled fully_vegan (100% vegan, zero animal products). Only keep that label if the description CLEARLY confirms a 100% vegan menu with no animal products. If there is any doubt or the description mentions non-vegan items, downgrade it.`
    : '';

  return `Classify this place into exactly one vegan level.

Name: ${p.name}
Category: ${p.category}
Current level: ${p.vegan_level}
Description: ${p.description.slice(0, 400)}
Tags: ${tags}

Levels:
- fully_vegan: 100% vegan menu, ZERO animal products, the place's entire identity is vegan. Strict.
- mostly_vegan: 85%+ vegan, but a small number of non-vegan items exist (exceptions, not sections)
- vegan_friendly: non-vegan place with genuine vegan section or 3+ dedicated vegan dishes
- vegan_options: mainstream non-vegan venue with only 1-3 token vegan items
${fullyVeganExtra}

If unsure, keep current level (${p.vegan_level}).
Reply with ONLY one of: fully_vegan, mostly_vegan, vegan_friendly, vegan_options`.trim();
}

/** For places WITHOUT a description — conservative, name/location/category only. */
function promptNoDesc(p: { name: string; category: string; city: string; country: string; vegan_level: string }): string {
  return `Classify this place based only on its name and category. No description is available.

Name: ${p.name}
Category: ${p.category}
City: ${p.city}, ${p.country}
Current level: ${p.vegan_level}

Levels:
- fully_vegan: 100% vegan (e.g. name contains "vegan", "plant-based", known 100% vegan brand)
- mostly_vegan: mostly vegan with a few exceptions
- vegan_friendly: non-vegan place with genuine vegan options
- vegan_options: mainstream place, few token vegan items

IMPORTANT: If you are not confident based on the name/category alone, reply with the current level (${p.vegan_level}).
Only change if the name is an obvious signal (e.g. "KFC" → vegan_options, "The Vegan Kitchen" → fully_vegan).

Reply with ONLY one of: fully_vegan, mostly_vegan, vegan_friendly, vegan_options`.trim();
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchAllPlaces(): Promise<Map<string, any>> {
  const PAGE = 1000;
  const places: any[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from('places')
      .select('id, name, category, description, vegan_level, tags, city, country')
      .is('archived_at', null)
      .not('vegan_level', 'is', null)
      .order('vegan_level', { ascending: true })  // fully_vegan first
      .order('id')
      .range(offset, offset + PAGE - 1);
    if (error) { console.error('Fetch failed:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    places.push(...data);
    process.stdout.write(`\rFetched ${places.length} places...`);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`\rFetched ${places.length} places total.`);
  return new Map(places.map(p => [p.id, p]));
}

// ── Batch submit ──────────────────────────────────────────────────────────────

async function submitChunk(places: any[], chunkIndex: number): Promise<string> {
  const lines = places.map(p => {
    const hasDesc = p.description && p.description.length > 20;
    const content = hasDesc
      ? promptWithDesc({ ...p, description: p.description })
      : promptNoDesc({ ...p, city: p.city || '', country: p.country || '' });
    return JSON.stringify({
      custom_id: p.id,
      method: 'POST',
      url: '/v1/chat/completions',
      body: { model: 'gpt-4o-mini', max_tokens: 20, temperature: 0, messages: [{ role: 'user', content }] },
    });
  });

  const content = lines.join('\n');
  const file = await ai.files.create({
    file: new File([content], `reclassify-chunk-${chunkIndex}.jsonl`, { type: 'application/jsonl' }),
    purpose: 'batch',
  });
  const batch = await ai.batches.create({
    input_file_id: file.id,
    endpoint: '/v1/chat/completions',
    completion_window: '24h',
    metadata: { description: `plantspack reclassify chunk ${chunkIndex + 1}` },
  });
  return batch.id;
}

// ── Wait ──────────────────────────────────────────────────────────────────────

async function waitForBatch(batchId: string): Promise<void> {
  while (true) {
    await sleep(20000);
    const batch = await ai.batches.retrieve(batchId);
    const c = batch.request_counts;
    process.stdout.write(`\r  ${batch.status} — ${c?.completed ?? 0}/${c?.total ?? '?'} done, ${c?.failed ?? 0} failed`);
    if (batch.status === 'completed') { console.log(''); return; }
    if (['failed', 'expired', 'cancelled'].includes(batch.status)) {
      throw new Error(`Batch ${batchId} ended: ${batch.status}`);
    }
  }
}

// ── Apply ─────────────────────────────────────────────────────────────────────

async function applyBatch(
  batchId: string,
  placeMap: Map<string, any>
): Promise<{ changed: number; unchanged: number; failed: number }> {
  const batch = await ai.batches.retrieve(batchId);
  if (!batch.output_file_id) throw new Error(`No output file for batch ${batchId}`);

  const content = await ai.files.content(batch.output_file_id);
  const text = await content.text();
  const lines = text.trim().split('\n').filter(Boolean);

  let changed = 0, unchanged = 0, failed = 0;

  const updates: Array<{ id: string; newLevel: VeganLevel; oldLevel: string; name: string }> = [];

  for (const line of lines) {
    let result: any;
    try { result = JSON.parse(line); } catch { failed++; continue; }

    const placeId = result.custom_id;
    if (result.response?.status_code !== 200) { failed++; continue; }

    const raw = result.response.body?.choices?.[0]?.message?.content?.trim().toLowerCase() ?? '';
    let proposed: VeganLevel | null = null;
    for (const level of VALID_LEVELS) {
      if (raw.includes(level)) { proposed = level; break; }
    }
    if (!proposed) { failed++; continue; }

    const place = placeMap.get(placeId);
    if (!place) { failed++; continue; }

    if (proposed === place.vegan_level) { unchanged++; continue; }

    changed++;
    updates.push({ id: placeId, newLevel: proposed, oldLevel: place.vegan_level, name: place.name });
  }

  // Log all changes
  for (const u of updates) {
    console.log(`  [${u.oldLevel} → ${u.newLevel}] ${u.name}`);
    if (existsSync(CHANGES_LOG)) {
      appendFileSync(CHANGES_LOG, `${u.id},"${u.name.replace(/"/g, '""')}",${u.oldLevel},${u.newLevel}\n`);
    }
  }

  if (!DRY_RUN && updates.length > 0) {
    // Batch DB updates in groups of 100 to avoid per-row round-trips
    for (let i = 0; i < updates.length; i += 100) {
      const slice = updates.slice(i, i + 100);
      await Promise.all(slice.map(u =>
        sb.from('places').update({ vegan_level: u.newLevel, updated_at: new Date().toISOString() }).eq('id', u.id)
          .then(({ error }) => { if (error) console.error(`  DB error for ${u.id}: ${error.message}`); })
      ));
    }
  }

  return { changed, unchanged, failed };
}

// ── Commands ──────────────────────────────────────────────────────────────────

async function run() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE'}`);

  const state = loadState();

  console.log('Fetching all places...');
  const placeMap = await fetchAllPlaces();
  const places = [...placeMap.values()];
  console.log(`${places.length} places to classify.`);

  const chunks: any[][] = [];
  for (let i = 0; i < places.length; i += CHUNK_SIZE) {
    chunks.push(places.slice(i, i + CHUNK_SIZE));
  }
  console.log(`Split into ${chunks.length} chunks of ~${CHUNK_SIZE}`);

  // Init changes log (only if fresh run — don't wipe on resume)
  const completedCount = Object.values(state).filter(c => c.status === 'completed').length;
  if (completedCount === 0 && !DRY_RUN) {
    writeFileSync(CHANGES_LOG, 'id,name,old_level,new_level\n');
  }

  if (DRY_RUN) {
    writeFileSync(CHANGES_LOG, 'id,name,old_level,new_level\n');
    console.log(`Dry-run changes will be written to ${CHANGES_LOG}`);
  }

  let totalChanged = 0, totalUnchanged = 0, totalFailed = 0;

  // Accumulate existing totals from already-completed chunks
  for (const record of Object.values(state)) {
    if (record.status === 'completed') {
      totalChanged += record.changed;
      totalUnchanged += record.unchanged;
      totalFailed += record.failed;
    }
  }

  for (let i = 0; i < chunks.length; i++) {
    const key = String(i);
    const existing = state[key];

    if (existing?.status === 'completed') {
      console.log(`Chunk ${i + 1}/${chunks.length} — already completed (${existing.changed} changes), skipping.`);
      continue;
    }

    const chunk = chunks[i];
    const withDesc = chunk.filter(p => p.description && p.description.length > 20).length;
    const noDesc = chunk.length - withDesc;
    console.log(`\nChunk ${i + 1}/${chunks.length} (${chunk.length} places, ${withDesc} with desc, ${noDesc} no desc)`);

    let batchId: string;
    if (existing?.status === 'submitted' && existing.batchId) {
      console.log(`  Resuming in-flight batch: ${existing.batchId}`);
      batchId = existing.batchId;
    } else {
      console.log(`  Submitting...`);
      batchId = await submitChunk(chunk, i);
      state[key] = { batchId, status: 'submitted', changed: 0, unchanged: 0, failed: 0 };
      saveState(state);
      console.log(`  Batch ID: ${batchId}`);
    }

    console.log(`  Waiting for completion...`);
    await waitForBatch(batchId);

    console.log(`  Applying changes...`);
    const stats = await applyBatch(batchId, placeMap);
    state[key] = { batchId, status: 'completed', ...stats };
    saveState(state);

    totalChanged += stats.changed;
    totalUnchanged += stats.unchanged;
    totalFailed += stats.failed;

    console.log(`  Chunk ${i + 1} done — changed: ${stats.changed}, unchanged: ${stats.unchanged}, failed: ${stats.failed}`);
    console.log(`  Running totals — changed: ${totalChanged}, unchanged: ${totalUnchanged}, failed: ${totalFailed}`);
  }

  console.log('\n═══ ALL DONE ═══');
  console.log(`Total changed:   ${totalChanged}`);
  console.log(`Total unchanged: ${totalUnchanged}`);
  console.log(`Total failed:    ${totalFailed}`);
  console.log(`Changes log: ${CHANGES_LOG}`);
  if (DRY_RUN) console.log('\nDry-run — no DB writes. Review CSV then run without --dry-run to apply.');
}

async function status() {
  const state = loadState();
  if (Object.keys(state).length === 0) { console.log('No run state found — not started yet.'); return; }

  const completed = Object.entries(state).filter(([, r]) => r.status === 'completed');
  const submitted = Object.entries(state).filter(([, r]) => r.status === 'submitted');
  const failed = Object.entries(state).filter(([, r]) => r.status === 'failed');

  console.log(`Completed chunks: ${completed.length}`);
  console.log(`In-flight chunks: ${submitted.length}`);
  console.log(`Failed chunks:    ${failed.length}`);

  for (const [idx, record] of submitted) {
    const batch = await ai.batches.retrieve(record.batchId);
    const c = batch.request_counts;
    console.log(`  Chunk ${Number(idx) + 1}: ${batch.status} — ${c?.completed ?? 0}/${c?.total ?? '?'} completed, ${c?.failed ?? 0} failed`);
  }

  const totalChanged = Object.values(state).reduce((s, r) => s + r.changed, 0);
  if (totalChanged > 0) console.log(`\nChanges applied so far: ${totalChanged}`);
}

async function apply() {
  const state = loadState();
  const submitted = Object.entries(state).filter(([, r]) => r.status === 'submitted');
  if (submitted.length === 0) { console.log('No in-flight batches to apply.'); return; }

  console.log('Fetching places...');
  const placeMap = await fetchAllPlaces();

  for (const [idx, record] of submitted) {
    console.log(`Applying chunk ${Number(idx) + 1} (batch ${record.batchId})...`);
    const stats = await applyBatch(record.batchId, placeMap);
    state[idx] = { ...record, status: 'completed', ...stats };
    saveState(state);
    console.log(`  Done — changed: ${stats.changed}, unchanged: ${stats.unchanged}, failed: ${stats.failed}`);
  }
}

async function reset() {
  if (existsSync(STATE_FILE)) {
    writeFileSync(STATE_FILE, '{}');
    console.log('State file reset. Run `run` to start fresh.');
  } else {
    console.log('No state file exists.');
  }
}

const cmd = process.argv[2];
if (cmd === 'run') run().catch(console.error);
else if (cmd === 'status') status().catch(console.error);
else if (cmd === 'apply') apply().catch(console.error);
else if (cmd === 'reset') reset().catch(console.error);
else {
  console.log('Usage: npx tsx scripts/reclassify-batch.ts [run|status|apply|reset] [--dry-run]');
  process.exit(1);
}
